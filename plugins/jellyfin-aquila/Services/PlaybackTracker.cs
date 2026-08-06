using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.Aquila.Configuration;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Aquila.Services;

/// <summary>
/// SessionManager event listener for tracking playback progress and triggering completion scrobbles at 80%.
/// </summary>
public class PlaybackTracker : IHostedService, IDisposable
{
    private readonly ISessionManager _sessionManager;
    private readonly ILibraryManager _libraryManager;
    private readonly AquilaSyncManager _syncManager;
    private readonly ILogger<PlaybackTracker> _logger;
    private readonly ConcurrentDictionary<string, bool> _trackedSessions = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="PlaybackTracker"/> class.
    /// </summary>
    public PlaybackTracker(
        ISessionManager sessionManager,
        ILibraryManager libraryManager,
        AquilaSyncManager syncManager,
        ILogger<PlaybackTracker> logger)
    {
        _sessionManager = sessionManager;
        _libraryManager = libraryManager;
        _syncManager = syncManager;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("[Aquila PlaybackTracker] Service starting... Registering PlaybackProgress & PlaybackStopped listeners.");
        _sessionManager.PlaybackProgress += OnPlaybackProgress;
        _sessionManager.PlaybackStopped += OnPlaybackStopped;
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("[Aquila PlaybackTracker] Service stopping... Unregistering listeners.");
        _sessionManager.PlaybackProgress -= OnPlaybackProgress;
        _sessionManager.PlaybackStopped -= OnPlaybackStopped;
        return Task.CompletedTask;
    }

    private async void OnPlaybackProgress(object? sender, PlaybackProgressEventArgs e)
    {
        await ProcessPlaybackAsync(e).ConfigureAwait(false);
    }

    private async void OnPlaybackStopped(object? sender, PlaybackStopEventArgs e)
    {
        await ProcessPlaybackAsync(e).ConfigureAwait(false);
    }

    private async Task ProcessPlaybackAsync(PlaybackProgressEventArgs e)
    {
        if (e.Item == null || e.Users == null || !e.Users.Any())
        {
            return;
        }

        var sessionKey = $"{e.Session.Id}_{e.Item.Id}";
        if (_trackedSessions.ContainsKey(sessionKey))
        {
            return;
        }

        if (!e.PlaybackPositionTicks.HasValue || !e.Item.RunTimeTicks.HasValue || e.Item.RunTimeTicks.Value <= 0)
        {
            return;
        }

        double percentWatched = ((double)e.PlaybackPositionTicks.Value / e.Item.RunTimeTicks.Value) * 100.0;
        var config = Plugin.Instance?.Configuration;
        if (config == null)
        {
            _logger.LogWarning("[Aquila PlaybackTracker] Plugin configuration is null");
            return;
        }

        var user = e.Users.First();
        var userId = user.Id.ToString();
        var userConfig = config.UserConfigs.FirstOrDefault(u => u.JellyfinUserId == userId);
        if (userConfig == null)
        {
            _logger.LogDebug("[Aquila PlaybackTracker] User {UserId} has no user configuration", userId);
            return;
        }

        double threshold = userConfig.CompletionThreshold > 0 ? userConfig.CompletionThreshold : 80.0;
        _logger.LogDebug("[Aquila PlaybackTracker] Item '{ItemName}' watched {PercentWatched:F2}%, threshold is {Threshold}%",
            e.Item.Name, percentWatched, threshold);

        if (percentWatched >= threshold)
        {
            _trackedSessions[sessionKey] = true;
            _logger.LogInformation("[Aquila PlaybackTracker] Threshold met for item '{ItemName}' (ID: {ItemId}, User: {UserId}). Triggering scrobble...",
                e.Item.Name, e.Item.Id, userId);
            await TriggerScrobbleAsync(e.Item, user, userConfig, config).ConfigureAwait(false);
        }
    }

    private async Task TriggerScrobbleAsync(BaseItem item, dynamic user, UserAquilaConfig userConfig, PluginConfiguration config)
    {
        try
        {
            string userId = user.Id.ToString();
            string libraryId = item.GetTopParent()?.Id.ToString() ?? string.Empty;
            var libMapping = config.LibraryMappings.FirstOrDefault(m => m.LibraryId == libraryId);
            string mediaType = libMapping?.MediaType ?? "tv";

            string targetItemId = item.Id.ToString();
            int episodeNumber = 1;
            int? totalEpisodes = null;

            if (item is Episode episode)
            {
                episodeNumber = episode.IndexNumber ?? 1;
                targetItemId = episode.SeriesId.ToString();

                var series = episode.Series;
                if (series != null)
                {
                    totalEpisodes = series.GetEpisodes(user, new MediaBrowser.Controller.Dto.DtoOptions(), false).Count();
                }
                _logger.LogInformation("[Aquila PlaybackTracker] Episode '{EpName}' Ep #{EpNum} of Series '{SeriesName}' (SeriesId: {SeriesId}, TotalEp: {TotalEp})",
                    episode.Name, episodeNumber, series?.Name, targetItemId, totalEpisodes);
            }
            else if (item is Movie)
            {
                mediaType = "movie";
                episodeNumber = 1;
                totalEpisodes = 1;
                _logger.LogInformation("[Aquila PlaybackTracker] Movie '{MovieName}' (MovieId: {MovieId})", item.Name, targetItemId);
            }

            await _syncManager.HandleScrobbleAsync(userId, targetItemId, episodeNumber, totalEpisodes, userConfig, mediaType).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Aquila PlaybackTracker] Error processing scrobble trigger for item '{ItemName}'", item.Name);
        }
    }

    /// <inheritdoc />
    public void Dispose()
    {
        _sessionManager.PlaybackProgress -= OnPlaybackProgress;
        _sessionManager.PlaybackStopped -= OnPlaybackStopped;
    }
}

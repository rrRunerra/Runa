using System;
using System.Text.Json;
using System.Threading.Tasks;
using Jellyfin.Plugin.Aquila.Api;
using Jellyfin.Plugin.Aquila.Configuration;
using Jellyfin.Plugin.Aquila.Models;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Aquila.Services;

/// <summary>
/// Scrobble decision engine enforcing duplicate watch safeguards and unscored completion logic.
/// </summary>
public class AquilaSyncManager
{
    private readonly AquilaApiClient _apiClient;
    private readonly MediaMappingStore _mappingStore;
    private readonly ILogger<AquilaSyncManager> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AquilaSyncManager"/> class.
    /// </summary>
    public AquilaSyncManager(AquilaApiClient apiClient, MediaMappingStore mappingStore, ILogger<AquilaSyncManager> logger)
    {
        _apiClient = apiClient;
        _mappingStore = mappingStore;
        _logger = logger;
    }

    /// <summary>
    /// Handles episode/movie scrobble when playback threshold (80%) is reached.
    /// </summary>
    public async Task HandleScrobbleAsync(string userId, string jellyfinItemId, int episodeNumber, int? totalEpisodes, UserAquilaConfig userConfig, string mediaType)
    {
        _logger.LogInformation("[Aquila SyncManager] Processing scrobble request: User={UserId}, ItemId={ItemId}, EpNum={EpNum}, TotalEp={TotalEp}, Type={MediaType}",
            userId, jellyfinItemId, episodeNumber, totalEpisodes, mediaType);

        if (userConfig == null || string.IsNullOrWhiteSpace(userConfig.ApiKey))
        {
            _logger.LogWarning("[Aquila SyncManager] Aborting scrobble: User {UserId} has no Aquila API key configured.", userId);
            return;
        }

        // Fetch Jellyfin Item -> Aquila Media ID mapping
        var mapping = _mappingStore.GetMapping(userId, jellyfinItemId);
        if (mapping == null)
        {
            _logger.LogWarning("[Aquila SyncManager] No media link mapping found for Jellyfin Item {ItemId} and User {UserId}. Use the Aquila in-player button to link media.", jellyfinItemId, userId);
            return;
        }

        int aquilaMediaId = mapping.AquilaMediaId;
        string effectiveMediaType = !string.IsNullOrWhiteSpace(mapping.MediaType) ? mapping.MediaType : mediaType;
        _logger.LogInformation("[Aquila SyncManager] Found mapping: Jellyfin Item {JellyfinId} -> Aquila ID {AquilaId} (MediaType: {MediaType})",
            jellyfinItemId, aquilaMediaId, effectiveMediaType);

        // Fetch current list entry details from Aquila
        var listEntryDoc = await _apiClient.GetListEntryAsync(effectiveMediaType, aquilaMediaId, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);

        int currentProgress = 0;
        string status = "WATCHING";
        double score = 0;

        if (listEntryDoc.HasValue)
        {
            var root = listEntryDoc.Value;
            if (root.TryGetProperty("progress", out var pProp) && pProp.ValueKind == JsonValueKind.Number)
            {
                currentProgress = pProp.GetInt32();
            }
            if (root.TryGetProperty("status", out var sProp) && sProp.ValueKind == JsonValueKind.String)
            {
                status = sProp.GetString() ?? "WATCHING";
            }
            if (root.TryGetProperty("score", out var scProp) && scProp.ValueKind == JsonValueKind.Number)
            {
                score = scProp.GetDouble();
            }
            _logger.LogInformation("[Aquila SyncManager] Fetched list entry: Progress={Progress}, Status={Status}, Score={Score}", currentProgress, status, score);
        }
        else
        {
            _logger.LogInformation("[Aquila SyncManager] No prior list entry exists for Aquila ID {AquilaId}. Proceeding with fresh scrobble.", aquilaMediaId);
        }

        // Rule 6: Duplicate Episode Rewatch Safeguard
        if (episodeNumber <= currentProgress && !string.Equals(status, "REWATCHING", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation("[Aquila SyncManager] SAFEGUARD TRIGGERED: Episode #{EpNum} <= current progress ({Progress}) and status is '{Status}'. Skipping duplicate progress increment.",
                episodeNumber, currentProgress, status);
            return;
        }

        bool isFinalEpisode = totalEpisodes.HasValue && totalEpisodes.Value > 0 && episodeNumber >= totalEpisodes.Value;

        // Rule 8: Unscored Completion Safeguard on final episode
        if (isFinalEpisode)
        {
            _logger.LogInformation("[Aquila SyncManager] Final episode detected ({EpNum}/{TotalEp}). Checking score status...", episodeNumber, totalEpisodes);
            if (score > 0)
            {
                var incrementDto = new AquilaIncrementDto
                {
                    MediaType = effectiveMediaType,
                    Id = aquilaMediaId,
                    Count = 1
                };
                await _apiClient.IncrementProgressAsync(incrementDto, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);

                var saveDto = new AquilaSaveEntryDto
                {
                    Status = "COMPLETED",
                    Progress = totalEpisodes.Value,
                    Score = score
                };
                SetSaveDtoMediaId(saveDto, effectiveMediaType, aquilaMediaId);
                await _apiClient.SaveListEntryAsync(effectiveMediaType, saveDto, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);
                _logger.LogInformation("[Aquila SyncManager] SUCCESS: Scrobbled final episode and set status to COMPLETED for Aquila Media ID {AquilaId} (Score: {Score})", aquilaMediaId, score);
            }
            else
            {
                var incrementDto = new AquilaIncrementDto
                {
                    MediaType = effectiveMediaType,
                    Id = aquilaMediaId,
                    Count = 1
                };
                await _apiClient.IncrementProgressAsync(incrementDto, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);

                var saveDto = new AquilaSaveEntryDto
                {
                    Status = "WATCHING",
                    Progress = totalEpisodes.Value
                };
                SetSaveDtoMediaId(saveDto, effectiveMediaType, aquilaMediaId);
                await _apiClient.SaveListEntryAsync(effectiveMediaType, saveDto, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);
                _logger.LogInformation("[Aquila SyncManager] UNSCORED SAFEGUARD: Progress updated to max ({TotalEp}), but status maintained as WATCHING for Aquila Media ID {AquilaId}. User score required to complete.", totalEpisodes, aquilaMediaId);
            }
        }
        else
        {
            var incrementDto = new AquilaIncrementDto
            {
                MediaType = effectiveMediaType,
                Id = aquilaMediaId,
                Count = 1
            };
            bool success = await _apiClient.IncrementProgressAsync(incrementDto, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);
            if (success)
            {
                _logger.LogInformation("[Aquila SyncManager] SUCCESS: Scrobbled episode #{EpNum} for Aquila Media ID {AquilaId}", episodeNumber, aquilaMediaId);
            }
            else
            {
                _logger.LogError("[Aquila SyncManager] FAILED to scrobble episode #{EpNum} for Aquila Media ID {AquilaId}", episodeNumber, aquilaMediaId);
            }
        }
    }

    private static void SetSaveDtoMediaId(AquilaSaveEntryDto dto, string mediaType, int mediaId)
    {
        switch (mediaType.ToUpperInvariant())
        {
            case "ANIME":
                dto.AnimeId = mediaId;
                break;
            case "MOVIE":
                dto.MovieId = mediaId;
                break;
            case "TV":
            default:
                dto.TvId = mediaId;
                break;
        }
    }
}

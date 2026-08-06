using System;
using System.Collections.Generic;
using System.Linq;
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
    /// Handles episode/movie scrobble when playback threshold (80%) or manual watch event is triggered.
    /// </summary>
    public async Task HandleScrobbleAsync(string userId, string jellyfinItemId, int episodeNumber, int? totalEpisodes, UserAquilaConfig userConfig, string mediaType)
    {
        await HandleScrobbleAsync(userId, new System.Collections.Generic.List<string> { jellyfinItemId }, episodeNumber, totalEpisodes, userConfig, mediaType).ConfigureAwait(false);
    }

    /// <summary>
    /// Handles episode/movie scrobble using candidate Jellyfin item IDs (SeriesId, SeasonId, EpisodeId).
    /// </summary>
    public async Task HandleScrobbleAsync(string userId, System.Collections.Generic.List<string> candidateItemIds, int episodeNumber, int? totalEpisodes, UserAquilaConfig userConfig, string mediaType)
    {
        var primaryId = candidateItemIds.FirstOrDefault() ?? "unknown";
        _logger.LogInformation("[Aquila SyncManager] Processing scrobble request: User={UserId}, PrimaryItem={ItemId}, CandidateCount={Count}, EpNum={EpNum}, TotalEp={TotalEp}, Type={MediaType}",
            userId, primaryId, candidateItemIds.Count, episodeNumber, totalEpisodes, mediaType);

        if (userConfig == null || string.IsNullOrWhiteSpace(userConfig.ApiKey))
        {
            _logger.LogWarning("[Aquila SyncManager] Aborting scrobble: User {UserId} has no Aquila API key configured.", userId);
            return;
        }

        // Fetch Jellyfin Item -> Aquila Media ID mapping using candidate IDs
        var mapping = _mappingStore.GetMappingForCandidateIds(userId, candidateItemIds);
        if (mapping == null)
        {
            _logger.LogWarning("[Aquila SyncManager] No media link mapping found for User {UserId} across candidate IDs [{CandidateIds}]. Use the Aquila in-player button to link media.",
                userId, string.Join(", ", candidateItemIds));
            return;
        }

        int aquilaMediaId = mapping.AquilaMediaId;
        string effectiveMediaType = !string.IsNullOrWhiteSpace(mapping.MediaType) ? mapping.MediaType : mediaType;
        _logger.LogInformation("[Aquila SyncManager] Found mapping: Candidate Matches -> Aquila ID {AquilaId} (MediaType: {MediaType})",
            aquilaMediaId, effectiveMediaType);

        // Fetch current list entry details from Aquila
        var listEntryDoc = await _apiClient.GetListEntryAsync(effectiveMediaType, aquilaMediaId, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);

        int currentProgress = 0;
        string status = "WATCHING";
        double score = 0;
        bool entryExists = listEntryDoc.HasValue;

        if (entryExists)
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
            _logger.LogInformation("[Aquila SyncManager] Fetched existing list entry: Progress={Progress}, Status={Status}, Score={Score}", currentProgress, status, score);
        }
        else
        {
            _logger.LogInformation("[Aquila SyncManager] No prior list entry exists for Aquila ID {AquilaId}. Will create fresh entry on list.", aquilaMediaId);
        }

        // Rule 6: Duplicate Episode Rewatch Safeguard (only applies if entry already exists)
        if (entryExists && episodeNumber <= currentProgress && !string.Equals(status, "REWATCHING", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation("[Aquila SyncManager] SAFEGUARD TRIGGERED: Episode #{EpNum} <= current progress ({Progress}) and status is '{Status}'. Skipping duplicate progress increment.",
                episodeNumber, currentProgress, status);
            return;
        }

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
            // If entry doesn't exist on list yet, create fresh entry with progress = episodeNumber
            int targetProgress = Math.Max(currentProgress, episodeNumber);
            var saveDto = new AquilaSaveEntryDto
            {
                Status = "WATCHING",
                Progress = targetProgress
            };
            SetSaveDtoMediaId(saveDto, effectiveMediaType, aquilaMediaId);
            bool saveSuccess = await _apiClient.SaveListEntryAsync(effectiveMediaType, saveDto, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);
            if (saveSuccess)
            {
                _logger.LogInformation("[Aquila SyncManager] SUCCESS (Fallback Upsert): Created list entry with progress {Progress} for Aquila Media ID {AquilaId}", targetProgress, aquilaMediaId);
            }
            else
            {
                _logger.LogError("[Aquila SyncManager] FAILED to scrobble or upsert episode #{EpNum} for Aquila Media ID {AquilaId}", episodeNumber, aquilaMediaId);
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

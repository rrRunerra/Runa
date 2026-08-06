using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Jellyfin.Plugin.Aquila.Models;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Aquila.Services;

/// <summary>
/// Thread-safe local storage manager for Jellyfin Item ID -> Aquila Media ID mappings.
/// </summary>
public class MediaMappingStore
{
    private readonly string _filePath;
    private readonly ILogger<MediaMappingStore> _logger;
    private readonly ConcurrentDictionary<string, JellyfinItemMapping> _mappings = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="MediaMappingStore"/> class.
    /// </summary>
    public MediaMappingStore(IApplicationPaths applicationPaths, ILogger<MediaMappingStore> logger)
    {
        _logger = logger;
        var dataFolder = Path.Combine(applicationPaths.PluginConfigurationsPath, "Aquila");
        Directory.CreateDirectory(dataFolder);
        _filePath = Path.Combine(dataFolder, "item-mappings.json");
        _logger.LogInformation("[Aquila MappingStore] Storage path: {FilePath}", _filePath);
        Load();
    }

    private void Load()
    {
        try
        {
            if (File.Exists(_filePath))
            {
                var json = File.ReadAllText(_filePath);
                var items = JsonSerializer.Deserialize<List<JellyfinItemMapping>>(json);
                if (items != null)
                {
                    foreach (var item in items)
                    {
                        var key = GetKey(item.UserId, item.JellyfinItemId);
                        _mappings[key] = item;
                    }
                }
                _logger.LogInformation("[Aquila MappingStore] Loaded {Count} mappings from storage.", _mappings.Count);
            }
            else
            {
                _logger.LogInformation("[Aquila MappingStore] No existing mappings file found at {FilePath}. Starting empty.", _filePath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Aquila MappingStore] Failed to load Aquila item mappings from {FilePath}", _filePath);
        }
    }

    private async Task SaveAsync()
    {
        try
        {
            var list = _mappings.Values.ToList();
            var json = JsonSerializer.Serialize(list, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_filePath, json).ConfigureAwait(false);
            _logger.LogInformation("[Aquila MappingStore] Saved {Count} item mappings to disk.", list.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Aquila MappingStore] Failed to save Aquila item mappings to {FilePath}", _filePath);
        }
    }

    private static string GetKey(string userId, string itemId) => $"{userId}_{itemId}";

    /// <summary>
    /// Gets the mapping for a user and Jellyfin item.
    /// </summary>
    public JellyfinItemMapping? GetMapping(string userId, string itemId)
    {
        var key = GetKey(userId, itemId);
        _mappings.TryGetValue(key, out var mapping);
        if (mapping != null)
        {
            _logger.LogInformation("[Aquila MappingStore] FOUND mapping for User={UserId}, Item={ItemId} -> AquilaId={AquilaId}",
                userId, itemId, mapping.AquilaMediaId);
        }
        else
        {
            _logger.LogInformation("[Aquila MappingStore] MISSING mapping for User={UserId}, Item={ItemId}", userId, itemId);
        }
        return mapping;
    }

    /// <summary>
    /// Saves or updates a mapping.
    /// </summary>
    public async Task SetMappingAsync(string userId, string itemId, int aquilaMediaId, string mediaType)
    {
        var mapping = new JellyfinItemMapping
        {
            UserId = userId,
            JellyfinItemId = itemId,
            AquilaMediaId = aquilaMediaId,
            MediaType = mediaType,
            LinkedAt = DateTime.UtcNow
        };
        var key = GetKey(userId, itemId);
        _mappings[key] = mapping;
        _logger.LogInformation("[Aquila MappingStore] SET mapping: User={UserId}, Item={ItemId} -> AquilaId={AquilaId} (MediaType: {MediaType})",
            userId, itemId, aquilaMediaId, mediaType);
        await SaveAsync().ConfigureAwait(false);
    }
}

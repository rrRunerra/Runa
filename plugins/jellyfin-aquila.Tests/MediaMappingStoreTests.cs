using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Jellyfin.Plugin.Aquila.Models;
using Jellyfin.Plugin.Aquila.Services;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Jellyfin.Plugin.Aquila.Tests;

public class MediaMappingStoreTests : IDisposable
{
    private readonly string _tempFolder;
    private readonly Mock<IApplicationPaths> _appPathsMock;
    private readonly MediaMappingStore _store;

    public MediaMappingStoreTests()
    {
        _tempFolder = Path.Combine(Path.GetTempPath(), "AquilaTest_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempFolder);

        _appPathsMock = new Mock<IApplicationPaths>();
        _appPathsMock.Setup(a => a.PluginConfigurationsPath).Returns(_tempFolder);

        _store = new MediaMappingStore(_appPathsMock.Object, NullLogger<MediaMappingStore>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempFolder))
        {
            try { Directory.Delete(_tempFolder, true); } catch { }
        }
    }

    [Fact]
    public async Task SetAndGetMapping_PerUserIsolation_ReturnsCorrectUserMappings()
    {
        var userA = "user-guid-aaaa";
        var userB = "user-guid-bbbb";
        var itemId = "item-series-101";

        // User A links Season 1 and Season 2
        var entriesA = new List<LinkedMediaEntry>
        {
            new LinkedMediaEntry { AquilaMediaId = 101, MediaType = "anime", Order = 1, DisplayTitle = "Season 1" },
            new LinkedMediaEntry { AquilaMediaId = 102, MediaType = "anime", Order = 2, DisplayTitle = "Season 2" }
        };
        await _store.SetMappingAsync(userA, itemId, entriesA);

        // User B links Season 2 and Season 3
        var entriesB = new List<LinkedMediaEntry>
        {
            new LinkedMediaEntry { AquilaMediaId = 102, MediaType = "anime", Order = 1, DisplayTitle = "Season 2" },
            new LinkedMediaEntry { AquilaMediaId = 103, MediaType = "anime", Order = 2, DisplayTitle = "Season 3" }
        };
        await _store.SetMappingAsync(userB, itemId, entriesB);

        var mapA = _store.GetMapping(userA, itemId);
        var mapB = _store.GetMapping(userB, itemId);

        Assert.NotNull(mapA);
        Assert.NotNull(mapB);

        var orderedA = mapA.GetOrderedEntries();
        var orderedB = mapB.GetOrderedEntries();

        Assert.Equal(2, orderedA.Count);
        Assert.Equal(101, orderedA[0].AquilaMediaId);
        Assert.Equal(102, orderedA[1].AquilaMediaId);

        Assert.Equal(2, orderedB.Count);
        Assert.Equal(102, orderedB[0].AquilaMediaId);
        Assert.Equal(103, orderedB[1].AquilaMediaId);
    }

    [Fact]
    public async Task LegacySingleEntry_GetOrderedEntries_ReturnsFallbackList()
    {
        var userId = "user-legacy";
        var itemId = "item-legacy-1";

        await _store.SetMappingAsync(userId, itemId, 999, "movie");

        var map = _store.GetMapping(userId, itemId);
        Assert.NotNull(map);

        var entries = map.GetOrderedEntries();
        Assert.Single(entries);
        Assert.Equal(999, entries[0].AquilaMediaId);
        Assert.Equal("movie", entries[0].MediaType);
        Assert.Equal(1, entries[0].Order);
    }

    [Fact]
    public async Task AddRemoveReorderEntries_ModifiesMappingCorrectly()
    {
        var userId = "user-mod";
        var itemId = "item-mod-1";

        await _store.SetMappingAsync(userId, itemId, new List<LinkedMediaEntry>
        {
            new LinkedMediaEntry { AquilaMediaId = 1, MediaType = "tv", Order = 1 },
            new LinkedMediaEntry { AquilaMediaId = 2, MediaType = "tv", Order = 2 }
        });

        // Add 3rd entry
        await _store.AddOrUpdateEntryAsync(userId, itemId, new LinkedMediaEntry { AquilaMediaId = 3, MediaType = "tv", DisplayTitle = "S3" });
        var map = _store.GetMapping(userId, itemId);
        Assert.NotNull(map);
        Assert.Equal(3, map.GetOrderedEntries().Count);

        // Reorder entries to 3, 1, 2
        await _store.ReorderEntriesAsync(userId, itemId, new List<int> { 3, 1, 2 });
        map = _store.GetMapping(userId, itemId);
        Assert.NotNull(map);
        var ordered = map.GetOrderedEntries();
        Assert.Equal(3, ordered[0].AquilaMediaId);
        Assert.Equal(1, ordered[1].AquilaMediaId);
        Assert.Equal(2, ordered[2].AquilaMediaId);

        // Remove entry 1
        await _store.RemoveEntryAsync(userId, itemId, 1);
        map = _store.GetMapping(userId, itemId);
        Assert.NotNull(map);
        ordered = map.GetOrderedEntries();
        Assert.Equal(2, ordered.Count);
        Assert.Equal(3, ordered[0].AquilaMediaId);
        Assert.Equal(2, ordered[1].AquilaMediaId);
    }

    [Fact]
    public async Task StoragePersistence_ReloadsFileFromDisk()
    {
        var userId = "user-disk";
        var itemId = "item-disk";

        await _store.SetMappingAsync(userId, itemId, new List<LinkedMediaEntry>
        {
            new LinkedMediaEntry { AquilaMediaId = 50, MediaType = "anime", Order = 1 },
            new LinkedMediaEntry { AquilaMediaId = 51, MediaType = "anime", Order = 2 }
        });

        // Reload store from disk
        var reloadedStore = new MediaMappingStore(_appPathsMock.Object, NullLogger<MediaMappingStore>.Instance);
        var map = reloadedStore.GetMapping(userId, itemId);

        Assert.NotNull(map);
        var entries = map.GetOrderedEntries();
        Assert.Equal(2, entries.Count);
        Assert.Equal(50, entries[0].AquilaMediaId);
        Assert.Equal(51, entries[1].AquilaMediaId);
    }
}

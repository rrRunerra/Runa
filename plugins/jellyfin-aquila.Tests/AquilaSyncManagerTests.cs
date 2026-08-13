using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Jellyfin.Plugin.Aquila.Api;
using Jellyfin.Plugin.Aquila.Configuration;
using Jellyfin.Plugin.Aquila.Models;
using Jellyfin.Plugin.Aquila.Services;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Jellyfin.Plugin.Aquila.Tests;

public class AquilaSyncManagerTests
{
    private readonly Mock<IApplicationPaths> _appPathsMock;
    private readonly MediaMappingStore _mappingStore;
    private readonly Mock<AquilaApiClient> _apiClientMock;
    private readonly AquilaSyncManager _syncManager;
    private readonly UserAquilaConfig _userConfig;

    public AquilaSyncManagerTests()
    {
        _appPathsMock = new Mock<IApplicationPaths>();
        _appPathsMock.Setup(a => a.PluginConfigurationsPath).Returns(System.IO.Path.GetTempPath());
        _mappingStore = new MediaMappingStore(_appPathsMock.Object, NullLogger<MediaMappingStore>.Instance);

        _apiClientMock = new Mock<AquilaApiClient>(new HttpClient(), NullLogger<AquilaApiClient>.Instance);
        _syncManager = new AquilaSyncManager(_apiClientMock.Object, _mappingStore, NullLogger<AquilaSyncManager>.Instance);

        _userConfig = new UserAquilaConfig
        {
            JellyfinUserId = "user-123",
            ApiKey = "test-api-key",
            AquilaServerUrl = "https://api.runerra.org"
        };
    }

    [Fact]
    public async Task SingleEntry_ScrobblesToConfiguredEntry()
    {
        var userId = "user-123";
        var itemId = "jellyfin-series-1";

        await _mappingStore.SetMappingAsync(userId, itemId, 101, "anime");

        _apiClientMock
            .Setup(a => a.GetListEntryAsync("anime", 101, _userConfig.ApiKey, _userConfig.AquilaServerUrl))
            .ReturnsAsync((JsonElement?)null);

        _apiClientMock
            .Setup(a => a.IncrementProgressAsync(It.Is<AquilaIncrementDto>(dto => dto.Id == 101 && dto.MediaType == "anime"), _userConfig.ApiKey, _userConfig.AquilaServerUrl))
            .ReturnsAsync(true);

        await _syncManager.HandleScrobbleAsync(userId, itemId, 1, 12, _userConfig, "anime");

        _apiClientMock.Verify(a => a.IncrementProgressAsync(It.Is<AquilaIncrementDto>(dto => dto.Id == 101), _userConfig.ApiKey, _userConfig.AquilaServerUrl), Times.Once);
    }

    [Fact]
    public async Task MultiEntry_AutoAdvancesWhenEntry1StatusIsCompleted()
    {
        var userId = "user-123";
        var itemId = "jellyfin-anime-multi";

        var entries = new List<LinkedMediaEntry>
        {
            new LinkedMediaEntry { AquilaMediaId = 1001, MediaType = "anime", Order = 1, MaxProgress = 12, DisplayTitle = "Season 1" },
            new LinkedMediaEntry { AquilaMediaId = 1002, MediaType = "anime", Order = 2, MaxProgress = 12, DisplayTitle = "Season 2" }
        };
        await _mappingStore.SetMappingAsync(userId, itemId, entries);

        // Mock Entry 1 (1001) as status = COMPLETED
        var entry1Doc = JsonDocument.Parse("{\"status\": \"COMPLETED\", \"progress\": 12}").RootElement;
        _apiClientMock
            .Setup(a => a.GetListEntryAsync("anime", 1001, _userConfig.ApiKey, _userConfig.AquilaServerUrl))
            .ReturnsAsync(entry1Doc);

        // Mock Entry 2 (1002) as WATCHING progress 0
        var entry2Doc = JsonDocument.Parse("{\"status\": \"WATCHING\", \"progress\": 0}").RootElement;
        _apiClientMock
            .Setup(a => a.GetListEntryAsync("anime", 1002, _userConfig.ApiKey, _userConfig.AquilaServerUrl))
            .ReturnsAsync(entry2Doc);

        _apiClientMock
            .Setup(a => a.IncrementProgressAsync(It.Is<AquilaIncrementDto>(dto => dto.Id == 1002), _userConfig.ApiKey, _userConfig.AquilaServerUrl))
            .ReturnsAsync(true);

        await _syncManager.HandleScrobbleAsync(userId, itemId, 13, 24, _userConfig, "anime");

        // Verify Entry 1 (1001) was skipped and Entry 2 (1002) was incremented!
        _apiClientMock.Verify(a => a.IncrementProgressAsync(It.Is<AquilaIncrementDto>(dto => dto.Id == 1001), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        _apiClientMock.Verify(a => a.IncrementProgressAsync(It.Is<AquilaIncrementDto>(dto => dto.Id == 1002), It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task MultiEntry_AutoAdvancesWhenEntry1ProgressEqualsMaxProgress_UnscoredEntry()
    {
        var userId = "user-123";
        var itemId = "jellyfin-anime-unscored";

        var entries = new List<LinkedMediaEntry>
        {
            new LinkedMediaEntry { AquilaMediaId = 2001, MediaType = "anime", Order = 1, MaxProgress = 12, DisplayTitle = "Season 1 (Unscored)" },
            new LinkedMediaEntry { AquilaMediaId = 2002, MediaType = "anime", Order = 2, MaxProgress = 12, DisplayTitle = "Season 2" }
        };
        await _mappingStore.SetMappingAsync(userId, itemId, entries);

        // Mock Entry 1 (2001) has progress = 12 (maxed out), but status is still WATCHING because it wasn't scored!
        var entry1Doc = JsonDocument.Parse("{\"status\": \"WATCHING\", \"progress\": 12}").RootElement;
        _apiClientMock
            .Setup(a => a.GetListEntryAsync("anime", 2001, _userConfig.ApiKey, _userConfig.AquilaServerUrl))
            .ReturnsAsync(entry1Doc);

        // Mock Entry 2 (2002) has no prior list entry
        _apiClientMock
            .Setup(a => a.GetListEntryAsync("anime", 2002, _userConfig.ApiKey, _userConfig.AquilaServerUrl))
            .ReturnsAsync((JsonElement?)null);

        _apiClientMock
            .Setup(a => a.IncrementProgressAsync(It.Is<AquilaIncrementDto>(dto => dto.Id == 2002), _userConfig.ApiKey, _userConfig.AquilaServerUrl))
            .ReturnsAsync(true);

        await _syncManager.HandleScrobbleAsync(userId, itemId, 13, 24, _userConfig, "anime");

        // Verify Entry 1 (2001) was auto-advanced because progress (12) >= maxProgress (12), and Entry 2 (2002) was target scrobbled!
        _apiClientMock.Verify(a => a.IncrementProgressAsync(It.Is<AquilaIncrementDto>(dto => dto.Id == 2001), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        _apiClientMock.Verify(a => a.IncrementProgressAsync(It.Is<AquilaIncrementDto>(dto => dto.Id == 2002), It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }
}

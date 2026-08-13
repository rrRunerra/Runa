using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.Aquila.Api;
using Jellyfin.Plugin.Aquila.Configuration;
using Jellyfin.Plugin.Aquila.Models;
using Jellyfin.Plugin.Aquila.Services;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;
using Xunit;

namespace Jellyfin.Plugin.Aquila.Tests;

public class JellyfinIntegrationTests
{
    [Fact]
    public async Task SimulateJellyfinAndExternalApi_PerUserPlaybackScrobble_SendsExpectedApiRequests()
    {
        // 1. Setup Mock HttpMessageHandler simulating external Aquila API
        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        var requestsLogged = new List<HttpRequestMessage>();
        string lastIncrementBody = "";
        string lastApiKeyHeader = "";

        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(async (request, cancellationToken) =>
            {
                requestsLogged.Add(request);
                var path = request.RequestUri?.AbsolutePath ?? "";
                if (request.Headers.Contains("x-api-key"))
                {
                    lastApiKeyHeader = string.Join(",", request.Headers.GetValues("x-api-key"));
                }
                if (path.Contains("/list/anime/entry/101"))
                {
                    // Entry 101: Maxed progress 12/12
                    var json = "{\"status\": \"WATCHING\", \"progress\": 12, \"totalEpisodes\": 12}";
                    return new HttpResponseMessage
                    {
                        StatusCode = HttpStatusCode.OK,
                        Content = new StringContent(json, Encoding.UTF8, "application/json")
                    };
                }
                else if (path.Contains("/list/anime/entry/102"))
                {
                    // Entry 102: Active progress 3/12
                    var json = "{\"status\": \"WATCHING\", \"progress\": 3, \"totalEpisodes\": 12}";
                    return new HttpResponseMessage
                    {
                        StatusCode = HttpStatusCode.OK,
                        Content = new StringContent(json, Encoding.UTF8, "application/json")
                    };
                }
                else if (path.Contains("/list/increment"))
                {
                    if (request.Content != null)
                    {
                        lastIncrementBody = await request.Content.ReadAsStringAsync();
                    }
                    // Increment response
                    var json = "{\"success\": true}";
                    return new HttpResponseMessage
                    {
                        StatusCode = HttpStatusCode.OK,
                        Content = new StringContent(json, Encoding.UTF8, "application/json")
                    };
                }

                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.NotFound
                };
            });

        var httpClient = new HttpClient(handlerMock.Object);
        var apiClient = new AquilaApiClient(httpClient, NullLogger<AquilaApiClient>.Instance);

        // 2. Setup MediaMappingStore
        var appPathsMock = new Mock<IApplicationPaths>();
        appPathsMock.Setup(a => a.PluginConfigurationsPath).Returns(System.IO.Path.GetTempPath());
        var store = new MediaMappingStore(appPathsMock.Object, NullLogger<MediaMappingStore>.Instance);

        var syncManager = new AquilaSyncManager(apiClient, store, NullLogger<AquilaSyncManager>.Instance);

        // 3. User A links Jellyfin Item to Season 1 (101) and Season 2 (102)
        var userA = "jellyfin-user-a";
        var itemId = "item-attack-on-titan";

        await store.SetMappingAsync(userA, itemId, new List<LinkedMediaEntry>
        {
            new LinkedMediaEntry { AquilaMediaId = 101, MediaType = "anime", Order = 1, MaxProgress = 12, DisplayTitle = "Season 1" },
            new LinkedMediaEntry { AquilaMediaId = 102, MediaType = "anime", Order = 2, MaxProgress = 12, DisplayTitle = "Season 2" }
        });

        var userConfigA = new UserAquilaConfig
        {
            JellyfinUserId = userA,
            ApiKey = "user-a-secret-key",
            AquilaServerUrl = "https://api.runerra.org"
        };

        // 4. Simulate Jellyfin PlaybackTracker triggering scrobble for User A
        await syncManager.HandleScrobbleAsync(userA, itemId, 13, 24, userConfigA, "anime");

        // 5. Assert external API requests
        Assert.True(requestsLogged.Count >= 2);
        Assert.Equal("user-a-secret-key", lastApiKeyHeader);
        Assert.Contains("\"id\":102", lastIncrementBody); // Must increment Season 2 (102) because Season 1 (101) is maxed 12/12!
    }
}

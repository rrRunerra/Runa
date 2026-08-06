using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Jellyfin.Plugin.Aquila.Models;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Aquila.Api;

/// <summary>
/// REST API client for communicating with Aquila (Runa Realm backend) via x-api-key.
/// </summary>
public class AquilaApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AquilaApiClient> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="AquilaApiClient"/> class.
    /// </summary>
    public AquilaApiClient(HttpClient httpClient, ILogger<AquilaApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Searches media by title via GET /:mediaType/search/:title.
    /// </summary>
    public async Task<List<AquilaSearchResult>> SearchMediaAsync(string mediaType, string title, string apiKey, string baseUrl)
    {
        try
        {
            var url = $"{baseUrl.TrimEnd('/')}/{mediaType}/search/{Uri.EscapeDataString(title)}";
            _logger.LogInformation("[Aquila ApiClient] Sending GET search request: {Url}", url);
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("x-api-key", apiKey);

            var response = await _httpClient.SendAsync(request).ConfigureAwait(false);
            _logger.LogInformation("[Aquila ApiClient] Search response status code: {StatusCode}", response.StatusCode);

            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            var results = JsonSerializer.Deserialize<List<AquilaSearchResult>>(json, JsonOptions);
            _logger.LogInformation("[Aquila ApiClient] Search returned {Count} items.", results?.Count ?? 0);
            return results ?? new List<AquilaSearchResult>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Aquila ApiClient] Failed to search Aquila media. Type: {MediaType}, Title: {Title}", mediaType, title);
            return new List<AquilaSearchResult>();
        }
    }

    /// <summary>
    /// Increments user list progress via POST /list/increment.
    /// </summary>
    public async Task<bool> IncrementProgressAsync(AquilaIncrementDto dto, string apiKey, string baseUrl)
    {
        try
        {
            var url = $"{baseUrl.TrimEnd('/')}/list/increment";
            _logger.LogInformation("[Aquila ApiClient] Sending POST increment request to {Url} for Media ID {MediaId} (Type: {MediaType}, Count: {Count})",
                url, dto.Id, dto.MediaType, dto.Count);

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("x-api-key", apiKey);

            var jsonBody = JsonSerializer.Serialize(dto, JsonOptions);
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                _logger.LogWarning("[Aquila ApiClient] Increment failed with HTTP {StatusCode}: {Error}", response.StatusCode, err);
                return false;
            }

            _logger.LogInformation("[Aquila ApiClient] Increment successful for Media ID {MediaId}", dto.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Aquila ApiClient] Error calling Aquila /list/increment for ID: {MediaId}", dto.Id);
            return false;
        }
    }

    /// <summary>
    /// Fetches list entry details via GET /list/:mediaType/entry/:id.
    /// </summary>
    public async Task<JsonElement?> GetListEntryAsync(string mediaType, int mediaId, string apiKey, string baseUrl)
    {
        try
        {
            var url = $"{baseUrl.TrimEnd('/')}/list/{mediaType}/entry/{mediaId}";
            _logger.LogInformation("[Aquila ApiClient] Fetching list entry from {Url}", url);
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("x-api-key", apiKey);

            var response = await _httpClient.SendAsync(request).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[Aquila ApiClient] List entry request returned status {StatusCode}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Aquila ApiClient] Failed to get list entry for {MediaType} ID {MediaId}", mediaType, mediaId);
            return null;
        }
    }

    /// <summary>
    /// Saves/upserts list entry via POST /list/:mediaType/entry/save.
    /// </summary>
    public async Task<bool> SaveListEntryAsync(string mediaType, AquilaSaveEntryDto dto, string apiKey, string baseUrl)
    {
        try
        {
            var url = $"{baseUrl.TrimEnd('/')}/list/{mediaType}/entry/save";
            _logger.LogInformation("[Aquila ApiClient] Saving list entry to {Url} (Status: {Status}, Progress: {Progress}, Score: {Score})",
                url, dto.Status, dto.Progress, dto.Score);

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("x-api-key", apiKey);

            var jsonBody = JsonSerializer.Serialize(dto, JsonOptions);
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request).ConfigureAwait(false);
            _logger.LogInformation("[Aquila ApiClient] Save entry response status: {StatusCode}", response.StatusCode);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Aquila ApiClient] Failed to save list entry for {MediaType}", mediaType);
            return false;
        }
    }
}

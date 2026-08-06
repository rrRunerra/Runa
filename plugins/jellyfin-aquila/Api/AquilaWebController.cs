using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Jellyfin.Plugin.Aquila.Configuration;
using Jellyfin.Plugin.Aquila.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Aquila.Api;

/// <summary>
/// REST API controller serving Aquila web injection script, CSS, and API proxy endpoints across multiple route aliases with cache-control headers.
/// </summary>
[ApiController]
[Route("Aquila")]
[Route("api/Aquila")]
[Route("Plugins/Aquila")]
public class AquilaWebController : ControllerBase
{
    private readonly AquilaApiClient _apiClient;
    private readonly ILogger<AquilaWebController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AquilaWebController"/> class.
    /// </summary>
    public AquilaWebController(AquilaApiClient apiClient, ILogger<AquilaWebController> logger)
    {
        _apiClient = apiClient;
        _logger = logger;
    }

    /// <summary>
    /// Serves aquila-web-injection.js with application/javascript content type and no-cache headers.
    /// </summary>
    [HttpGet("WebInjection.js")]
    [Produces("application/javascript")]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public IActionResult GetWebInjectionScript()
    {
        Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        Response.Headers["Pragma"] = "no-cache";
        Response.Headers["Expires"] = "0";

        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream("Jellyfin.Plugin.Aquila.Web.aquila-web-injection.js");
        if (stream == null)
        {
            return NotFound("// Aquila injection script resource not found.");
        }

        using var reader = new StreamReader(stream, Encoding.UTF8);
        var js = reader.ReadToEnd();
        return Content(js, "application/javascript", Encoding.UTF8);
    }

    /// <summary>
    /// Serves aquila-modal.css with text/css content type and no-cache headers.
    /// </summary>
    [HttpGet("Modal.css")]
    [Produces("text/css")]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public IActionResult GetModalCss()
    {
        Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        Response.Headers["Pragma"] = "no-cache";
        Response.Headers["Expires"] = "0";

        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream("Jellyfin.Plugin.Aquila.Web.aquila-modal.css");
        if (stream == null)
        {
            return NotFound("/* Aquila modal css resource not found. */");
        }

        using var reader = new StreamReader(stream, Encoding.UTF8);
        var css = reader.ReadToEnd();
        return Content(css, "text/css", Encoding.UTF8);
    }

    private static UserAquilaConfig? GetCurrentUserConfig()
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || config.UserConfigs == null) return null;

        return config.UserConfigs.FirstOrDefault(u => !string.IsNullOrWhiteSpace(u.ApiKey))
            ?? config.UserConfigs.FirstOrDefault();
    }

    /// <summary>
    /// Proxies search requests to Aquila API from server side to bypass CORS.
    /// </summary>
    [HttpGet("Api/Search")]
    [AllowAnonymous]
    public async Task<IActionResult> ProxySearch([FromQuery] string mediaType, [FromQuery] string query)
    {
        var userConfig = GetCurrentUserConfig();
        if (userConfig == null || string.IsNullOrWhiteSpace(userConfig.ApiKey))
        {
            _logger.LogWarning("[Aquila Plugin] ProxySearch failed: No Aquila API Key configured for user.");
            return BadRequest(new { message = "Aquila API Key not configured." });
        }

        _logger.LogInformation("[Aquila Plugin] ProxySearch for {MediaType} with query '{Query}'", mediaType, query);
        var results = await _apiClient.SearchMediaAsync(mediaType, query, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);
        return Ok(results);
    }

    /// <summary>
    /// Proxies list entry fetch requests to Aquila API from server side to bypass CORS.
    /// </summary>
    [HttpGet("Api/Entry")]
    [AllowAnonymous]
    public async Task<IActionResult> ProxyGetEntry([FromQuery] string mediaType, [FromQuery] int id)
    {
        var userConfig = GetCurrentUserConfig();
        if (userConfig == null || string.IsNullOrWhiteSpace(userConfig.ApiKey))
        {
            return BadRequest(new { message = "Aquila API Key not configured." });
        }

        _logger.LogInformation("[Aquila Plugin] ProxyGetEntry for {MediaType} ID {MediaId}", mediaType, id);
        var entry = await _apiClient.GetListEntryAsync(mediaType, id, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);
        if (!entry.HasValue)
        {
            return NotFound(new { message = "Entry not found" });
        }

        return Content(entry.Value.GetRawText(), "application/json", Encoding.UTF8);
    }

    /// <summary>
    /// Proxies list entry save requests to Aquila API from server side to bypass CORS.
    /// </summary>
    [HttpPost("Api/Save")]
    [AllowAnonymous]
    public async Task<IActionResult> ProxySaveEntry([FromQuery] string mediaType, [FromBody] AquilaSaveEntryDto dto)
    {
        var userConfig = GetCurrentUserConfig();
        if (userConfig == null || string.IsNullOrWhiteSpace(userConfig.ApiKey))
        {
            return BadRequest(new { message = "Aquila API Key not configured." });
        }

        _logger.LogInformation("[Aquila Plugin] ProxySaveEntry for {MediaType}", mediaType);
        var success = await _apiClient.SaveListEntryAsync(mediaType, dto, userConfig.ApiKey, userConfig.AquilaServerUrl).ConfigureAwait(false);
        return success ? Ok(new { success = true }) : StatusCode(500, new { message = "Failed to save entry on Aquila API" });
    }
}

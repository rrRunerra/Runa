using System;
using System.Text.Json.Serialization;

namespace Jellyfin.Plugin.Aquila.Models;

/// <summary>
/// Persisted map linking Jellyfin Item ID to Aquila Internal Media ID per user.
/// </summary>
public class JellyfinItemMapping
{
    /// <summary>
    /// Gets or sets the Jellyfin User ID.
    /// </summary>
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Jellyfin Item ID.
    /// </summary>
    [JsonPropertyName("jellyfinItemId")]
    public string JellyfinItemId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the internal Aquila Media ID.
    /// </summary>
    [JsonPropertyName("aquilaMediaId")]
    public int AquilaMediaId { get; set; }

    /// <summary>
    /// Gets or sets the mapped Media Type ("anime" | "tv" | "movie").
    /// </summary>
    [JsonPropertyName("mediaType")]
    public string MediaType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the timestamp when the mapping was created.
    /// </summary>
    [JsonPropertyName("linkedAt")]
    public DateTime LinkedAt { get; set; } = DateTime.UtcNow;
}

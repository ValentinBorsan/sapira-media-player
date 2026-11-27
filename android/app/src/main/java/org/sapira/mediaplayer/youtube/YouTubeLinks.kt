package org.sapira.mediaplayer.youtube

import android.net.Uri

/** Shared result of a YouTube resolution (used by both flavors). */
data class ResolvedYouTubeStream(
    val videoId: String,
    val title: String,
    val author: String,
    val durationMs: Long,
    val thumbnailUrl: String?,
    /** Main playable URL (video-only, muxed, audio-only, HLS or DASH manifest). */
    val mediaUrl: String,
    /** Separate audio track to merge with a video-only [mediaUrl]. */
    val audioUrl: String?,
    val mimeType: String?,
    val height: Int,
    val isLive: Boolean,
    /** Multi-resolution MPEG-DASH MPD XML for instant adaptive playback without startup freeze. */
    val dashManifestXml: String? = null
)

object YouTubeLinks {
    private val HOSTS = setOf(
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
        "www.youtu.be",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com"
    )
    private val ID_REGEX = Regex("^[A-Za-z0-9_-]{11}$")

    fun isYouTubeUrl(raw: String): Boolean = runCatching {
        Uri.parse(raw.trim()).host?.lowercase() in HOSTS
    }.getOrDefault(false)

    fun isMusicUrl(raw: String): Boolean = runCatching {
        Uri.parse(raw.trim()).host?.lowercase() == "music.youtube.com"
    }.getOrDefault(false)

    /** Extracts the 11-char video id from watch, youtu.be, shorts, embed, live and mix/playlist URLs. */
    fun extractVideoId(raw: String): String? {
        val uri = runCatching { Uri.parse(raw.trim()) }.getOrNull() ?: return null
        val host = uri.host?.lowercase() ?: return null
        val segments = uri.pathSegments.orEmpty()
        val candidate = when {
            host.endsWith("youtu.be") -> segments.firstOrNull()
            !uri.getQueryParameter("v").isNullOrBlank() -> uri.getQueryParameter("v")
            segments.size >= 2 && segments[0] in setOf("shorts", "embed", "live", "v") -> segments[1]
            else -> null
        }
        return candidate?.takeIf { ID_REGEX.matches(it) }
    }

    fun canonicalWatchUrl(videoId: String): String = "https://www.youtube.com/watch?v=$videoId"
}

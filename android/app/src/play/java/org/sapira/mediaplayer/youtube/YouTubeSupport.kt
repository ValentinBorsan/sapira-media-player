package org.sapira.mediaplayer.youtube

/**
 * Google Play flavor: no third-party YouTube extraction (YouTube ToS / Play policy compliant).
 * YouTube links are opened in the official embedded YouTube player instead.
 */
object YouTubeSupport {
    const val NATIVE_PLAYBACK: Boolean = false

    @Suppress("UNUSED_PARAMETER")
    suspend fun resolve(url: String, audioOnly: Boolean): Result<ResolvedYouTubeStream> =
        Result.failure(UnsupportedOperationException("Native YouTube playback is not available in this build"))
}

package org.sapira.mediaplayer.service

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.ResolvingDataSource
import androidx.media3.exoplayer.drm.DrmSessionManagerProvider
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.MergingMediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.exoplayer.upstream.LoadErrorHandlingPolicy

/**
 * Media source factory that:
 *  - merges a separate audio URL (MediaItem extra [EXTRA_AUDIO_URL]) with a video-only stream
 *    (used for YouTube 720p/1080p playback),
 *  - sends a client-appropriate User-Agent for googlevideo.com URLs,
 *  - falls back to the default factory (local files, HLS, DASH, progressive streams).
 */
@UnstableApi
class SapiraMediaSourceFactory(context: Context) : MediaSource.Factory {

    private val httpFactory = DefaultHttpDataSource.Factory()
        .setAllowCrossProtocolRedirects(true)
        .setConnectTimeoutMs(15_000)
        .setReadTimeoutMs(20_000)
        .setDefaultRequestProperties(mapOf("User-Agent" to DESKTOP_USER_AGENT))

    private val resolvingFactory = ResolvingDataSource.Factory(httpFactory) { dataSpec: DataSpec ->
        val ua = userAgentFor(dataSpec.uri.toString())
        if (ua != null) dataSpec.withAdditionalHeaders(mapOf("User-Agent" to ua)) else dataSpec
    }

    private val dataSourceFactory = DefaultDataSource.Factory(context, resolvingFactory)
    private val defaultFactory = DefaultMediaSourceFactory(dataSourceFactory)
    private val progressiveFactory = ProgressiveMediaSource.Factory(dataSourceFactory)

    override fun setDrmSessionManagerProvider(
        drmSessionManagerProvider: DrmSessionManagerProvider
    ): MediaSource.Factory {
        defaultFactory.setDrmSessionManagerProvider(drmSessionManagerProvider)
        progressiveFactory.setDrmSessionManagerProvider(drmSessionManagerProvider)
        return this
    }

    override fun setLoadErrorHandlingPolicy(
        loadErrorHandlingPolicy: LoadErrorHandlingPolicy
    ): MediaSource.Factory {
        defaultFactory.setLoadErrorHandlingPolicy(loadErrorHandlingPolicy)
        progressiveFactory.setLoadErrorHandlingPolicy(loadErrorHandlingPolicy)
        return this
    }

    override fun getSupportedTypes(): IntArray = defaultFactory.supportedTypes

    override fun createMediaSource(mediaItem: MediaItem): MediaSource {
        val audioUrl = mediaItem.requestMetadata.extras?.getString(EXTRA_AUDIO_URL)
            ?: mediaItem.mediaMetadata.extras?.getString(EXTRA_AUDIO_URL)

        if (!audioUrl.isNullOrBlank()) {
            val videoSource = progressiveFactory.createMediaSource(mediaItem)
            val audioSource = progressiveFactory.createMediaSource(MediaItem.fromUri(audioUrl))
            return MergingMediaSource(true, true, videoSource, audioSource)
        }
        return defaultFactory.createMediaSource(mediaItem)
    }

    companion object {
        const val EXTRA_AUDIO_URL = "org.sapira.mediaplayer.AUDIO_URL"

        private const val DESKTOP_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0"
        private const val ANDROID_YT_USER_AGENT =
            "com.google.android.youtube/19.28.35 (Linux; U; Android 15; US) gzip"
        private const val IOS_YT_USER_AGENT =
            "com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X; US)"

        private fun userAgentFor(url: String): String? {
            if (!url.contains("googlevideo.com") && !url.contains("youtube.com")) return null
            return when {
                url.contains("c=ANDROID") -> ANDROID_YT_USER_AGENT
                url.contains("c=IOS") -> IOS_YT_USER_AGENT
                else -> DESKTOP_USER_AGENT
            }
        }
    }
}

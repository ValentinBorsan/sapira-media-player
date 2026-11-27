package org.sapira.mediaplayer.youtube

import androidx.media3.common.MimeTypes
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.schabi.newpipe.extractor.MediaFormat
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.localization.ContentCountry
import org.schabi.newpipe.extractor.localization.Localization
import org.schabi.newpipe.extractor.stream.AudioStream
import org.schabi.newpipe.extractor.stream.DeliveryMethod
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamType
import org.schabi.newpipe.extractor.stream.VideoStream

/**
 * Full (sideloaded) flavor: native YouTube playback through NewPipeExtractor + Media3.
 * Picks H.264 video up to 1080p merged with the best AAC/Opus audio, or audio-only / HLS live.
 */
object YouTubeSupport {
    const val NATIVE_PLAYBACK: Boolean = true
    private const val MAX_HEIGHT = 1080

    @Volatile
    private var initialized = false

    private fun ensureInit() {
        if (initialized) return
        synchronized(this) {
            if (!initialized) {
                NewPipe.init(SapiraNewPipeDownloader, Localization("en", "US"), ContentCountry("US"))
                initialized = true
            }
        }
    }

    suspend fun resolve(url: String, audioOnly: Boolean): Result<ResolvedYouTubeStream> =
        withContext(Dispatchers.IO) {
            runCatching {
                val videoId = YouTubeLinks.extractVideoId(url)
                    ?: throw IllegalArgumentException("Unsupported YouTube link (open a specific video, not a channel or playlist page)")
                ensureInit()

                val info = StreamInfo.getInfo(ServiceList.YouTube, YouTubeLinks.canonicalWatchUrl(videoId))
                val thumb = info.thumbnails.maxByOrNull { it.height }?.url
                val durationMs = info.duration.coerceAtLeast(0L) * 1000L
                val title = info.name.orEmpty().ifBlank { "YouTube" }
                val author = info.uploaderName.orEmpty()

                val isLive = info.streamType == StreamType.LIVE_STREAM ||
                    info.streamType == StreamType.AUDIO_LIVE_STREAM

                fun result(mediaUrl: String, audioUrl: String?, mime: String?, height: Int) =
                    ResolvedYouTubeStream(
                        videoId = videoId,
                        title = title,
                        author = author,
                        durationMs = durationMs,
                        thumbnailUrl = thumb,
                        mediaUrl = mediaUrl,
                        audioUrl = audioUrl,
                        mimeType = mime,
                        height = height,
                        isLive = isLive
                    )

                // 1. Live streams -> HLS
                if (isLive && !info.hlsUrl.isNullOrBlank()) {
                    return@runCatching result(info.hlsUrl, null, MimeTypes.APPLICATION_M3U8, 0)
                }

                val bestAudio = pickBestAudio(info.audioStreams, preferAac = !audioOnly)

                // 2. Audio-only playback (music, podcasts, background listening)
                if (audioOnly) {
                    if (bestAudio != null) {
                        return@runCatching result(bestAudio.content, null, null, 0)
                    }
                }

                // 3. Video-only (up to 1080p, H.264 preferred) merged with separate audio
                val bestVideo = pickBestVideo(info.videoOnlyStreams)
                if (!audioOnly && bestVideo != null && bestAudio != null) {
                    return@runCatching result(bestVideo.content, bestAudio.content, null, bestVideo.height)
                }

                // 4. Muxed progressive fallback (usually 360p)
                val muxed = info.videoStreams
                    .filter { it.isUrl && it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP }
                    .maxByOrNull { it.height }
                if (muxed != null) {
                    return@runCatching result(muxed.content, null, null, muxed.height)
                }

                // 5. Manifest fallbacks
                if (!info.dashMpdUrl.isNullOrBlank()) {
                    return@runCatching result(info.dashMpdUrl, null, MimeTypes.APPLICATION_MPD, 0)
                }
                if (!info.hlsUrl.isNullOrBlank()) {
                    return@runCatching result(info.hlsUrl, null, MimeTypes.APPLICATION_M3U8, 0)
                }
                if (bestAudio != null) {
                    return@runCatching result(bestAudio.content, null, null, 0)
                }

                throw IllegalStateException("No playable stream found for this video")
            }
        }

    private fun pickBestAudio(streams: List<AudioStream>, preferAac: Boolean): AudioStream? {
        val playable = streams.filter { it.isUrl && it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP }
        if (playable.isEmpty()) return null
        val preferred = if (preferAac) playable.filter { it.format == MediaFormat.M4A } else emptyList()
        return preferred.ifEmpty { playable }.maxByOrNull { it.averageBitrate }
    }

    private fun pickBestVideo(streams: List<VideoStream>): VideoStream? {
        val playable = streams.filter {
            it.isUrl && it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP && it.height in 1..MAX_HEIGHT
        }
        if (playable.isEmpty()) return null
        val avc = playable.filter { stream ->
            stream.codec?.startsWith("avc", ignoreCase = true) == true || stream.format == MediaFormat.MPEG_4
        }
        return avc.ifEmpty { playable }.maxByOrNull { it.height }
    }
}

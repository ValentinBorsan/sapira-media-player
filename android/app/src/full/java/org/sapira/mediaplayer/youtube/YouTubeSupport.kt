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
import java.util.Locale

/**
 * Full (sideloaded) flavor: native YouTube playback through NewPipeExtractor + Media3 DASH.
 * Builds an in-memory multi-resolution MPEG-DASH MPD (360p..1080p H.264 + AAC) so ExoPlayer
 * fetches tiny indexed subsegments instead of stalling on dual progressive streams.
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
                val durationSec = info.duration.coerceAtLeast(0L)
                val durationMs = durationSec * 1000L
                val title = info.name.orEmpty().ifBlank { "YouTube" }
                val author = info.uploaderName.orEmpty()

                val isLive = info.streamType == StreamType.LIVE_STREAM ||
                    info.streamType == StreamType.AUDIO_LIVE_STREAM

                fun result(
                    mediaUrl: String,
                    audioUrl: String?,
                    mime: String?,
                    height: Int,
                    dashMpd: String? = null
                ) = ResolvedYouTubeStream(
                    videoId = videoId,
                    title = title,
                    author = author,
                    durationMs = durationMs,
                    thumbnailUrl = thumb,
                    mediaUrl = mediaUrl,
                    audioUrl = audioUrl,
                    mimeType = mime,
                    height = height,
                    isLive = isLive,
                    dashManifestXml = dashMpd
                )

                // 1. Live streams -> HLS adaptive manifest
                if (isLive && !info.hlsUrl.isNullOrBlank()) {
                    return@runCatching result(info.hlsUrl, null, MimeTypes.APPLICATION_M3U8, 0)
                }

                val bestAudio = pickBestAudio(info.audioStreams, preferAac = true)
                    ?: pickBestAudio(info.audioStreams, preferAac = false)

                // 2. Audio-only playback: indexed DASH single-track MPD for <250ms start & zero throttling
                if (audioOnly) {
                    if (bestAudio != null) {
                        val audioDash = if (durationSec > 0 && hasValidRanges(bestAudio)) {
                            buildDashMpd(durationSec, emptyList(), bestAudio)
                        } else null
                        return@runCatching result(
                            mediaUrl = bestAudio.content,
                            audioUrl = null,
                            mime = if (audioDash != null) MimeTypes.APPLICATION_MPD else null,
                            height = 0,
                            dashMpd = audioDash
                        )
                    }
                }

                // 3. Multi-resolution Adaptive DASH MPD (360p / 480p / 720p / 1080p H.264 + AAC)
                val dashVideos = pickDashVideoLadder(info.videoOnlyStreams)
                if (!audioOnly && durationSec > 0 && dashVideos.isNotEmpty() && bestAudio != null && hasValidRanges(bestAudio)) {
                    val mpd = buildDashMpd(durationSec, dashVideos, bestAudio)
                    val topHeight = dashVideos.maxOf { it.height }
                    return@runCatching result(
                        mediaUrl = dashVideos.first().content,
                        audioUrl = null,
                        mime = MimeTypes.APPLICATION_MPD,
                        height = topHeight,
                        dashMpd = mpd
                    )
                }

                // 4. Remote DASH or HLS manifest provided directly by YouTube (e.g. iOS HLS ladder)
                if (!audioOnly && !info.hlsUrl.isNullOrBlank()) {
                    return@runCatching result(info.hlsUrl, null, MimeTypes.APPLICATION_M3U8, 1080)
                }
                if (!audioOnly && !info.dashMpdUrl.isNullOrBlank()) {
                    return@runCatching result(info.dashMpdUrl, null, MimeTypes.APPLICATION_MPD, 1080)
                }

                // 5. Fallback: Dual-stream MergingMediaSource (still protected by 9MB chunked Range DataSource)
                val bestVideo = pickBestSingleVideo(info.videoOnlyStreams)
                if (!audioOnly && bestVideo != null && bestAudio != null) {
                    return@runCatching result(bestVideo.content, bestAudio.content, null, bestVideo.height)
                }

                // 6. Muxed progressive fallback
                val muxed = info.videoStreams
                    .filter { it.isUrl && it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP }
                    .maxByOrNull { it.height }
                if (muxed != null) {
                    return@runCatching result(muxed.content, null, null, muxed.height)
                }

                if (bestAudio != null) {
                    return@runCatching result(bestAudio.content, null, null, 0)
                }

                throw IllegalStateException("No playable stream found for this video")
            }
        }

    private fun hasValidRanges(s: VideoStream): Boolean =
        s.initStart >= 0 && s.initEnd > s.initStart && s.indexStart > 0 && s.indexEnd > s.indexStart

    private fun hasValidRanges(s: AudioStream): Boolean =
        s.initStart >= 0 && s.initEnd > s.initStart && s.indexStart > 0 && s.indexEnd > s.indexStart

    private fun pickDashVideoLadder(streams: List<VideoStream>): List<VideoStream> {
        val candidates = streams.filter {
            it.isUrl &&
                it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP &&
                it.height in 240..MAX_HEIGHT &&
                hasValidRanges(it)
        }
        if (candidates.isEmpty()) return emptyList()

        // Prefer H.264 (avc1 / video/mp4) so all qualities share one seamless hardware AdaptationSet
        val mp4Avc = candidates.filter {
            it.format == MediaFormat.MPEG_4 &&
                (it.codec == null || it.codec.startsWith("avc", ignoreCase = true))
        }
        val pool = mp4Avc.ifEmpty {
            candidates.filter { it.format == candidates.first().format }
        }

        return pool
            .groupBy { Pair(it.height, it.fps > 45) }
            .map { (_, group) -> group.maxBy { it.bitrate } }
            .sortedByDescending { it.height * 100 + it.fps }
    }

    private fun pickBestAudio(streams: List<AudioStream>, preferAac: Boolean): AudioStream? {
        val playable = streams.filter { it.isUrl && it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP }
        if (playable.isEmpty()) return null
        val preferred = if (preferAac) playable.filter { it.format == MediaFormat.M4A } else emptyList()
        return preferred.ifEmpty { playable }.maxByOrNull { it.averageBitrate.coerceAtLeast(it.bitrate) }
    }

    private fun pickBestSingleVideo(streams: List<VideoStream>): VideoStream? {
        val playable = streams.filter {
            it.isUrl && it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP && it.height in 1..MAX_HEIGHT
        }
        if (playable.isEmpty()) return null
        val avc = playable.filter {
            it.codec?.startsWith("avc", ignoreCase = true) == true || it.format == MediaFormat.MPEG_4
        }
        return avc.ifEmpty { playable }.maxByOrNull { it.height }
    }

    private fun buildDashMpd(
        durationSec: Long,
        videos: List<VideoStream>,
        audio: AudioStream
    ): String {
        val durIso = String.format(Locale.US, "PT%d.000S", durationSec)
        val sb = StringBuilder(2048)
        sb.append("""<?xml version="1.0" encoding="UTF-8"?>""").append('\n')
        sb.append("""<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" type="static" minBufferTime="PT1.0S" mediaPresentationDuration="""").append(durIso).append("""">""").append('\n')
        sb.append("""  <Period duration="""").append(durIso).append("""">""").append('\n')

        if (videos.isNotEmpty()) {
            val videoMime = videos.first().format?.mimeType ?: "video/mp4"
            sb.append("""    <AdaptationSet id="0" contentType="video" mimeType="""").append(xmlEsc(videoMime)).append("""" subsegmentAlignment="true">""").append('\n')
            videos.forEachIndexed { idx, v ->
                val codec = v.codec?.takeIf { it.isNotBlank() }
                    ?: if (videoMime.contains("webm")) "vp9" else "avc1.4d401f"
                val bw = v.bitrate.takeIf { it > 0 } ?: (v.height * 2500)
                val fps = v.fps.takeIf { it > 0 } ?: 30
                val width = v.width.takeIf { it > 0 } ?: (v.height * 16 / 9)
                val repId = if (v.itag > 0) "v${v.itag}" else "v_$idx"
                sb.append("""      <Representation id="""").append(repId)
                    .append("""" codecs="""").append(xmlEsc(codec))
                    .append("""" width="""").append(width)
                    .append("""" height="""").append(v.height)
                    .append("""" frameRate="""").append(fps)
                    .append("""" bandwidth="""").append(bw)
                    .append("""">""").append('\n')
                sb.append("""        <BaseURL>""").append(xmlEsc(v.content)).append("""</BaseURL>""").append('\n')
                sb.append("""        <SegmentBase indexRange="""").append(v.indexStart).append('-').append(v.indexEnd).append("""">""").append('\n')
                sb.append("""          <Initialization range="""").append(v.initStart).append('-').append(v.initEnd).append(""""/>""").append('\n')
                sb.append("""        </SegmentBase>""").append('\n')
                sb.append("""      </Representation>""").append('\n')
            }
            sb.append("""    </AdaptationSet>""").append('\n')
        }

        val audioMime = audio.format?.mimeType ?: "audio/mp4"
        val audioCodec = audio.codec?.takeIf { it.isNotBlank() }
            ?: if (audioMime.contains("webm")) "opus" else "mp4a.40.2"
        val audioBw = audio.bitrate.takeIf { it > 0 }
            ?: (audio.averageBitrate.takeIf { it > 0 }?.times(1000) ?: 128_000)
        val sampleRate = audio.itagItem?.sampleRate?.takeIf { it > 0 } ?: 44100
        val channels = audio.itagItem?.audioChannels?.takeIf { it > 0 } ?: 2
        val audioId = if (audio.itag > 0) "a${audio.itag}" else "a_0"

        sb.append("""    <AdaptationSet id="1" contentType="audio" mimeType="""").append(xmlEsc(audioMime)).append("""" subsegmentAlignment="true">""").append('\n')
        sb.append("""      <Representation id="""").append(audioId)
            .append("""" codecs="""").append(xmlEsc(audioCodec))
            .append("""" audioSamplingRate="""").append(sampleRate)
            .append("""" bandwidth="""").append(audioBw)
            .append("""">""").append('\n')
        sb.append("""        <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="""").append(channels).append(""""/>""").append('\n')
        sb.append("""        <BaseURL>""").append(xmlEsc(audio.content)).append("""</BaseURL>""").append('\n')
        sb.append("""        <SegmentBase indexRange="""").append(audio.indexStart).append('-').append(audio.indexEnd).append("""">""").append('\n')
        sb.append("""          <Initialization range="""").append(audio.initStart).append('-').append(audio.initEnd).append(""""/>""").append('\n')
        sb.append("""        </SegmentBase>""").append('\n')
        sb.append("""      </Representation>""").append('\n')
        sb.append("""    </AdaptationSet>""").append('\n')

        sb.append("""  </Period>""").append('\n')
        sb.append("""</MPD>""")
        return sb.toString()
    }

    private fun xmlEsc(raw: String): String = buildString(raw.length + 16) {
        for (ch in raw) {
            when (ch) {
                '&' -> append("&amp;")
                '<' -> append("&lt;")
                '>' -> append("&gt;")
                '"' -> append("&quot;")
                '\'' -> append("&apos;")
                else -> append(ch)
            }
        }
    }
}

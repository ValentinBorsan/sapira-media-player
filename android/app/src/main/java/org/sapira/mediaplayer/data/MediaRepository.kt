package org.sapira.mediaplayer.data

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import android.provider.OpenableColumns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.sapira.mediaplayer.model.LyricLine
import org.sapira.mediaplayer.model.MediaKind
import org.sapira.mediaplayer.model.ParsedLyrics
import org.sapira.mediaplayer.model.SapiraTrack
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object MediaRepository {

    private val ALBUM_ART_URI = Uri.parse("content://media/external/audio/albumart")
    private val LRC_REGEX = Regex("""\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?]""")

    suspend fun scanDeviceMedia(context: Context): List<SapiraTrack> = withContext(Dispatchers.IO) {
        val tracks = mutableListOf<SapiraTrack>()
        val resolver = context.contentResolver

        // 1. Scan On-Device Audio
        val audioProjection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.DISPLAY_NAME
        )
        val audioSelection = "${MediaStore.Audio.Media.IS_MUSIC} != 0 AND ${MediaStore.Audio.Media.DURATION} > 1000"

        runCatching {
            resolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                audioProjection,
                audioSelection,
                null,
                "${MediaStore.Audio.Media.DATE_ADDED} DESC"
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
                val durCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)

                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idCol)
                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        id
                    )
                    val displayName = cursor.getString(nameCol) ?: ""
                    val rawTitle = cursor.getString(titleCol)?.trim().orEmpty()
                    val rawArtist = cursor.getString(artistCol)?.trim().orEmpty()
                    val cleanArtist = if (rawArtist.equals("<unknown>", ignoreCase = true)) "" else rawArtist
                    val rawAlbum = cursor.getString(albumCol)?.trim().orEmpty()
                    val cleanAlbum = if (rawAlbum.equals("<unknown>", ignoreCase = true)) "" else rawAlbum
                    val albumId = cursor.getLong(albumIdCol)
                    val artworkUri = if (albumId > 0) {
                        ContentUris.withAppendedId(ALBUM_ART_URI, albumId)
                    } else null

                    tracks.add(
                        SapiraTrack(
                            id = "audio-$id",
                            uri = contentUri,
                            title = rawTitle.ifEmpty { stripExtension(displayName).ifEmpty { "Audio Track" } },
                            artist = cleanArtist,
                            album = cleanAlbum,
                            durationMs = cursor.getLong(durCol),
                            sizeBytes = cursor.getLong(sizeCol),
                            ext = extractExtension(displayName).ifEmpty { "AUDIO" },
                            kind = MediaKind.AUDIO,
                            artworkUri = artworkUri
                        )
                    )
                }
            }
        }

        // 2. Scan On-Device Video
        val videoProjection = arrayOf(
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.TITLE,
            MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.SIZE,
            MediaStore.Video.Media.DISPLAY_NAME
        )

        runCatching {
            resolver.query(
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                videoProjection,
                "${MediaStore.Video.Media.DURATION} > 500",
                null,
                "${MediaStore.Video.Media.DATE_ADDED} DESC"
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
                val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.TITLE)
                val durCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DURATION)
                val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)

                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idCol)
                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                        id
                    )
                    val displayName = cursor.getString(nameCol) ?: ""
                    val rawTitle = cursor.getString(titleCol)?.trim().orEmpty()

                    tracks.add(
                        SapiraTrack(
                            id = "video-$id",
                            uri = contentUri,
                            title = rawTitle.ifEmpty { stripExtension(displayName).ifEmpty { "Video Clip" } },
                            durationMs = cursor.getLong(durCol),
                            sizeBytes = cursor.getLong(sizeCol),
                            ext = extractExtension(displayName).ifEmpty { "VIDEO" },
                            kind = MediaKind.VIDEO,
                            artworkUri = contentUri
                        )
                    )
                }
            }
        }

        tracks
    }

    fun trackFromPickedUri(context: Context, uri: Uri): SapiraTrack {
        val resolver = context.contentResolver
        var displayName = uri.lastPathSegment?.substringAfterLast('/') ?: "Media"
        var sizeBytes = 0L

        runCatching {
            resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)
                ?.use { c ->
                    if (c.moveToFirst()) {
                        val nameIdx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        val sizeIdx = c.getColumnIndex(OpenableColumns.SIZE)
                        if (nameIdx >= 0 && !c.isNull(nameIdx)) displayName = c.getString(nameIdx)
                        if (sizeIdx >= 0 && !c.isNull(sizeIdx)) sizeBytes = c.getLong(sizeIdx)
                    }
                }
        }

        val mime = resolver.getType(uri).orEmpty()
        val ext = extractExtension(displayName)
        val isVideo = mime.startsWith("video/") || ext in VIDEO_EXTS

        return SapiraTrack(
            id = "uri-${uri.hashCode()}-${System.nanoTime()}",
            uri = uri,
            title = stripExtension(displayName).ifEmpty { "Local Media" },
            sizeBytes = sizeBytes,
            ext = ext.ifEmpty { if (isVideo) "MP4" else "AUDIO" },
            kind = if (isVideo) MediaKind.VIDEO else MediaKind.AUDIO
        )
    }

    fun trackFromStreamUrl(rawUrl: String): SapiraTrack? {
        val trimmed = rawUrl.trim()
        if (!trimmed.startsWith("https://", ignoreCase = true) &&
            !trimmed.startsWith("http://", ignoreCase = true)
        ) {
            return null
        }
        val uri = runCatching { Uri.parse(trimmed) }.getOrNull() ?: return null
        val pathPart = uri.lastPathSegment.orEmpty()
        val ext = extractExtension(pathPart)
        val isVideo = ext == "M3U8" || ext in VIDEO_EXTS
        val host = uri.host ?: "Live Stream"
        val cleanName = stripExtension(pathPart).ifEmpty { host }

        return SapiraTrack(
            id = "stream-${trimmed.hashCode()}",
            uri = uri,
            title = cleanName,
            artist = host,
            ext = ext.ifEmpty { "STREAM" },
            kind = if (isVideo) MediaKind.VIDEO else MediaKind.AUDIO,
            isRemote = true
        )
    }

    suspend fun readTextFromUri(context: Context, uri: Uri): String? = withContext(Dispatchers.IO) {
        runCatching {
            context.contentResolver.openInputStream(uri)?.use { stream ->
                BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).readText()
            }
        }.getOrNull()
    }

    fun parseLrc(content: String, sourceLabel: String): ParsedLyrics {
        val syncedLines = mutableListOf<LyricLine>()
        val plainLines = mutableListOf<LyricLine>()

        for (rawLine in content.lines()) {
            val trimmed = rawLine.trim()
            if (trimmed.isEmpty()) continue
            val matches = LRC_REGEX.findAll(trimmed).toList()
            if (matches.isNotEmpty()) {
                val text = trimmed.replace(LRC_REGEX, "").trim()
                if (text.startsWith("ti:", true) || text.startsWith("ar:", true) || text.startsWith("al:", true)) {
                    continue
                }
                for (m in matches) {
                    val min = m.groupValues[1].toLongOrNull() ?: 0L
                    val sec = m.groupValues[2].toLongOrNull() ?: 0L
                    val fracStr = m.groupValues[3]
                    val ms = when (fracStr.length) {
                        1 -> (fracStr.toLongOrNull() ?: 0L) * 100L
                        2 -> (fracStr.toLongOrNull() ?: 0L) * 10L
                        3 -> fracStr.toLongOrNull() ?: 0L
                        else -> 0L
                    }
                    syncedLines.add(LyricLine(timeMs = min * 60_000L + sec * 1_000L + ms, text = text))
                }
            } else if (!trimmed.startsWith("[")) {
                plainLines.add(LyricLine(timeMs = plainLines.size * 4_000L, text = trimmed))
            }
        }

        return if (syncedLines.isNotEmpty()) {
            ParsedLyrics(
                lines = syncedLines.sortedBy { it.timeMs },
                synced = true,
                sourceLabel = sourceLabel
            )
        } else {
            ParsedLyrics(
                lines = plainLines,
                synced = false,
                sourceLabel = sourceLabel
            )
        }
    }

    suspend fun fetchOnlineLyrics(
        title: String,
        artist: String,
        durationMs: Long
    ): ParsedLyrics? = withContext(Dispatchers.IO) {
        runCatching {
            val qTitle = URLEncoder.encode(title, "UTF-8")
            val qArtist = URLEncoder.encode(artist, "UTF-8")
            val durParam = if (durationMs > 2_000L) "&duration=${durationMs / 1000L}" else ""
            val endpoint = if (artist.isNotBlank()) {
                "https://lrclib.net/api/get?track_name=$qTitle&artist_name=$qArtist$durParam"
            } else {
                "https://lrclib.net/api/search?q=$qTitle"
            }

            val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 7000
                readTimeout = 7000
                setRequestProperty("User-Agent", "SapiraMediaPlayer-Android/0.1.0 (https://github.com/ValentinBorsan/sapira-media-player)")
            }

            if (conn.responseCode !in 200..299) return@runCatching null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = if (body.trimStart().startsWith("[")) {
                val arr = org.json.JSONArray(body)
                if (arr.length() == 0) return@runCatching null
                arr.getJSONObject(0)
            } else {
                JSONObject(body)
            }

            val synced = json.optString("syncedLyrics", "").trim()
            val plain = json.optString("plainLyrics", "").trim()
            val labelArtist = json.optString("artistName", artist)
            val labelTrack = json.optString("trackName", title)
            val label = listOf(labelArtist, labelTrack).filter { it.isNotBlank() }.joinToString(" — ")

            when {
                synced.isNotEmpty() -> parseLrc(synced, label.ifEmpty { "LRCLIB" })
                plain.isNotEmpty() -> parseLrc(plain, label.ifEmpty { "LRCLIB" })
                else -> null
            }
        }.getOrNull()
    }

    private fun stripExtension(name: String): String {
        val dot = name.lastIndexOf('.')
        return if (dot > 0) name.substring(0, dot) else name
    }

    private fun extractExtension(name: String): String {
        val clean = name.substringBefore('?').substringBefore('#')
        val dot = clean.lastIndexOf('.')
        return if (dot >= 0 && dot < clean.length - 1) {
            clean.substring(dot + 1).uppercase()
        } else ""
    }

    private val VIDEO_EXTS = setOf(
        "MP4", "MKV", "WEBM", "MOV", "M4V", "AVI", "TS", "M2TS", "3GP", "FLV", "WMV"
    )
}

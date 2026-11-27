package org.sapira.mediaplayer.data

import android.content.SharedPreferences
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import org.sapira.mediaplayer.model.MediaKind
import org.sapira.mediaplayer.model.SapiraTrack

data class SavedPlaylist(val id: String, val name: String, val tracks: List<SapiraTrack>)

internal class PlaylistStore(private val prefs: SharedPreferences) {
    fun load(): List<SavedPlaylist> = runCatching {
        val saved = JSONArray(prefs.getString("playlists", "[]"))
        List(saved.length()) { index ->
            val entry = saved.getJSONObject(index)
            val tracks = entry.getJSONArray("tracks")
            SavedPlaylist(entry.getString("id"), entry.getString("name"), List(tracks.length()) {
                val track = tracks.getJSONObject(it)
                SapiraTrack(
                    id = track.getString("id"),
                    uri = Uri.parse(track.getString("uri")),
                    title = track.getString("title"),
                    artist = track.optString("artist"),
                    album = track.optString("album"),
                    durationMs = track.optLong("duration"),
                    sizeBytes = track.optLong("size"),
                    ext = track.optString("ext"),
                    kind = MediaKind.valueOf(track.getString("kind")),
                    artworkUri = track.optString("artwork").takeIf(String::isNotEmpty)?.let(Uri::parse),
                    folder = track.optString("folder"),
                    isRemote = track.optBoolean("remote"),
                    sourceUrl = track.optString("sourceUrl").takeIf(String::isNotEmpty)
                )
            })
        }
    }.getOrDefault(emptyList())

    fun save(playlists: List<SavedPlaylist>) {
        val entries = playlists.map { playlist ->
            JSONObject().put("id", playlist.id).put("name", playlist.name)
                .put("tracks", JSONArray(playlist.tracks.map { track ->
                    JSONObject().put("id", track.id)
                        .put("uri", track.sourceUrl ?: track.uri.toString())
                        .put("title", track.title).put("artist", track.artist).put("album", track.album)
                        .put("duration", track.durationMs).put("size", track.sizeBytes).put("ext", track.ext)
                        .put("kind", track.kind.name).put("artwork", track.artworkUri?.toString())
                        .put("folder", track.folder).put("remote", track.isRemote)
                        .put("sourceUrl", track.sourceUrl)
                }))
        }
        prefs.edit().putString("playlists", JSONArray(entries).toString()).apply()
    }
}

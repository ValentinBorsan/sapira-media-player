package org.sapira.mediaplayer.ui

import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.C
import androidx.media3.common.Tracks
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.withContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.sapira.mediaplayer.data.MediaRepository
import org.sapira.mediaplayer.data.PlaylistStore
import org.sapira.mediaplayer.data.SavedPlaylist
import org.sapira.mediaplayer.data.SubtitleTiming
import java.io.File
import java.util.UUID
import org.sapira.mediaplayer.model.EqPreset
import org.sapira.mediaplayer.model.LyricLine
import org.sapira.mediaplayer.model.MediaKind
import org.sapira.mediaplayer.model.SapiraLanguage
import org.sapira.mediaplayer.model.SapiraTheme
import org.sapira.mediaplayer.model.SapiraTrack
import org.sapira.mediaplayer.model.SleepTimerOption
import org.sapira.mediaplayer.model.VideoAspectMode
import org.sapira.mediaplayer.service.AudioFxEngine
import org.sapira.mediaplayer.service.SapiraMediaSourceFactory
import org.sapira.mediaplayer.service.SapiraPlaybackService
import org.sapira.mediaplayer.youtube.YouTubeLinks
import org.sapira.mediaplayer.youtube.YouTubeSupport

data class ResumePrompt(val title: String, val positionMs: Long)

data class SapiraUiState(
    val library: List<SapiraTrack> = emptyList(),
    val isScanningLibrary: Boolean = false,
    val queue: List<SapiraTrack> = emptyList(),
    val playlists: List<SavedPlaylist> = emptyList(),
    val currentIndex: Int = -1,
    val isPlaying: Boolean = false,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val shuffle: Boolean = false,
    val repeatMode: Int = Player.REPEAT_MODE_OFF,
    val playbackSpeed: Float = 1.0f,
    val tracks: Tracks = Tracks.EMPTY,
    val subtitlesEnabled: Boolean = true,
    val invalidSubtitleFile: Boolean = false,
    val subtitleOffsetMs: Long? = null,
    val resumePrompt: ResumePrompt? = null,
    val lyricsOpen: Boolean = false,
    val lyricsLoading: Boolean = false,
    val lyricLines: List<LyricLine> = emptyList(),
    val lyricsSynced: Boolean = false,
    val lyricsSource: String? = null,
    val eqEnabled: Boolean = true,
    val eqPreset: EqPreset = EqPreset.FLAT,
    val loudnessBoostPct: Int = 0,
    val sleepOption: SleepTimerOption = SleepTimerOption.OFF,
    val sleepRemainingSec: Long? = null,
    val aspectMode: VideoAspectMode = VideoAspectMode.FIT,
    val embeddedYouTubeId: String? = null,
    val isResolvingStream: Boolean = false,
    val streamError: String? = null,
    val theme: SapiraTheme = SapiraTheme.SAPPHIRE,
    val language: SapiraLanguage = SapiraLanguage.EN
) {
    val currentTrack: SapiraTrack?
        get() = queue.getOrNull(currentIndex)

    val activeLyricIndex: Int
        get() {
            if (!lyricsSynced || lyricLines.isEmpty()) return -1
            var active = -1
            for (i in lyricLines.indices) {
                if (positionMs + 120L >= lyricLines[i].timeMs) {
                    active = i
                } else {
                    break
                }
            }
            return active
        }
}

class SapiraViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = application.getSharedPreferences("sapira_prefs", Context.MODE_PRIVATE)

    private val positions = application.getSharedPreferences("sapira_positions", Context.MODE_PRIVATE)

    private fun resumePosition(track: SapiraTrack): Long {
        if (track.isRemote) return 0L
        val saved = positions.getLong(track.uri.toString(), 0L)
        return saved.takeIf { track.durationMs <= 0L || it < track.durationMs - 5_000L } ?: 0L
    }

    private val playlistStore = PlaylistStore(prefs)

    private val _uiState = MutableStateFlow(
        SapiraUiState(
            playlists = playlistStore.load(),
            theme = SapiraTheme.fromId(prefs.getString("theme", SapiraTheme.SAPPHIRE.id)),
            language = SapiraLanguage.fromCode(prefs.getString("lang", SapiraLanguage.EN.code)),
            eqPreset = EqPreset.fromId(prefs.getString("eq_preset", EqPreset.FLAT.id)),
            eqEnabled = prefs.getBoolean("eq_enabled", true),
            loudnessBoostPct = prefs.getInt("boost_pct", 0)
        )
    )
    val uiState: StateFlow<SapiraUiState> = _uiState.asStateFlow()

    private data class ExternalSubtitle(val trackId: String, val uri: Uri, val name: String, val mimeType: String)
    private var externalSubtitle: ExternalSubtitle? = null
    private var subtitleJob: Job? = null

    private var pendingPlayback: ((Long) -> Unit)? = null

    private var controllerFuture: ListenableFuture<MediaController>? = null
    var mediaController: MediaController? = null
        private set

    private var tickerJob: Job? = null
    private var sleepJob: Job? = null
    private var sleepDeadlineMs: Long? = null

    init {
        AudioFxEngine.updateEqualizer(_uiState.value.eqEnabled, _uiState.value.eqPreset.gainsDb)
        AudioFxEngine.updateLoudnessBoostPercent(_uiState.value.loudnessBoostPct)
        connectController()
    }

    private fun connectController() {
        val ctx = getApplication<Application>()
        val token = SessionToken(ctx, ComponentName(ctx, SapiraPlaybackService::class.java))
        val future = MediaController.Builder(ctx, token).buildAsync()
        controllerFuture = future

        future.addListener({
            val controller = runCatching { future.get() }.getOrNull() ?: return@addListener
            mediaController = controller
            _uiState.update { it.copy(tracks = controller.currentTracks) }
            controller.addListener(object : Player.Listener {
                override fun onTracksChanged(tracks: Tracks) {
                    _uiState.update { it.copy(tracks = tracks) }
                }

                override fun onTrackSelectionParametersChanged(parameters: androidx.media3.common.TrackSelectionParameters) {
                    _uiState.update { it.copy(subtitlesEnabled = C.TRACK_TYPE_TEXT !in parameters.disabledTrackTypes) }
                }

                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    _uiState.update { it.copy(isPlaying = isPlaying) }
                    if (isPlaying) startPositionTicker() else stopPositionTicker()
                }

                override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                    val idx = controller.currentMediaItemIndex
                    val dur = controller.duration.coerceAtLeast(0L)
                    if (_uiState.value.sleepOption.endOfTrack && reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO) {
                        controller.pause()
                        setSleepTimer(SleepTimerOption.OFF)
                    }
                    _uiState.update {
                        it.copy(
                            currentIndex = idx,
                            subtitleOffsetMs = if (mediaItem?.mediaId == externalSubtitle?.trackId) it.subtitleOffsetMs else null,
                            positionMs = controller.currentPosition.coerceAtLeast(0L),
                            durationMs = dur,
                            lyricLines = emptyList(),
                            lyricsSynced = false,
                            lyricsSource = null,
                            lyricsLoading = false
                        )
                    }
                }

                override fun onPlaybackStateChanged(playbackState: Int) {
                    val dur = controller.duration.coerceAtLeast(0L)
                    if (dur > 0) {
                        _uiState.update { it.copy(durationMs = dur) }
                    }
                    if (playbackState == Player.STATE_ENDED && _uiState.value.sleepOption.endOfTrack) {
                        setSleepTimer(SleepTimerOption.OFF)
                    }
                }
            })

            if (controller.isPlaying) {
                _uiState.update {
                    it.copy(
                        isPlaying = true,
                        positionMs = controller.currentPosition.coerceAtLeast(0L),
                        durationMs = controller.duration.coerceAtLeast(0L)
                    )
                }
                startPositionTicker()
            }
        }, MoreExecutors.directExecutor())
    }

    private fun startPositionTicker() {
        if (tickerJob?.isActive == true) return
        tickerJob = viewModelScope.launch {
            while (isActive) {
                val c = mediaController
                if (c != null) {
                    val pos = c.currentPosition.coerceAtLeast(0L)
                    val dur = c.duration.coerceAtLeast(_uiState.value.currentTrack?.durationMs ?: 0L)
                    _uiState.update { it.copy(positionMs = pos, durationMs = dur) }
                }
                delay(140L)
            }
        }
    }

    private fun stopPositionTicker() {
        tickerJob?.cancel()
        tickerJob = null
    }

    fun scanDeviceLibrary() {
        if (_uiState.value.isScanningLibrary) return
        _uiState.update { it.copy(isScanningLibrary = true) }
        viewModelScope.launch {
            val scanned = MediaRepository.scanDeviceMedia(getApplication())
            _uiState.update { it.copy(library = scanned, isScanningLibrary = false) }
        }
    }

    fun playTracks(tracks: List<SapiraTrack>, startIndex: Int = 0) {
        if (tracks.isEmpty()) return
        val safeStart = startIndex.coerceIn(0, tracks.lastIndex)
        requestPlayback(tracks[safeStart]) { position -> playTracksAt(tracks, safeStart, position) }
    }

    private fun requestPlayback(track: SapiraTrack, play: (Long) -> Unit) {
        val saved = resumePosition(track)
        if (saved > 0L) {
            pendingPlayback = play
            _uiState.update { it.copy(resumePrompt = ResumePrompt(track.title, saved)) }
        } else {
            resolveResumePrompt(null)
            play(0L)
        }
    }

    fun resolveResumePrompt(resume: Boolean?) {
        val position = _uiState.value.resumePrompt?.positionMs ?: 0L
        val play = pendingPlayback
        pendingPlayback = null
        _uiState.update { it.copy(resumePrompt = null) }
        if (resume != null) play?.invoke(if (resume) position else 0L)
    }

    private var streamResolveJob: Job? = null
    private val firstUrlRegex = Regex("""https?://\S+""", RegexOption.IGNORE_CASE)

    private fun playTracksAt(tracks: List<SapiraTrack>, safeStart: Int, position: Long) {
        val target = tracks[safeStart]
        // Re-resolve saved YouTube playlist items whose direct media URL was not persisted
        if (target.sourceUrl != null &&
            target.uri.toString() == target.sourceUrl &&
            YouTubeLinks.isYouTubeUrl(target.sourceUrl)
        ) {
            openNetworkStream(target.sourceUrl, audioOnly = target.kind == MediaKind.AUDIO)
            return
        }

        _uiState.update {
            it.copy(
                queue = tracks,
                currentIndex = safeStart,
                embeddedYouTubeId = null,
                subtitleOffsetMs = null,
                positionMs = position,
                durationMs = target.durationMs,
                lyricLines = emptyList(),
                lyricsSynced = false,
                lyricsSource = null
            )
        }
        externalSubtitle = null
        subtitleJob?.cancel()
        val items = tracks.map { it.toMediaItem() }
        mediaController?.apply {
            setMediaItems(items, safeStart, position)
            prepare()
            play()
        }
    }

    fun appendPickedUris(uris: List<Uri>, playImmediately: Boolean = true) {
        if (uris.isEmpty()) return
        val ctx = getApplication<Application>()
        val added = uris.map { MediaRepository.trackFromPickedUri(ctx, it) }
        val existing = _uiState.value.queue
        val combined = existing + added
        if (existing.isEmpty() || playImmediately) {
            playTracks(combined, existing.size)
        } else {
            _uiState.update { it.copy(queue = combined) }
            added.forEach { mediaController?.addMediaItem(it.toMediaItem()) }
        }
    }

    fun openNetworkStream(
        rawInput: String,
        audioOnly: Boolean = false,
        onSuccess: () -> Unit = {}
    ) {
        val extractedUrl = firstUrlRegex.find(rawInput.trim())?.value ?: rawInput.trim()
        if (extractedUrl.isBlank()) {
            _uiState.update { it.copy(streamError = "invalid") }
            return
        }

        if (YouTubeLinks.isYouTubeUrl(extractedUrl)) {
            if (!YouTubeSupport.NATIVE_PLAYBACK) {
                val videoId = YouTubeLinks.extractVideoId(extractedUrl)
                if (videoId == null) {
                    _uiState.update { it.copy(streamError = "invalid") }
                    return
                }
                mediaController?.pause()
                _uiState.update {
                    it.copy(
                        embeddedYouTubeId = videoId,
                        isResolvingStream = false,
                        streamError = null
                    )
                }
                onSuccess()
                return
            }

            streamResolveJob?.cancel()
            _uiState.update { it.copy(isResolvingStream = true, streamError = null) }
            val wantAudio = audioOnly || YouTubeLinks.isMusicUrl(extractedUrl)
            streamResolveJob = viewModelScope.launch {
                val resolved = YouTubeSupport.resolve(extractedUrl, audioOnly = wantAudio)
                resolved.fold(
                    onSuccess = { yt ->
                        val badge = when {
                            wantAudio -> "YT AUDIO"
                            yt.isLive -> "YT LIVE"
                            yt.height > 0 -> "YT ${yt.height}P"
                            else -> "YOUTUBE"
                        }
                        val track = SapiraTrack(
                            id = "yt-${yt.videoId}-${if (wantAudio) "a" else "v"}",
                            uri = Uri.parse(yt.mediaUrl),
                            title = yt.title,
                            artist = yt.author,
                            durationMs = yt.durationMs,
                            ext = badge,
                            kind = if (wantAudio) MediaKind.AUDIO else MediaKind.VIDEO,
                            artworkUri = yt.thumbnailUrl?.let(Uri::parse),
                            isRemote = true,
                            secondaryAudioUrl = yt.audioUrl,
                            mimeType = yt.mimeType,
                            dashManifestXml = yt.dashManifestXml,
                            sourceUrl = YouTubeLinks.canonicalWatchUrl(yt.videoId)
                        )
                        _uiState.update { it.copy(isResolvingStream = false, streamError = null) }
                        val nextQueue = _uiState.value.queue + track
                        playTracks(nextQueue, nextQueue.lastIndex)
                        onSuccess()
                    },
                    onFailure = { err ->
                        _uiState.update {
                            it.copy(
                                isResolvingStream = false,
                                streamError = err.message ?: "Unable to extract YouTube stream"
                            )
                        }
                    }
                )
            }
            return
        }

        val track = MediaRepository.trackFromStreamUrl(extractedUrl)
        if (track == null) {
            _uiState.update { it.copy(streamError = "invalid") }
            return
        }
        _uiState.update { it.copy(streamError = null, embeddedYouTubeId = null) }
        val nextQueue = _uiState.value.queue + track
        playTracks(nextQueue, nextQueue.lastIndex)
        onSuccess()
    }

    fun closeEmbeddedYouTube() {
        _uiState.update { it.copy(embeddedYouTubeId = null) }
    }

    fun clearStreamError() {
        if (_uiState.value.streamError != null) {
            _uiState.update { it.copy(streamError = null) }
        }
    }

    fun selectQueueIndex(index: Int) {
        val q = _uiState.value.queue
        if (index !in q.indices) return
        requestPlayback(q[index]) { position ->
            if (_uiState.value.queue != q) return@requestPlayback
            _uiState.update { it.copy(currentIndex = index, positionMs = position) }
            mediaController?.apply {
                seekTo(index, position)
                play()
            }
        }
    }

    fun saveQueueAsPlaylist(name: String) {
        val state = _uiState.value
        val title = name.trim()
        if (title.isEmpty() || state.queue.isEmpty()) return
        val playlist = SavedPlaylist(UUID.randomUUID().toString(), title, state.queue.toList())
        updatePlaylists(state.playlists + playlist)
    }

    fun deletePlaylist(id: String) {
        updatePlaylists(_uiState.value.playlists.filterNot { it.id == id })
    }

    fun movePlaylistTrack(id: String, from: Int, to: Int) {
        val playlists = _uiState.value.playlists
        val playlist = playlists.find { it.id == id } ?: return
        if (from == to || from !in playlist.tracks.indices || to !in playlist.tracks.indices) return
        val reordered = playlist.tracks.toMutableList()
        val track = reordered.removeAt(from)
        reordered.add(to, track)
        updatePlaylists(playlists.map { if (it.id == id) it.copy(tracks = reordered) else it })
    }

    private fun updatePlaylists(playlists: List<SavedPlaylist>) {
        playlistStore.save(playlists)
        _uiState.update { it.copy(playlists = playlists) }
    }

    fun clearQueue() {
        mediaController?.apply {
            stop()
            clearMediaItems()
        }
        _uiState.update {
            it.copy(
                queue = emptyList(),
                currentIndex = -1,
                isPlaying = false,
                positionMs = 0L,
                durationMs = 0L,
                lyricLines = emptyList(),
                lyricsSource = null
            )
        }
    }

    fun togglePlayPause() {
        val c = mediaController ?: return
        if (c.isPlaying) {
            c.pause()
        } else {
            if (c.playbackState == Player.STATE_ENDED) {
                c.seekTo(0L)
            }
            c.play()
        }
    }

    fun seekTo(positionMs: Long) {
        val clamped = positionMs.coerceAtLeast(0L)
        mediaController?.seekTo(clamped)
        _uiState.update { it.copy(positionMs = clamped) }
    }

    fun seekRelative(deltaMs: Long) {
        val c = mediaController ?: return
        val dur = c.duration.takeIf { it > 0 } ?: Long.MAX_VALUE
        val target = (c.currentPosition + deltaMs).coerceIn(0L, dur)
        seekTo(target)
    }

    fun skipNext() {
        val c = mediaController ?: return
        if (c.hasNextMediaItem()) {
            c.seekToNextMediaItem()
        } else if (_uiState.value.repeatMode == Player.REPEAT_MODE_ALL && c.mediaItemCount > 0) {
            c.seekToDefaultPosition(0)
        }
    }

    fun skipPrev() {
        val c = mediaController ?: return
        if (c.currentPosition > 3500L) {
            c.seekTo(0L)
        } else if (c.hasPreviousMediaItem()) {
            c.seekToPreviousMediaItem()
        }
    }

    fun toggleShuffle() {
        val next = !_uiState.value.shuffle
        mediaController?.shuffleModeEnabled = next
        _uiState.update { it.copy(shuffle = next) }
    }

    fun cycleRepeatMode() {
        val next = when (_uiState.value.repeatMode) {
            Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ALL
            Player.REPEAT_MODE_ALL -> Player.REPEAT_MODE_ONE
            else -> Player.REPEAT_MODE_OFF
        }
        mediaController?.repeatMode = next
        _uiState.update { it.copy(repeatMode = next) }
    }

    fun cyclePlaybackSpeed() {
        val speeds = listOf(0.75f, 1.0f, 1.25f, 1.5f, 2.0f)
        val cur = _uiState.value.playbackSpeed
        val idx = speeds.indexOfFirst { kotlin.math.abs(it - cur) < 0.05f }
        val next = speeds[(idx + 1) % speeds.size]
        mediaController?.playbackParameters = PlaybackParameters(next)
        _uiState.update { it.copy(playbackSpeed = next) }
    }

    fun cycleAspectMode() {
        val modes = VideoAspectMode.entries
        val next = modes[(_uiState.value.aspectMode.ordinal + 1) % modes.size]
        _uiState.update { it.copy(aspectMode = next) }
    }

    fun selectTrack(type: Int, group: Tracks.Group?, index: Int = 0, disable: Boolean = false) {
        val controller = mediaController ?: return
        if (group != null && group !in controller.currentTracks.groups) return
        val builder = controller.trackSelectionParameters.buildUpon()
            .clearOverridesOfType(type)
            .setTrackTypeDisabled(type, disable)
        if (group != null) builder.setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, index))
        controller.trackSelectionParameters = builder.build()
    }

    fun toggleLyrics() {
        _uiState.update { it.copy(lyricsOpen = !it.lyricsOpen) }
    }

    fun fetchOnlineLyrics() {
        val track = _uiState.value.currentTrack ?: return
        if (_uiState.value.lyricsLoading) return
        _uiState.update { it.copy(lyricsLoading = true, lyricsOpen = true) }
        viewModelScope.launch {
            val res = MediaRepository.fetchOnlineLyrics(
                title = track.title,
                artist = track.artist,
                durationMs = _uiState.value.durationMs.takeIf { it > 0 } ?: track.durationMs
            )
            _uiState.update {
                if (res != null && res.lines.isNotEmpty()) {
                    it.copy(
                        lyricsLoading = false,
                        lyricLines = res.lines,
                        lyricsSynced = res.synced,
                        lyricsSource = res.sourceLabel
                    )
                } else {
                    it.copy(lyricsLoading = false)
                }
            }
        }
    }

    fun loadLocalLrc(uri: Uri) {
        viewModelScope.launch {
            val content = MediaRepository.readTextFromUri(getApplication(), uri) ?: return@launch
            val name = uri.lastPathSegment?.substringAfterLast('/') ?: "Local .LRC"
            val parsed = MediaRepository.parseLrc(content, name)
            if (parsed.lines.isNotEmpty()) {
                _uiState.update {
                    it.copy(
                        lyricsOpen = true,
                        lyricLines = parsed.lines,
                        lyricsSynced = parsed.synced,
                        lyricsSource = parsed.sourceLabel
                    )
                }
            }
        }
    }

    fun setEqualizerPreset(preset: EqPreset, enabled: Boolean = _uiState.value.eqEnabled) {
        prefs.edit().putString("eq_preset", preset.id).putBoolean("eq_enabled", enabled).apply()
        AudioFxEngine.updateEqualizer(enabled, preset.gainsDb)
        _uiState.update { it.copy(eqPreset = preset, eqEnabled = enabled) }
    }

    fun setLoudnessBoost(percent: Int) {
        val clamped = percent.coerceIn(0, 100)
        prefs.edit().putInt("boost_pct", clamped).apply()
        AudioFxEngine.updateLoudnessBoostPercent(clamped)
        _uiState.update { it.copy(loudnessBoostPct = clamped) }
    }

    fun setSleepTimer(option: SleepTimerOption) {
        sleepJob?.cancel()
        sleepJob = null
        mediaController?.volume = 1f

        if (option == SleepTimerOption.OFF || option.endOfTrack) {
            sleepDeadlineMs = null
            _uiState.update { it.copy(sleepOption = option, sleepRemainingSec = null) }
            return
        }

        val deadline = System.currentTimeMillis() + option.minutes * 60_000L
        sleepDeadlineMs = deadline
        _uiState.update { it.copy(sleepOption = option, sleepRemainingSec = option.minutes * 60L) }

        sleepJob = viewModelScope.launch {
            while (isActive) {
                val remMs = deadline - System.currentTimeMillis()
                if (remMs <= 0L) {
                    mediaController?.pause()
                    mediaController?.volume = 1f
                    _uiState.update { it.copy(sleepOption = SleepTimerOption.OFF, sleepRemainingSec = null) }
                    break
                }
                if (remMs <= 10_000L) {
                    mediaController?.volume = (remMs / 10_000f).coerceIn(0.05f, 1f)
                }
                _uiState.update { it.copy(sleepRemainingSec = (remMs + 999L) / 1000L) }
                delay(500L)
            }
        }
    }

    fun setTheme(theme: SapiraTheme) {
        prefs.edit().putString("theme", theme.id).apply()
        _uiState.update { it.copy(theme = theme) }
    }

    fun setLanguage(lang: SapiraLanguage) {
        prefs.edit().putString("lang", lang.code).apply()
        _uiState.update { it.copy(language = lang) }
    }

    fun dismissSubtitleFileError() {
        _uiState.update { it.copy(invalidSubtitleFile = false) }
    }

    fun loadSubtitle(uri: Uri, trackId: String) {
        subtitleJob?.cancel()
        subtitleJob = viewModelScope.launch {
            val context = getApplication<Application>()
            val name = withContext(Dispatchers.IO) {
                runCatching {
                    context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
                        ?.use { if (it.moveToFirst()) it.getString(0) else null }
                }.getOrNull() ?: uri.lastPathSegment.orEmpty()
            }
            val track = _uiState.value.currentTrack?.takeIf { it.id == trackId && it.kind == MediaKind.VIDEO }
                ?: return@launch
            val mimeType = when (name.substringAfterLast('.').lowercase()) {
                "srt" -> MimeTypes.APPLICATION_SUBRIP
                "vtt" -> MimeTypes.TEXT_VTT
                else -> {
                    _uiState.update { it.copy(invalidSubtitleFile = true) }
                    return@launch
                }
            }
            val source = ExternalSubtitle(trackId, uri, name, mimeType)
            if (applySubtitle(track, source, uri)) {
                externalSubtitle = source
                _uiState.update { it.copy(subtitleOffsetMs = 0L) }
            }
        }
    }

    fun changeSubtitleOffset(deltaMs: Long) {
        val state = _uiState.value
        val track = state.currentTrack ?: return
        val source = externalSubtitle?.takeIf { it.trackId == track.id } ?: return
        val currentOffset = state.subtitleOffsetMs ?: return
        val offset = if (deltaMs == 0L) 0L else (currentOffset + deltaMs).coerceIn(-30_000L, 30_000L)
        if (offset == currentOffset) return
        subtitleJob?.cancel()
        subtitleJob = viewModelScope.launch {
            val uri = if (offset == 0L) source.uri else withContext(Dispatchers.IO) {
                runCatching {
                    val context = getApplication<Application>()
                    val content = context.contentResolver.openInputStream(source.uri)?.bufferedReader()?.use { reader ->
                        val buffer = CharArray(8192)
                        val result = StringBuilder()
                        while (true) {
                            val count = reader.read(buffer)
                            if (count == -1) break
                            if (result.length + count > 2_000_000) return@use null
                            result.append(buffer, 0, count)
                        }
                        result.toString()
                    } ?: return@runCatching null
                    val isSrt = source.mimeType == MimeTypes.APPLICATION_SUBRIP
                    val shifted = SubtitleTiming.shift(content, offset, if (isSrt) ',' else '.')
                    val key = UUID.nameUUIDFromBytes(shifted.toByteArray())
                    val extension = if (isSrt) "srt" else "vtt"
                    val file = File(context.cacheDir, "subtitle-$key.$extension")
                    if (!file.exists()) file.writeText(shifted)
                    Uri.fromFile(file)
                }.getOrNull()
            }
            if (uri == null) {
                _uiState.update { it.copy(invalidSubtitleFile = true) }
                return@launch
            }
            if (externalSubtitle == source && applySubtitle(track, source, uri)) {
                _uiState.update { it.copy(subtitleOffsetMs = offset) }
            }
        }
    }

    private fun applySubtitle(track: SapiraTrack, source: ExternalSubtitle, uri: Uri): Boolean {
        val player = mediaController ?: return false
        if (player.currentMediaItem?.mediaId != track.id) return false
        val index = player.currentMediaItemIndex
        val position = player.currentPosition
        val subtitle = MediaItem.SubtitleConfiguration.Builder(uri)
            .setMimeType(source.mimeType)
            .setLabel(source.name)
            .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
            .build()
        val item = track.toMediaItem().buildUpon()
            .setSubtitleConfigurations(listOf(subtitle))
            .build()
        selectTrack(C.TRACK_TYPE_TEXT, null)
        player.replaceMediaItem(index, item)
        player.seekTo(index, position)
        return true
    }

    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    private fun SapiraTrack.toMediaItem(): MediaItem {
        val metaBuilder = MediaMetadata.Builder()
            .setTitle(title)
            .setArtist(artist.ifBlank { null })
            .setAlbumTitle(album.ifBlank { null })
        if (artworkUri != null && (kind == MediaKind.AUDIO || isRemote)) {
            metaBuilder.setArtworkUri(artworkUri)
        }
        val builder = MediaItem.Builder()
            .setMediaId(id)
            .setUri(uri)
            .setMediaMetadata(metaBuilder.build())
        if (!mimeType.isNullOrBlank()) {
            builder.setMimeType(mimeType)
        }
        if (!secondaryAudioUrl.isNullOrBlank() || !dashManifestXml.isNullOrBlank()) {
            val extras = Bundle().apply {
                if (!secondaryAudioUrl.isNullOrBlank()) {
                    putString(SapiraMediaSourceFactory.EXTRA_AUDIO_URL, secondaryAudioUrl)
                }
                if (!dashManifestXml.isNullOrBlank()) {
                    putString(SapiraMediaSourceFactory.EXTRA_DASH_MPD, dashManifestXml)
                }
            }
            builder.setRequestMetadata(
                MediaItem.RequestMetadata.Builder()
                    .setExtras(extras)
                    .build()
            )
        }
        return builder.build()
    }

    override fun onCleared() {
        stopPositionTicker()
        sleepJob?.cancel()
        controllerFuture?.let { MediaController.releaseFuture(it) }
        super.onCleared()
    }
}

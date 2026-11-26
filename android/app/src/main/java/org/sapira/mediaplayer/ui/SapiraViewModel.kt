package org.sapira.mediaplayer.ui

import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.sapira.mediaplayer.data.MediaRepository
import org.sapira.mediaplayer.model.EqPreset
import org.sapira.mediaplayer.model.LyricLine
import org.sapira.mediaplayer.model.MediaKind
import org.sapira.mediaplayer.model.SapiraLanguage
import org.sapira.mediaplayer.model.SapiraTheme
import org.sapira.mediaplayer.model.SapiraTrack
import org.sapira.mediaplayer.model.SleepTimerOption
import org.sapira.mediaplayer.model.VideoAspectMode
import org.sapira.mediaplayer.service.AudioFxEngine
import org.sapira.mediaplayer.service.SapiraPlaybackService

data class SapiraUiState(
    val library: List<SapiraTrack> = emptyList(),
    val isScanningLibrary: Boolean = false,
    val queue: List<SapiraTrack> = emptyList(),
    val currentIndex: Int = -1,
    val isPlaying: Boolean = false,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val shuffle: Boolean = false,
    val repeatMode: Int = Player.REPEAT_MODE_OFF,
    val playbackSpeed: Float = 1.0f,
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

    private val _uiState = MutableStateFlow(
        SapiraUiState(
            theme = SapiraTheme.fromId(prefs.getString("theme", SapiraTheme.SAPPHIRE.id)),
            language = SapiraLanguage.fromCode(prefs.getString("lang", SapiraLanguage.EN.code)),
            eqPreset = EqPreset.fromId(prefs.getString("eq_preset", EqPreset.FLAT.id)),
            eqEnabled = prefs.getBoolean("eq_enabled", true),
            loudnessBoostPct = prefs.getInt("boost_pct", 0)
        )
    )
    val uiState: StateFlow<SapiraUiState> = _uiState.asStateFlow()

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
            controller.addListener(object : Player.Listener {
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
        _uiState.update {
            it.copy(
                queue = tracks,
                currentIndex = safeStart,
                positionMs = 0L,
                durationMs = tracks[safeStart].durationMs,
                lyricLines = emptyList(),
                lyricsSynced = false,
                lyricsSource = null
            )
        }
        val items = tracks.map { it.toMediaItem() }
        mediaController?.apply {
            setMediaItems(items, safeStart, 0L)
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

    fun openNetworkStream(rawUrl: String): Boolean {
        val track = MediaRepository.trackFromStreamUrl(rawUrl) ?: return false
        val nextQueue = _uiState.value.queue + track
        playTracks(nextQueue, nextQueue.lastIndex)
        return true
    }

    fun selectQueueIndex(index: Int) {
        val q = _uiState.value.queue
        if (index !in q.indices) return
        _uiState.update { it.copy(currentIndex = index, positionMs = 0L) }
        mediaController?.apply {
            seekToDefaultPosition(index)
            play()
        }
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

    private fun SapiraTrack.toMediaItem(): MediaItem {
        val metaBuilder = MediaMetadata.Builder()
            .setTitle(title)
            .setArtist(artist.ifBlank { null })
            .setAlbumTitle(album.ifBlank { null })
        if (artworkUri != null && kind == MediaKind.AUDIO) {
            metaBuilder.setArtworkUri(artworkUri)
        }
        return MediaItem.Builder()
            .setMediaId(id)
            .setUri(uri)
            .setMediaMetadata(metaBuilder.build())
            .build()
    }

    override fun onCleared() {
        stopPositionTicker()
        sleepJob?.cancel()
        controllerFuture?.let { MediaController.releaseFuture(it) }
        super.onCleared()
    }
}

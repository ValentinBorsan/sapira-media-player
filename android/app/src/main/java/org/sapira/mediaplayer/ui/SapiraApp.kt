package org.sapira.mediaplayer.ui

import android.app.Activity
import android.content.Context
import android.media.AudioManager
import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.QueueMusic
import androidx.compose.material.icons.rounded.Album
import androidx.compose.material.icons.rounded.AspectRatio
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Equalizer
import androidx.compose.material.icons.rounded.FolderOpen
import androidx.compose.material.icons.rounded.Forward10
import androidx.compose.material.icons.rounded.GraphicEq
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.LibraryMusic
import androidx.compose.material.icons.rounded.Lyrics
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.LockOpen
import androidx.compose.material.icons.rounded.DragHandle
import androidx.compose.material.icons.rounded.Movie
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.Fullscreen
import androidx.compose.material.icons.rounded.FullscreenExit
import androidx.compose.material.icons.rounded.Subtitles
import androidx.compose.material.icons.rounded.PictureInPictureAlt
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.RepeatOne
import androidx.compose.material.icons.rounded.Replay10
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.SkipPrevious
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.Tracks
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import org.sapira.mediaplayer.data.SavedPlaylist
import org.sapira.mediaplayer.model.EqPreset
import org.sapira.mediaplayer.model.MediaKind
import org.sapira.mediaplayer.model.SapiraI18n
import org.sapira.mediaplayer.model.SapiraStrings
import org.sapira.mediaplayer.model.SapiraLanguage
import org.sapira.mediaplayer.model.SapiraTheme
import org.sapira.mediaplayer.model.SapiraTrack
import org.sapira.mediaplayer.model.SleepTimerOption
import org.sapira.mediaplayer.model.VideoAspectMode
import org.sapira.mediaplayer.ui.components.PrismAudioCore
import org.sapira.mediaplayer.ui.components.SapiraEmblemCanvas
import org.sapira.mediaplayer.ui.components.YouTubeEmbedStage
import org.sapira.mediaplayer.youtube.YouTubeLinks
import org.sapira.mediaplayer.youtube.YouTubeSupport
import kotlin.math.abs

private enum class NavSection { STAGE, LIBRARY, QUEUE }

private val ObsidianBg = Color(0xFF04050A)
private val GlassSurface = Color(0xCC0A0E1C)
private val GlassBorder = Color(0x2894B8FF)
private val MutedText = Color(0xFF8E9BB8)

@androidx.annotation.OptIn(UnstableApi::class)
@kotlin.OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SapiraApp(
    viewModel: SapiraViewModel,
    hasMediaPermission: Boolean,
    inPipMode: Boolean,
    onRequestMediaPermission: () -> Unit,
    onPickMediaFiles: () -> Unit,
    onPickLrcFile: () -> Unit,
    onPickSubtitleFile: (String) -> Unit,
    onEnterPip: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val t = SapiraI18n.strings(state.language)
    val theme = state.theme
    val currentTrack = state.currentTrack

    var section by remember { mutableStateOf(NavSection.STAGE) }
    var settingsSheetOpen by remember { mutableStateOf(false) }
    var streamModalOpen by remember { mutableStateOf(false) }
    var streamUrlInput by remember { mutableStateOf("") }

    var fullscreen by remember { mutableStateOf(false) }
    val hasVideo = currentTrack?.kind == MediaKind.VIDEO
    val fullscreenActive = fullscreen && hasVideo && !inPipMode
    val view = LocalView.current
    var trackPickerOpen by remember(currentTrack?.id) { mutableStateOf(false) }

    if (!inPipMode && currentTrack?.kind == MediaKind.VIDEO) {
        if (trackPickerOpen) {
            VideoTrackPicker(
                state = state,
                strings = t,
                onSelect = viewModel::selectTrack,
                onAdjustSubtitleOffset = viewModel::changeSubtitleOffset,
                onPickFile = {
                    trackPickerOpen = false
                    onPickSubtitleFile(currentTrack.id)
                },
                onDismiss = { trackPickerOpen = false }
            )
        }
        if (state.invalidSubtitleFile) {
            AlertDialog(
                onDismissRequest = viewModel::dismissSubtitleFileError,
                text = { Text(t.unsupportedSubtitleFile) },
                confirmButton = {
                    TextButton(onClick = viewModel::dismissSubtitleFileError) { Text("OK") }
                }
            )
        }
    }


    if (!inPipMode) {
        state.resumePrompt?.let { prompt ->
            AlertDialog(
                onDismissRequest = { viewModel.resolveResumePrompt(null) },
                title = { Text(t.resumePlayback) },
                text = { Text("${prompt.title} · ${formatDurationMs(prompt.positionMs)}") },
                confirmButton = {
                    TextButton(onClick = { viewModel.resolveResumePrompt(true) }) { Text(t.resumePlayback) }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.resolveResumePrompt(false) }) { Text(t.startOver) }
                }
            )
        }
    }

    LaunchedEffect(hasVideo) {
        if (!hasVideo) fullscreen = false
    }

    if (fullscreenActive) {
        BackHandler { fullscreen = false }
        DisposableEffect(view) {
            val window = (view.context as? Activity)?.window
            val controller = window?.let { WindowCompat.getInsetsController(it, view) }
            val previousBehavior = controller?.systemBarsBehavior
            controller?.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller?.hide(WindowInsetsCompat.Type.systemBars())
            onDispose {
                controller?.show(WindowInsetsCompat.Type.systemBars())
                if (previousBehavior != null) controller.systemBarsBehavior = previousBehavior
            }
        }
        VideoStage(
            player = viewModel.mediaController,
            aspectMode = state.aspectMode,
            fullscreen = true,
            fullscreenLabel = t.exitFullscreen,
            lockLabel = t.lockControls,
            unlockLabel = t.unlockControls,
            trackPickerLabel = t.trackPicker,
            onOpenTrackPicker = { trackPickerOpen = true },
            onToggleFullscreen = { fullscreen = false },
            onCycleAspect = viewModel::cycleAspectMode,
            onEnterPip = onEnterPip
        )
        return
    }

    // Picture-in-Picture minimal video surface
    if (inPipMode && currentTrack?.kind == MediaKind.VIDEO) {
        Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        useController = false
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        player = viewModel.mediaController
                    }
                },
                onRelease = { it.player = null },
                update = { pv -> pv.player = viewModel.mediaController },
                modifier = Modifier.fillMaxSize()
            )
        }
        return
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ObsidianBg)
    ) {
        // Ambient blurred cover aura when playing audio
        if (currentTrack?.artworkUri != null && currentTrack.kind == MediaKind.AUDIO) {
            AsyncImage(
                model = currentTrack.artworkUri,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                alpha = 0.22f,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(48.dp)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            // Top Sapira Prism Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SapiraEmblemCanvas(theme = theme, size = 24.dp)
                    Spacer(Modifier.width(9.dp))
                    Text(
                        text = "SAPIRA",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 2.5.sp
                    )
                    if (currentTrack != null) {
                        Spacer(Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(99.dp))
                                .background(theme.c1.copy(alpha = 0.20f))
                                .border(1.dp, theme.c0.copy(alpha = 0.35f), RoundedCornerShape(99.dp))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = currentTrack.ext,
                                color = theme.c0,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onPickMediaFiles) {
                        Icon(Icons.Rounded.FolderOpen, contentDescription = t.openFiles, tint = Color.White)
                    }
                    IconButton(onClick = { streamModalOpen = true }) {
                        Icon(Icons.Rounded.Language, contentDescription = t.openStream, tint = Color.White)
                    }
                    IconButton(onClick = { settingsSheetOpen = true }) {
                        Icon(Icons.Rounded.Tune, contentDescription = t.settingsTitle, tint = theme.c0)
                    }
                }
            }

            // Main Section Body
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                when (section) {
                    NavSection.STAGE -> StageScreen(
                        state = state,
                        onOpenFiles = onPickMediaFiles,
                        onOpenStream = { streamModalOpen = true },
                        onOpenLibrary = { section = NavSection.LIBRARY },
                        onSeek = viewModel::seekTo,
                        onFetchOnlineLyrics = viewModel::fetchOnlineLyrics,
                        onPickLrcFile = onPickLrcFile,
                        onCloseLyrics = viewModel::toggleLyrics,
                        onCloseEmbeddedYouTube = viewModel::closeEmbeddedYouTube,
                        onCycleAspect = viewModel::cycleAspectMode,
                        onEnterPip = onEnterPip,
                        onEnterFullscreen = { fullscreen = true },
                        onOpenTrackPicker = { trackPickerOpen = true },
                        mediaController = viewModel.mediaController
                    )

                    NavSection.LIBRARY -> LibraryScreen(
                        state = state,
                        hasPermission = hasMediaPermission,
                        onRequestPermission = onRequestMediaPermission,
                        onRefresh = viewModel::scanDeviceLibrary,
                        onOpenFiles = onPickMediaFiles,
                        onPlayTrackList = { list, idx ->
                            viewModel.playTracks(list, idx)
                            section = NavSection.STAGE
                        }
                    )

                    NavSection.QUEUE -> QueueScreen(
                        state = state,
                        onSelectIndex = { idx ->
                            viewModel.selectQueueIndex(idx)
                            section = NavSection.STAGE
                        },
                        onClear = viewModel::clearQueue,
                        onSelectSleep = viewModel::setSleepTimer,
                        onSavePlaylist = viewModel::saveQueueAsPlaylist,
                        onDeletePlaylist = viewModel::deletePlaylist,
                        onMovePlaylistTrack = viewModel::movePlaylistTrack,
                        onPlayPlaylist = { playlist, index ->
                            viewModel.playTracks(playlist.tracks, index)
                            section = NavSection.STAGE
                        }
                    )
                }
            }

            // Floating Prism Player Dock (when a track is loaded and not showing embedded YouTube)
            if (currentTrack != null && state.embeddedYouTubeId == null) {
                PrismPlayerDock(
                    state = state,
                    onTogglePlay = viewModel::togglePlayPause,
                    onPrev = viewModel::skipPrev,
                    onNext = viewModel::skipNext,
                    onReplay10 = { viewModel.seekRelative(-10_000L) },
                    onForward10 = { viewModel.seekRelative(10_000L) },
                    onSeek = viewModel::seekTo,
                    onToggleShuffle = viewModel::toggleShuffle,
                    onCycleRepeat = viewModel::cycleRepeatMode,
                    onToggleLyrics = {
                        section = NavSection.STAGE
                        viewModel.toggleLyrics()
                    },
                    onCycleSpeed = viewModel::cyclePlaybackSpeed
                )
            }

            // Sleek Bottom Section Switcher
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                NavPill(
                    selected = section == NavSection.STAGE,
                    icon = Icons.Rounded.GraphicEq,
                    label = t.stageTab,
                    theme = theme,
                    onClick = { section = NavSection.STAGE }
                )
                NavPill(
                    selected = section == NavSection.LIBRARY,
                    icon = Icons.Rounded.LibraryMusic,
                    label = t.libraryTab,
                    theme = theme,
                    onClick = { section = NavSection.LIBRARY }
                )
                NavPill(
                    selected = section == NavSection.QUEUE,
                    icon = Icons.AutoMirrored.Rounded.QueueMusic,
                    label = if (state.queue.isNotEmpty()) "${t.queueTab} (${state.queue.size})" else t.queueTab,
                    theme = theme,
                    onClick = { section = NavSection.QUEUE }
                )
            }
        }
    }

    // YouTube & Network Stream URL Modal
    if (streamModalOpen) {
        var streamAudioOnly by remember { mutableStateOf(false) }
        val isYtInput = remember(streamUrlInput) { YouTubeLinks.isYouTubeUrl(streamUrlInput) }
        val errorMessage = when (state.streamError) {
            null -> null
            "invalid" -> t.invalidStreamUrl
            else -> state.streamError
        }

        AlertDialog(
            onDismissRequest = {
                if (!state.isResolvingStream) {
                    viewModel.clearStreamError()
                    streamModalOpen = false
                }
            },
            containerColor = Color(0xFF0B1020),
            titleContentColor = Color.White,
            textContentColor = MutedText,
            title = { Text(t.streamDialogTitle, fontWeight = FontWeight.SemiBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = streamUrlInput,
                        onValueChange = {
                            streamUrlInput = it
                            viewModel.clearStreamError()
                        },
                        enabled = !state.isResolvingStream,
                        isError = errorMessage != null,
                        supportingText = {
                            if (errorMessage != null) {
                                Text(errorMessage)
                            } else if (state.isResolvingStream) {
                                Text(t.resolvingStream, color = theme.c0)
                            }
                        },
                        placeholder = { Text(t.streamUrlHint, color = MutedText) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (YouTubeSupport.NATIVE_PLAYBACK && (isYtInput || streamUrlInput.isBlank())) {
                        FilterChip(
                            selected = streamAudioOnly,
                            onClick = { streamAudioOnly = !streamAudioOnly },
                            leadingIcon = {
                                Icon(
                                    imageVector = if (streamAudioOnly) Icons.Rounded.MusicNote else Icons.Rounded.Movie,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                            },
                            label = { Text(t.streamAudioOnly, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = theme.c1.copy(alpha = 0.28f)
                            )
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    enabled = !state.isResolvingStream,
                    onClick = {
                        viewModel.openNetworkStream(
                            rawInput = streamUrlInput,
                            audioOnly = streamAudioOnly,
                            onSuccess = {
                                streamUrlInput = ""
                                streamModalOpen = false
                                section = NavSection.STAGE
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = theme.c1)
                ) {
                    if (state.isResolvingStream) {
                        CircularProgressIndicator(
                            color = Color.White,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(t.playNow, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(
                    enabled = !state.isResolvingStream,
                    onClick = {
                        viewModel.clearStreamError()
                        streamModalOpen = false
                    }
                ) {
                    Text(t.cancel, color = MutedText)
                }
            }
        )
    }

    // Audio FX (Equalizer + Loudness Boost) & Settings Bottom Sheet
    if (settingsSheetOpen) {
        ModalBottomSheet(
            onDismissRequest = { settingsSheetOpen = false },
            containerColor = Color(0xFF0A0F1E),
            contentColor = Color.White
        ) {
            SettingsSheetContent(
                state = state,
                onSelectPreset = { p -> viewModel.setEqualizerPreset(p, state.eqEnabled) },
                onToggleEq = { en -> viewModel.setEqualizerPreset(state.eqPreset, en) },
                onBoostChange = viewModel::setLoudnessBoost,
                onSelectTheme = viewModel::setTheme,
                onSelectLang = viewModel::setLanguage
            )
        }
    }
}

@OptIn(UnstableApi::class)
@Composable
private fun StageScreen(
    state: SapiraUiState,
    onOpenFiles: () -> Unit,
    onOpenStream: () -> Unit,
    onOpenLibrary: () -> Unit,
    onSeek: (Long) -> Unit,
    onFetchOnlineLyrics: () -> Unit,
    onPickLrcFile: () -> Unit,
    onCloseLyrics: () -> Unit,
    onCloseEmbeddedYouTube: () -> Unit,
    onCycleAspect: () -> Unit,
    onEnterPip: () -> Unit,
    onEnterFullscreen: () -> Unit,
    onOpenTrackPicker: () -> Unit,
    mediaController: Player?
) {
    val t = SapiraI18n.strings(state.language)
    val track = state.currentTrack
    val theme = state.theme

    if (state.embeddedYouTubeId != null) {
        YouTubeEmbedStage(
            videoId = state.embeddedYouTubeId,
            theme = theme,
            note = t.youtubeEmbedNote,
            onClose = onCloseEmbeddedYouTube
        )
        return
    }

    if (track == null) {
        // Empty Sanctuary Stage
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            PrismAudioCore(
                isPlaying = false,
                artworkUri = null,
                theme = theme,
                size = 210.dp
            )
            Spacer(Modifier.height(18.dp))
            Text(
                text = t.emptyTitle,
                color = Color.White,
                fontSize = 21.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 3.sp
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = t.emptySubtitle,
                color = MutedText,
                fontSize = 13.5.sp,
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )
            Spacer(Modifier.height(22.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onOpenFiles,
                    shape = RoundedCornerShape(99.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = theme.c1)
                ) {
                    Icon(Icons.Rounded.FolderOpen, contentDescription = null, modifier = Modifier.size(17.dp))
                    Spacer(Modifier.width(7.dp))
                    Text(t.openFiles, color = Color.White)
                }
                OutlinedButton(
                    onClick = onOpenLibrary,
                    shape = RoundedCornerShape(99.dp)
                ) {
                    Icon(Icons.Rounded.LibraryMusic, contentDescription = null, tint = theme.c0, modifier = Modifier.size(17.dp))
                    Spacer(Modifier.width(7.dp))
                    Text(t.libraryTab, color = Color.White)
                }
            }
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onOpenStream) {
                Icon(Icons.Rounded.Language, contentDescription = null, tint = MutedText, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(6.dp))
                Text(t.openStream, color = MutedText, fontSize = 12.5.sp)
            }
        }
        return
    }

    // Video Cinema Stage
    if (track.kind == MediaKind.VIDEO) {
        VideoStage(
            player = mediaController,
            aspectMode = state.aspectMode,
            fullscreen = false,
            fullscreenLabel = t.enterFullscreen,
            trackPickerLabel = t.trackPicker,
            onOpenTrackPicker = onOpenTrackPicker,
            onToggleFullscreen = onEnterFullscreen,
            onCycleAspect = onCycleAspect,
            onEnterPip = onEnterPip
        )
        return
    }

    // Audio Stage + Integrated Synchronized Lyrics View
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (!state.lyricsOpen) {
            Spacer(Modifier.weight(0.5f))
            Text(
                text = if (state.isPlaying) t.signalActive else t.signalStandby,
                color = theme.c0.copy(alpha = 0.72f),
                fontSize = 10.sp,
                fontFamily = FontFamily.Monospace,
                letterSpacing = 2.sp
            )
            Spacer(Modifier.height(10.dp))
            PrismAudioCore(
                isPlaying = state.isPlaying,
                artworkUri = track.artworkUri,
                theme = theme,
                size = 264.dp
            )
            Spacer(Modifier.height(18.dp))
            Text(
                text = track.title,
                color = Color.White,
                fontSize = 21.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (track.artist.isNotBlank() || track.album.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = listOf(track.artist, track.album).filter { it.isNotBlank() }.joinToString(" · "),
                    color = MutedText,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(Modifier.weight(0.5f))
        } else {
            // Integrated Split-Stage Compact Header + Apple-Music-Style Flowing Lyrics
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                PrismAudioCore(
                    isPlaying = state.isPlaying,
                    artworkUri = track.artworkUri,
                    theme = theme,
                    size = 64.dp
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = track.title,
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (track.artist.isNotBlank()) {
                        Text(
                            text = track.artist,
                            color = MutedText,
                            fontSize = 12.5.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            IntegratedLyricsPane(
                state = state,
                onSeek = onSeek,
                onFetchOnline = onFetchOnlineLyrics,
                onPickLrc = onPickLrcFile,
                onClose = onCloseLyrics,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            )
        }
    }
}


@OptIn(UnstableApi::class)
@Composable
private fun VideoStage(
    player: Player?,
    aspectMode: VideoAspectMode,
    fullscreen: Boolean,
    fullscreenLabel: String,
    trackPickerLabel: String,
    lockLabel: String = "",
    unlockLabel: String = "",
    onOpenTrackPicker: () -> Unit,
    onToggleFullscreen: () -> Unit,
    onCycleAspect: () -> Unit,
    onEnterPip: () -> Unit
) {
    val view = LocalView.current
    val window = (view.context as? Activity)?.window
    val audio = remember(view) { view.context.getSystemService(Context.AUDIO_SERVICE) as AudioManager }
    var locked by remember { mutableStateOf(false) }
    var playerView by remember { mutableStateOf<PlayerView?>(null) }
    val currentPlayer by rememberUpdatedState(player)
    val frame = Modifier.fillMaxSize()
    if (fullscreen) {
        DisposableEffect(window) {
            val brightness = window?.attributes?.screenBrightness
            onDispose {
                if (window != null && brightness != null) {
                    window.attributes = window.attributes.apply { screenBrightness = brightness }
                }
            }
        }
        BackHandler(locked) { locked = false }
    }
    val videoFrame = if (fullscreen) frame else frame
        .padding(horizontal = 12.dp, vertical = 6.dp)
        .clip(RoundedCornerShape(22.dp))
        .border(1.dp, GlassBorder, RoundedCornerShape(22.dp))

    Box(modifier = videoFrame.background(Color.Black)) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    useController = fullscreen
                    keepScreenOn = true
                    this.player = player
                    playerView = this
                }
            },
            onRelease = { it.player = null },
            update = { pv ->
                pv.player = player
                pv.useController = fullscreen && !locked
                pv.resizeMode = when (aspectMode) {
                    VideoAspectMode.FIT -> AspectRatioFrameLayout.RESIZE_MODE_FIT
                    VideoAspectMode.FILL -> AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                    VideoAspectMode.STRETCH -> AspectRatioFrameLayout.RESIZE_MODE_FILL
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        if (fullscreen && !locked) {
            Box(
                Modifier.align(Alignment.Center)
                    .fillMaxWidth()
                    .fillMaxHeight(0.60f)
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onTap = {
                                playerView?.let { if (it.isControllerFullyVisible) it.hideController() else it.showController() }
                            },
                            onDoubleTap = { tap ->
                                currentPlayer?.let { media ->
                                    if (media.isCurrentMediaItemSeekable) {
                                        val delta = if (tap.x < size.width / 2) -10_000L else 10_000L
                                        media.seekTo((media.currentPosition + delta).coerceIn(0L, media.duration.takeIf { it > 0 } ?: Long.MAX_VALUE))
                                    }
                                }
                            }
                        )
                    }
                    .pointerInput(window, audio) {
                        var brightnessGesture = false
                        var level = 0f
                        val maxVolume = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
                        detectVerticalDragGestures(
                            onDragStart = { point ->
                                brightnessGesture = point.x < size.width / 2
                                level = if (brightnessGesture) {
                                    window?.attributes?.screenBrightness?.takeIf { it >= 0f } ?: 0.5f
                                } else {
                                    audio.getStreamVolume(AudioManager.STREAM_MUSIC).toFloat() / maxVolume
                                }
                            }
                        ) { _, delta ->
                            level = (level - delta / size.height.coerceAtLeast(1)).coerceIn(0f, 1f)
                            if (brightnessGesture && window != null) {
                                window.attributes = window.attributes.apply { screenBrightness = level.coerceAtLeast(0.05f) }
                            } else if (!brightnessGesture) {
                                val volume = kotlin.math.round(level * maxVolume).toInt()
                                if (volume != audio.getStreamVolume(AudioManager.STREAM_MUSIC)) {
                                    audio.setStreamVolume(AudioManager.STREAM_MUSIC, volume, 0)
                                }
                            }
                        }
                    }
            )
        }
        Row(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (fullscreen) {
                IconButton(
                    onClick = { locked = !locked },
                    modifier = Modifier.background(Color(0xAA080C18), CircleShape)
                ) {
                    Icon(
                        if (locked) Icons.Rounded.Lock else Icons.Rounded.LockOpen,
                        contentDescription = if (locked) unlockLabel else lockLabel,
                        tint = Color.White
                    )
                }
            }
            if (!locked) {
                IconButton(
                    onClick = onToggleFullscreen,
                    modifier = Modifier.background(Color(0xAA080C18), CircleShape)
                ) {
                    Icon(
                        if (fullscreen) Icons.Rounded.FullscreenExit else Icons.Rounded.Fullscreen,
                        contentDescription = fullscreenLabel,
                        tint = Color.White
                    )
                }
                IconButton(
                    onClick = onOpenTrackPicker,
                    modifier = Modifier.background(Color(0xAA080C18), CircleShape)
                ) {
                    Icon(Icons.Rounded.Subtitles, contentDescription = trackPickerLabel, tint = Color.White)
                }
                Surface(
                    onClick = onCycleAspect,
                    shape = RoundedCornerShape(99.dp),
                    color = Color(0xAA080C18)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Rounded.AspectRatio, contentDescription = null, tint = Color.White, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(5.dp))
                        Text(aspectMode.label, color = Color.White, fontSize = 11.sp)
                    }
                }
                Surface(
                    onClick = onEnterPip,
                    shape = CircleShape,
                    color = Color(0xAA080C18)
                ) {
                    Icon(
                        Icons.Rounded.PictureInPictureAlt,
                        contentDescription = "PiP",
                        tint = Color.White,
                        modifier = Modifier.padding(7.dp).size(16.dp)
                    )
                }
            }
        }
    }
}

@OptIn(UnstableApi::class)
@kotlin.OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VideoTrackPicker(
    state: SapiraUiState,
    strings: SapiraStrings,
    onSelect: (Int, Tracks.Group?, Int, Boolean) -> Unit,
    onAdjustSubtitleOffset: (Long) -> Unit,
    onPickFile: () -> Unit,
    onDismiss: () -> Unit
) {
    val sections = listOf(C.TRACK_TYPE_AUDIO to strings.audioTracks, C.TRACK_TYPE_TEXT to strings.subtitleTracks)
    ModalBottomSheet(onDismissRequest = onDismiss) {
        LazyColumn(contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp)) {
            sections.forEach { (type, title) ->
                item {
                    Text(title, fontWeight = FontWeight.SemiBold)
                    TextButton(onClick = { onSelect(type, null, 0, false) }) {
                        Text(strings.automaticTrack)
                    }
                    if (type == C.TRACK_TYPE_TEXT) {
                        TextButton(onClick = { onSelect(type, null, 0, true) }) {
                            Text(if (state.subtitlesEnabled) strings.subtitlesOff else "✓ " + strings.subtitlesOff)
                        }
                    }
                }
                state.tracks.groups.filter { it.type == type }.forEach { group ->
                    items(group.length) { index ->
                        if (group.isTrackSupported(index)) {
                            val format = group.getTrackFormat(index)
                            val label = format.label ?: format.language ?: "$title · ${index + 1}"
                            val selected = group.isTrackSelected(index)
                            TextButton(onClick = { onSelect(type, group, index, false) }) {
                                Text(if (selected) "✓ $label" else label)
                            }
                        }
                    }
                }
            }
            item {
                TextButton(onClick = onPickFile) { Text(strings.openSubtitleFile) }
            }
            state.subtitleOffsetMs?.let { offset ->
                item {
                    Text(strings.subtitleDelay, fontWeight = FontWeight.SemiBold)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = { onAdjustSubtitleOffset(-250L) }) { Text("−250 ms") }
                        TextButton(onClick = { onAdjustSubtitleOffset(0L) }) {
                            Text(if (offset > 0) "+$offset ms" else "$offset ms")
                        }
                        TextButton(onClick = { onAdjustSubtitleOffset(250L) }) { Text("+250 ms") }
                    }
                }
            }
        }
    }
}

@Composable
private fun IntegratedLyricsPane(
    state: SapiraUiState,
    onSeek: (Long) -> Unit,
    onFetchOnline: () -> Unit,
    onPickLrc: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val t = SapiraI18n.strings(state.language)
    val theme = state.theme
    val listState = rememberLazyListState()
    val activeIdx = state.activeLyricIndex

    LaunchedEffect(activeIdx, state.lyricLines.size) {
        if (activeIdx >= 0 && activeIdx < state.lyricLines.size) {
            listState.animateScrollToItem((activeIdx - 2).coerceAtLeast(0))
        }
    }

    Column(
        modifier = modifier
            .padding(vertical = 6.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(Color(0x300A0F1F))
            .border(1.dp, Color.White.copy(alpha = 0.07f), RoundedCornerShape(24.dp))
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(7.dp)
                        .clip(CircleShape)
                        .background(if (state.isPlaying && state.lyricLines.isNotEmpty()) theme.c0 else MutedText)
                )
                Spacer(Modifier.width(7.dp))
                Text(
                    text = t.lyricsLabel,
                    color = Color.White.copy(alpha = 0.88f),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 1.5.sp
                )
                if (state.lyricLines.isNotEmpty()) {
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = if (state.lyricsSynced) "SYNCED" else "TEXT",
                        color = theme.c0,
                        fontSize = 9.5.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Surface(
                    onClick = onFetchOnline,
                    shape = RoundedCornerShape(99.dp),
                    color = Color.White.copy(alpha = 0.07f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Rounded.Public, contentDescription = null, tint = theme.c0, modifier = Modifier.size(12.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(t.fetchOnline, color = Color.White, fontSize = 11.sp)
                    }
                }
                Surface(
                    onClick = onPickLrc,
                    shape = RoundedCornerShape(99.dp),
                    color = Color.White.copy(alpha = 0.07f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Rounded.Description, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(t.loadLrc, color = Color.White, fontSize = 11.sp)
                    }
                }
                IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Rounded.Close, contentDescription = "Close", tint = MutedText, modifier = Modifier.size(16.dp))
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        when {
            state.lyricsLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("LRCLIB…", color = theme.c0, fontSize = 14.sp)
                }
            }

            state.lyricLines.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = t.noLyricsYet,
                        color = MutedText,
                        fontSize = 13.5.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 20.dp)
                    )
                }
            }

            else -> {
                LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(vertical = 36.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    itemsIndexed(state.lyricLines) { idx, line ->
                        val isActive = state.lyricsSynced && idx == activeIdx
                        val dist = if (state.lyricsSynced && activeIdx >= 0) abs(idx - activeIdx) else 1
                        val alpha = when {
                            !state.lyricsSynced -> 0.82f
                            isActive -> 1.0f
                            dist == 1 -> 0.56f
                            dist == 2 -> 0.36f
                            else -> 0.22f
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .clickable(enabled = state.lyricsSynced) { onSeek(line.timeMs) }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (isActive) {
                                Box(
                                    modifier = Modifier
                                        .width(3.dp)
                                        .height(22.dp)
                                        .clip(RoundedCornerShape(99.dp))
                                        .background(Brush.verticalGradient(listOf(theme.c0, theme.c2)))
                                )
                                Spacer(Modifier.width(10.dp))
                            }
                            Text(
                                text = line.text.ifBlank { "♪" },
                                color = Color.White.copy(alpha = alpha),
                                fontSize = if (isActive) 20.sp else 17.5.sp,
                                fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                                lineHeight = 25.sp,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LibraryScreen(
    state: SapiraUiState,
    hasPermission: Boolean,
    onRequestPermission: () -> Unit,
    onRefresh: () -> Unit,
    onOpenFiles: () -> Unit,
    onPlayTrackList: (List<SapiraTrack>, Int) -> Unit
) {
    val t = SapiraI18n.strings(state.language)
    val theme = state.theme
    var query by remember { mutableStateOf("") }
    var kindFilter by remember { mutableStateOf<MediaKind?>(null) }

    val orderLabels = listOf(t.libraryTitleSort, t.libraryArtistSort, t.libraryAlbumGroup, t.libraryFolderGroup)
    var order by remember { mutableStateOf(0) }
    val groupBy: ((SapiraTrack) -> String)? = when (order) {
        2 -> { track -> track.album.ifBlank { t.unknownGroup } }
        3 -> { track -> track.folder.ifBlank { t.unknownGroup } }
        else -> null
    }

    val filtered = remember(state.library, query, kindFilter, order, t) {
        val q = query.trim().lowercase()
        state.library.filter { item ->
            (kindFilter == null || item.kind == kindFilter) &&
                (q.isEmpty() || item.title.lowercase().contains(q) ||
                    item.artist.lowercase().contains(q) || item.album.lowercase().contains(q) ||
                    item.folder.lowercase().contains(q) || item.ext.lowercase().contains(q))
        }.sortedWith(compareBy<SapiraTrack> {
            (groupBy?.invoke(it) ?: if (order == 1) it.artist else it.title).lowercase()
        }.thenBy { it.title.lowercase() })
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
    ) {
        if (!hasPermission) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(GlassSurface)
                    .border(1.dp, GlassBorder, RoundedCornerShape(20.dp))
                    .padding(18.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(t.permissionHint, color = MutedText, fontSize = 13.sp, textAlign = TextAlign.Center)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = onRequestPermission,
                        colors = ButtonDefaults.buttonColors(containerColor = theme.c1)
                    ) {
                        Text(t.grantPermission, color = Color.White)
                    }
                    OutlinedButton(onClick = onOpenFiles) {
                        Text(t.openFiles, color = Color.White)
                    }
                }
            }
            return
        }

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = MutedText) },
            trailingIcon = {
                IconButton(onClick = onRefresh) {
                    Icon(Icons.Rounded.Refresh, contentDescription = t.scanLibrary, tint = theme.c0)
                }
            },
            placeholder = { Text(t.searchPlaceholder, color = MutedText, fontSize = 13.sp) },
            singleLine = true,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(8.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = kindFilter == null,
                onClick = { kindFilter = null },
                label = { Text("${t.allFilter} (${state.library.size})") },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = theme.c1.copy(alpha = 0.28f))
            )
            FilterChip(
                selected = kindFilter == MediaKind.AUDIO,
                onClick = { kindFilter = MediaKind.AUDIO },
                label = { Text(t.audioFilter) },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = theme.c1.copy(alpha = 0.28f))
            )
            FilterChip(
                selected = kindFilter == MediaKind.VIDEO,
                onClick = { kindFilter = MediaKind.VIDEO },
                label = { Text(t.videoFilter) },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = theme.c1.copy(alpha = 0.28f))
            )
        }

        Spacer(Modifier.height(8.dp))

        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            itemsIndexed(orderLabels) { index, label ->
                FilterChip(selected = index == order, onClick = { order = index }, label = { Text(label) })
            }
        }

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(6.dp),
            contentPadding = PaddingValues(bottom = 16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            itemsIndexed(filtered, key = { _, tr -> tr.id }) { idx, item ->
                val group = groupBy?.invoke(item)
                if (group != null && (idx == 0 || groupBy.invoke(filtered[idx - 1]) != group)) {
                    Text(group, color = theme.c0, modifier = Modifier.padding(vertical = 8.dp))
                }
                val isCurrent = state.currentTrack?.id == item.id
                TrackRowItem(
                    track = item,
                    selected = isCurrent,
                    theme = theme,
                    onClick = { onPlayTrackList(filtered, idx) }
                )
            }
        }
    }
}

@kotlin.OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlaylistSheet(
    playlists: List<SavedPlaylist>,
    selectedId: String?,
    strings: SapiraStrings,
    theme: SapiraTheme,
    onSelect: (String?) -> Unit,
    onPlay: (SavedPlaylist, Int) -> Unit,
    onDelete: (String) -> Unit,
    onMove: (String, Int, Int) -> Unit,
    onDismiss: () -> Unit
) {
    val selected = playlists.find { it.id == selectedId }
    val listState = rememberLazyListState()
    ModalBottomSheet(onDismissRequest = onDismiss) {
        if (selected == null) {
            LazyColumn(contentPadding = PaddingValues(16.dp)) {
                item { Text(strings.savedPlaylists, fontWeight = FontWeight.SemiBold) }
                items(playlists, key = { it.id }) { playlist ->
                    TextButton(onClick = { onSelect(playlist.id) }) {
                        Text("${playlist.name} (${playlist.tracks.size})")
                    }
                }
            }
        } else {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = { onSelect(null) }) { Text(strings.savedPlaylists) }
                TextButton(onClick = { onDelete(selected.id) }) { Text(strings.deletePlaylist) }
            }
            Text(selected.name, modifier = Modifier.padding(horizontal = 16.dp), fontWeight = FontWeight.SemiBold)
            LazyColumn(
                state = listState,
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                itemsIndexed(selected.tracks) { index, track ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.weight(1f)) {
                            TrackRowItem(track, false, theme) { onPlay(selected, index) }
                        }
                        Icon(
                            Icons.Rounded.DragHandle,
                            contentDescription = strings.reorderTrack,
                            tint = theme.c0,
                            modifier = Modifier.size(48.dp).padding(10.dp)
                                .pointerInput(selected.id, index) {
                                    var dragOffset = 0f
                                    var destination = index
                                    detectDragGesturesAfterLongPress(
                                        onDragStart = { dragOffset = 0f; destination = index },
                                        onDragCancel = { dragOffset = 0f },
                                        onDragEnd = {
                                            dragOffset = 0f
                                            onMove(selected.id, index, destination)
                                        }
                                    ) { change, amount ->
                                        change.consume()
                                        dragOffset += amount.y
                                        val items = listState.layoutInfo.visibleItemsInfo
                                        val source = items.firstOrNull { it.index == index }
                                        if (source != null) {
                                            val target = source.offset + source.size / 2f + dragOffset
                                            destination = items.minByOrNull {
                                                kotlin.math.abs(it.offset + it.size / 2f - target)
                                            }?.index ?: index
                                        }
                                    }
                                }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun QueueScreen(
    state: SapiraUiState,
    onSelectIndex: (Int) -> Unit,
    onClear: () -> Unit,
    onSelectSleep: (SleepTimerOption) -> Unit,
    onSavePlaylist: (String) -> Unit,
    onDeletePlaylist: (String) -> Unit,
    onMovePlaylistTrack: (String, Int, Int) -> Unit,
    onPlayPlaylist: (SavedPlaylist, Int) -> Unit
) {
    val t = SapiraI18n.strings(state.language)
    val theme = state.theme
    var playlistsOpen by remember { mutableStateOf(false) }
    var saveDialog by remember { mutableStateOf(false) }
    var selectedPlaylistId by remember { mutableStateOf<String?>(null) }

    if (saveDialog) {
        var name by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { saveDialog = false },
            title = { Text(t.saveQueue) },
            text = {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(t.playlistName) },
                    singleLine = true
                )
            },
            confirmButton = {
                TextButton(
                    enabled = name.isNotBlank(),
                    onClick = { onSavePlaylist(name); saveDialog = false }
                ) { Text(t.savePlaylist) }
            },
            dismissButton = {
                TextButton(onClick = { saveDialog = false }) { Text(t.cancel) }
            }
        )
    }

    if (playlistsOpen) {
        PlaylistSheet(
            playlists = state.playlists,
            selectedId = selectedPlaylistId,
            strings = t,
            theme = theme,
            onSelect = { selectedPlaylistId = it },
            onPlay = onPlayPlaylist,
            onDelete = { onDeletePlaylist(it); selectedPlaylistId = null },
            onMove = onMovePlaylistTrack,
            onDismiss = { playlistsOpen = false; selectedPlaylistId = null }
        )
    }


    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = { playlistsOpen = true }) { Text(t.savedPlaylists) }
            TextButton(enabled = state.queue.isNotEmpty(), onClick = { saveDialog = true }) { Text(t.saveQueue) }
        }
        // Sleep Timer Strip
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Bedtime, contentDescription = null, tint = theme.c0, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text(
                    text = state.sleepRemainingSec?.let { "${t.sleepTimer}: ${formatDurationMs(it * 1000L)}" }
                        ?: t.sleepTimer,
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            }
            if (state.queue.isNotEmpty()) {
                TextButton(onClick = onClear) {
                    Text(t.clearQueue, color = theme.c2, fontSize = 12.5.sp)
                }
            }
        }

        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            items(SleepTimerOption.entries) { opt ->
                FilterChip(
                    selected = state.sleepOption == opt,
                    onClick = { onSelectSleep(opt) },
                    label = { Text(opt.label, fontSize = 11.5.sp) }
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        if (state.queue.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(t.queueEmpty, color = MutedText, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(6.dp),
                contentPadding = PaddingValues(bottom = 16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                itemsIndexed(state.queue, key = { idx, tr -> "${tr.id}-$idx" }) { idx, item ->
                    TrackRowItem(
                        track = item,
                        selected = idx == state.currentIndex,
                        theme = theme,
                        onClick = { onSelectIndex(idx) }
                    )
                }
            }
        }
    }
}

@Composable
private fun TrackRowItem(
    track: SapiraTrack,
    selected: Boolean,
    theme: SapiraTheme,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) theme.c1.copy(alpha = 0.18f) else Color.White.copy(alpha = 0.035f))
            .border(
                width = 1.dp,
                color = if (selected) theme.c0.copy(alpha = 0.45f) else Color.Transparent,
                shape = RoundedCornerShape(14.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Color(0xFF10172B)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (track.kind == MediaKind.VIDEO) Icons.Rounded.Movie else Icons.Rounded.MusicNote,
                contentDescription = null,
                tint = if (selected) theme.c0 else MutedText,
                modifier = Modifier.size(19.dp)
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = track.title,
                color = if (selected) theme.c0 else Color.White,
                fontSize = 14.5.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            val sub = buildList {
                if (track.artist.isNotBlank()) add(track.artist)
                add(track.ext)
                if (track.durationMs > 0) add(formatDurationMs(track.durationMs))
            }.joinToString(" · ")
            Text(
                text = sub,
                color = MutedText,
                fontSize = 11.5.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun PrismPlayerDock(
    state: SapiraUiState,
    onTogglePlay: () -> Unit,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onReplay10: () -> Unit,
    onForward10: () -> Unit,
    onSeek: (Long) -> Unit,
    onToggleShuffle: () -> Unit,
    onCycleRepeat: () -> Unit,
    onToggleLyrics: () -> Unit,
    onCycleSpeed: () -> Unit
) {
    val theme = state.theme
    val dur = state.durationMs.coerceAtLeast(1L)
    val progress = (state.positionMs.toFloat() / dur.toFloat()).coerceIn(0f, 1f)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(GlassSurface)
            .border(1.dp, GlassBorder, RoundedCornerShape(22.dp))
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = formatDurationMs(state.positionMs),
                color = MutedText,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace
            )
            Slider(
                value = progress,
                onValueChange = { frac -> onSeek((frac * dur).toLong()) },
                colors = SliderDefaults.colors(
                    thumbColor = theme.c0,
                    activeTrackColor = theme.c1,
                    inactiveTrackColor = Color.White.copy(alpha = 0.14f)
                ),
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 8.dp)
                    .height(24.dp)
            )
            Text(
                text = if (state.durationMs > 0) formatDurationMs(state.durationMs) else "--:--",
                color = MutedText,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onToggleShuffle, modifier = Modifier.size(34.dp)) {
                Icon(
                    Icons.Rounded.Shuffle,
                    contentDescription = "Shuffle",
                    tint = if (state.shuffle) theme.c0 else MutedText,
                    modifier = Modifier.size(18.dp)
                )
            }
            IconButton(onClick = onPrev, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Rounded.SkipPrevious, contentDescription = "Previous", tint = Color.White)
            }
            IconButton(onClick = onReplay10, modifier = Modifier.size(34.dp)) {
                Icon(Icons.Rounded.Replay10, contentDescription = "-10s", tint = MutedText, modifier = Modifier.size(19.dp))
            }

            // Signature Prism Play/Pause Button
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Brush.linearGradient(listOf(theme.c0, theme.c1, theme.c2)))
                    .clickable(onClick = onTogglePlay),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (state.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                    contentDescription = "Play/Pause",
                    tint = Color.White,
                    modifier = Modifier.size(26.dp)
                )
            }

            IconButton(onClick = onForward10, modifier = Modifier.size(34.dp)) {
                Icon(Icons.Rounded.Forward10, contentDescription = "+10s", tint = MutedText, modifier = Modifier.size(19.dp))
            }
            IconButton(onClick = onNext, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Rounded.SkipNext, contentDescription = "Next", tint = Color.White)
            }

            if (state.currentTrack?.kind == MediaKind.AUDIO) {
                IconButton(onClick = onToggleLyrics, modifier = Modifier.size(34.dp)) {
                    Icon(
                        Icons.Rounded.Lyrics,
                        contentDescription = "Lyrics",
                        tint = if (state.lyricsOpen) theme.c0 else MutedText,
                        modifier = Modifier.size(18.dp)
                    )
                }
            } else {
                TextButton(onClick = onCycleSpeed, contentPadding = PaddingValues(0.dp)) {
                    Text("${state.playbackSpeed}x", color = theme.c0, fontSize = 11.5.sp, fontFamily = FontFamily.Monospace)
                }
            }

            IconButton(onClick = onCycleRepeat, modifier = Modifier.size(34.dp)) {
                Icon(
                    imageVector = if (state.repeatMode == Player.REPEAT_MODE_ONE) Icons.Rounded.RepeatOne else Icons.Rounded.Repeat,
                    contentDescription = "Repeat",
                    tint = if (state.repeatMode != Player.REPEAT_MODE_OFF) theme.c0 else MutedText,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
private fun SettingsSheetContent(
    state: SapiraUiState,
    onSelectPreset: (EqPreset) -> Unit,
    onToggleEq: (Boolean) -> Unit,
    onBoostChange: (Int) -> Unit,
    onSelectTheme: (SapiraTheme) -> Unit,
    onSelectLang: (SapiraLanguage) -> Unit
) {
    val t = SapiraI18n.strings(state.language)
    val theme = state.theme

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp)
            .padding(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(t.settingsTitle, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color.White)

        // 5-Band Hardware Equalizer
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Equalizer, contentDescription = null, tint = theme.c0, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text(t.equalizerLabel, color = Color.White, fontSize = 14.5.sp)
            }
            Switch(checked = state.eqEnabled, onCheckedChange = onToggleEq)
        }

        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(EqPreset.entries) { preset ->
                FilterChip(
                    selected = state.eqPreset == preset,
                    onClick = { onSelectPreset(preset) },
                    label = { Text(preset.label) }
                )
            }
        }

        // Hardware Loudness Enhancer (up to +100% boost = 200% volume)
        Column {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(t.loudnessBoost, color = Color.White, fontSize = 14.sp)
                Text("${100 + state.loudnessBoostPct}%", color = theme.c0, fontFamily = FontFamily.Monospace, fontSize = 13.sp)
            }
            Slider(
                value = state.loudnessBoostPct.toFloat(),
                onValueChange = { onBoostChange(it.toInt()) },
                valueRange = 0f..100f,
                colors = SliderDefaults.colors(thumbColor = theme.c0, activeTrackColor = theme.c1)
            )
        }

        // Sapira Themes
        Text(t.themeLabel, color = MutedText, fontSize = 12.5.sp)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(SapiraTheme.entries) { th ->
                FilterChip(
                    selected = state.theme == th,
                    onClick = { onSelectTheme(th) },
                    leadingIcon = {
                        Box(
                            Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(th.c0)
                        )
                    },
                    label = { Text(th.label) }
                )
            }
        }

        // Language (EN default / RO)
        Text(t.languageLabel, color = MutedText, fontSize = 12.5.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SapiraLanguage.entries.forEach { lang ->
                FilterChip(
                    selected = state.language == lang,
                    onClick = { onSelectLang(lang) },
                    label = { Text(lang.label) }
                )
            }
        }
    }
}

@Composable
private fun NavPill(
    selected: Boolean,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    theme: SapiraTheme,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(99.dp),
        color = if (selected) theme.c1.copy(alpha = 0.22f) else Color.Transparent
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (selected) theme.c0 else MutedText,
                modifier = Modifier.size(17.dp)
            )
            Spacer(Modifier.width(6.dp))
            Text(
                text = label,
                color = if (selected) Color.White else MutedText,
                fontSize = 12.5.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
            )
        }
    }
}

private fun formatDurationMs(ms: Long): String {
    val totalSec = (ms / 1000L).coerceAtLeast(0L)
    val hrs = totalSec / 3600L
    val mins = (totalSec % 3600L) / 60L
    val secs = totalSec % 60L
    return if (hrs > 0) {
        "%d:%02d:%02d".format(hrs, mins, secs)
    } else {
        "%d:%02d".format(mins, secs)
    }
}

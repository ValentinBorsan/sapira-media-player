package org.sapira.mediaplayer.ui

import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.rounded.Movie
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Pause
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import org.sapira.mediaplayer.model.EqPreset
import org.sapira.mediaplayer.model.MediaKind
import org.sapira.mediaplayer.model.SapiraI18n
import org.sapira.mediaplayer.model.SapiraLanguage
import org.sapira.mediaplayer.model.SapiraTheme
import org.sapira.mediaplayer.model.SapiraTrack
import org.sapira.mediaplayer.model.SleepTimerOption
import org.sapira.mediaplayer.model.VideoAspectMode
import org.sapira.mediaplayer.ui.components.PrismAudioCore
import org.sapira.mediaplayer.ui.components.SapiraEmblemCanvas
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
                        onCycleAspect = viewModel::cycleAspectMode,
                        onEnterPip = onEnterPip,
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
                        onSelectSleep = viewModel::setSleepTimer
                    )
                }
            }

            // Floating Prism Player Dock (when a track is loaded)
            if (currentTrack != null) {
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

    // Stream URL Modal
    if (streamModalOpen) {
        AlertDialog(
            onDismissRequest = { streamModalOpen = false },
            containerColor = Color(0xFF0B1020),
            titleContentColor = Color.White,
            textContentColor = MutedText,
            title = { Text(t.streamDialogTitle, fontWeight = FontWeight.SemiBold) },
            text = {
                OutlinedTextField(
                    value = streamUrlInput,
                    onValueChange = { streamUrlInput = it },
                    placeholder = { Text(t.streamUrlHint, color = MutedText) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (viewModel.openNetworkStream(streamUrlInput)) {
                            streamUrlInput = ""
                            streamModalOpen = false
                            section = NavSection.STAGE
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = theme.c1)
                ) {
                    Text(t.playNow, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { streamModalOpen = false }) {
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
    onCycleAspect: () -> Unit,
    onEnterPip: () -> Unit,
    mediaController: Player?
) {
    val t = SapiraI18n.strings(state.language)
    val track = state.currentTrack
    val theme = state.theme

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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp, vertical = 6.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(Color.Black)
                .border(1.dp, GlassBorder, RoundedCornerShape(22.dp))
        ) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        useController = false
                        keepScreenOn = true
                        player = mediaController
                    }
                },
                update = { pv ->
                    pv.player = mediaController
                    pv.resizeMode = when (state.aspectMode) {
                        VideoAspectMode.FIT -> AspectRatioFrameLayout.RESIZE_MODE_FIT
                        VideoAspectMode.FILL -> AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                        VideoAspectMode.STRETCH -> AspectRatioFrameLayout.RESIZE_MODE_FILL
                    }
                },
                modifier = Modifier.fillMaxSize()
            )

            Row(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
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
                        Text(state.aspectMode.label, color = Color.White, fontSize = 11.sp)
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

    val filtered = remember(state.library, query, kindFilter) {
        val q = query.trim().lowercase()
        state.library.filter { item ->
            (kindFilter == null || item.kind == kindFilter) &&
                (q.isEmpty() || item.title.lowercase().contains(q) ||
                    item.artist.lowercase().contains(q) || item.ext.lowercase().contains(q))
        }
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

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(6.dp),
            contentPadding = PaddingValues(bottom = 16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            itemsIndexed(filtered, key = { _, tr -> tr.id }) { idx, item ->
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

@Composable
private fun QueueScreen(
    state: SapiraUiState,
    onSelectIndex: (Int) -> Unit,
    onClear: () -> Unit,
    onSelectSleep: (SleepTimerOption) -> Unit
) {
    val t = SapiraI18n.strings(state.language)
    val theme = state.theme

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
    ) {
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

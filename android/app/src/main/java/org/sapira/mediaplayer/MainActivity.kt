package org.sapira.mediaplayer

import android.Manifest
import android.app.PictureInPictureParams
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.core.content.ContextCompat
import org.sapira.mediaplayer.model.MediaKind
import org.sapira.mediaplayer.ui.SapiraApp
import org.sapira.mediaplayer.ui.SapiraViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: SapiraViewModel by viewModels()
    private var inPipMode by mutableStateOf(false)
    private var hasMediaPermission by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        super.onCreate(savedInstanceState)

        hasMediaPermission = checkMediaPermissions()
        if (hasMediaPermission) {
            viewModel.scanDeviceLibrary()
        }
        handleIncomingViewIntent(intent)

        setContent {
            val permissionLauncher = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.RequestMultiplePermissions()
            ) { results ->
                val granted = results.values.any { it }
                hasMediaPermission = granted || checkMediaPermissions()
                if (hasMediaPermission) {
                    viewModel.scanDeviceLibrary()
                }
            }

            val mediaFilesPicker = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.OpenMultipleDocuments()
            ) { uris ->
                if (uris.isNotEmpty()) {
                    uris.forEach { uri ->
                        runCatching {
                            contentResolver.takePersistableUriPermission(
                                uri,
                                Intent.FLAG_GRANT_READ_URI_PERMISSION
                            )
                        }
                    }
                    viewModel.appendPickedUris(uris, playImmediately = true)
                }
            }

            val lrcFilePicker = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.OpenDocument()
            ) { uri ->
                if (uri != null) {
                    viewModel.loadLocalLrc(uri)
                }
            }

            var subtitleTarget by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf<String?>(null) }
            val subtitlePicker = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.OpenDocument()
            ) { uri ->
                val target = subtitleTarget
                subtitleTarget = null
                if (uri != null && target != null) viewModel.loadSubtitle(uri, target)
            }

            LaunchedEffect(hasMediaPermission) {
                if (hasMediaPermission) {
                    viewModel.scanDeviceLibrary()
                }
            }

            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFF6366F1),
                    secondary = Color(0xFF67E8F9),
                    background = Color(0xFF04050A),
                    surface = Color(0xFF0A0E1C)
                )
            ) {
                SapiraApp(
                    viewModel = viewModel,
                    hasMediaPermission = hasMediaPermission,
                    inPipMode = inPipMode,
                    onRequestMediaPermission = {
                        permissionLauncher.launch(requiredMediaPermissions())
                    },
                    onPickMediaFiles = {
                        mediaFilesPicker.launch(arrayOf("audio/*", "video/*"))
                    },
                    onPickLrcFile = {
                        lrcFilePicker.launch(arrayOf("*/*"))
                    },
                    onPickSubtitleFile = { trackId ->
                        subtitleTarget = trackId
                        subtitlePicker.launch(arrayOf("*/*"))
                    },
                    onEnterPip = { enterVideoPip() }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIncomingViewIntent(intent)
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        inPipMode = isInPictureInPictureMode
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        val state = viewModel.uiState.value
        if (state.isPlaying && state.currentTrack?.kind == MediaKind.VIDEO) {
            enterVideoPip()
        }
    }

    private fun enterVideoPip() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
        ) {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
                .build()
            runCatching { enterPictureInPictureMode(params) }
        }
    }

    private fun handleIncomingViewIntent(intent: Intent?) {
        when (intent?.action) {
            Intent.ACTION_VIEW -> {
                val data = intent.data ?: return
                val scheme = data.scheme?.lowercase()
                if (scheme == "http" || scheme == "https") {
                    viewModel.openNetworkStream(data.toString())
                } else {
                    viewModel.appendPickedUris(listOf(data), playImmediately = true)
                }
            }
            Intent.ACTION_SEND -> {
                val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim()
                if (!sharedText.isNullOrEmpty()) {
                    viewModel.openNetworkStream(sharedText)
                }
            }
        }
    }

    private fun requiredMediaPermissions(): Array<String> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.READ_MEDIA_VIDEO
            )
        } else {
            arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
    }

    private fun checkMediaPermissions(): Boolean {
        return requiredMediaPermissions().any { perm ->
            ContextCompat.checkSelfPermission(this, perm) == PackageManager.PERMISSION_GRANTED
        }
    }
}

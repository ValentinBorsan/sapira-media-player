package org.sapira.mediaplayer.service

import android.app.PendingIntent
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import org.sapira.mediaplayer.MainActivity

class SapiraPlaybackService : MediaSessionService() {

    private var mediaSession: MediaSession? = null
    private val positionHandler = Handler(Looper.getMainLooper())
    private val savePosition = object : Runnable {
        override fun run() {
            val player = mediaSession?.player ?: return
            if (!player.isPlaying) return
            rememberPosition(player)
            positionHandler.postDelayed(this, 5_000L)
        }
    }

    private fun rememberPosition(player: Player) {
        if (player.isCurrentMediaItemSeekable) {
            writePosition(player.currentMediaItem, player.currentPosition, player.duration)
        }
    }

    private fun writePosition(item: MediaItem?, position: Long, duration: Long, finished: Boolean = false) {
        val uri = item?.localConfiguration?.uri ?: return
        if (uri.scheme != "content" && uri.scheme != "file") return
        val editor = getSharedPreferences("sapira_positions", MODE_PRIVATE).edit()
        val key = uri.toString()
        if (finished || position < 5_000L || (duration > 0 && duration - position < 5_000L)) {
            editor.remove(key)
        } else {
            editor.putLong(key, position)
        }
        editor.apply()
    }

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()

        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()

        val player = ExoPlayer.Builder(this)
            .setMediaSourceFactory(SapiraMediaSourceFactory(this))
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build()

        AudioFxEngine.bindAudioSession(player.audioSessionId)
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                positionHandler.removeCallbacks(savePosition)
                if (isPlaying) positionHandler.postDelayed(savePosition, 5_000L)
                else rememberPosition(player)
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    writePosition(player.currentMediaItem, 0L, 0L, finished = true)
                }
            }

            override fun onPositionDiscontinuity(
                oldPosition: Player.PositionInfo,
                newPosition: Player.PositionInfo,
                reason: Int
            ) {
                if (oldPosition.mediaItem?.mediaId != newPosition.mediaItem?.mediaId) {
                    writePosition(
                        oldPosition.mediaItem,
                        oldPosition.contentPositionMs,
                        0L,
                        finished = reason == Player.DISCONTINUITY_REASON_AUTO_TRANSITION
                    )
                } else if (reason == Player.DISCONTINUITY_REASON_SEEK) {
                    rememberPosition(player)
                }
            }

            override fun onAudioSessionIdChanged(audioSessionId: Int) {
                AudioFxEngine.bindAudioSession(audioSessionId)
            }
        })

        val sessionActivityIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        mediaSession = MediaSession.Builder(this, player)
            .setSessionActivity(sessionActivityIntent)
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaSession?.player
        if (player == null || !player.playWhenReady || player.mediaItemCount == 0) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        positionHandler.removeCallbacks(savePosition)
        mediaSession?.player?.let(::rememberPosition)
        AudioFxEngine.release()
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}

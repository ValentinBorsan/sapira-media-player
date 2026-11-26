package org.sapira.mediaplayer.service

import android.media.audiofx.Equalizer
import android.media.audiofx.LoudnessEnhancer
import android.media.audiofx.AudioEffect

object AudioFxEngine {
    private var currentSessionId: Int = 0
    private var equalizer: Equalizer? = null
    private var loudnessEnhancer: LoudnessEnhancer? = null

    private var eqEnabled: Boolean = true
    private var targetGainsDb: List<Float> = listOf(0f, 0f, 0f, 0f, 0f)
    private var boostMb: Int = 0 // millibels (0..1200 mB = up to +12 dB)

    @Synchronized
    fun bindAudioSession(audioSessionId: Int) {
        if (audioSessionId <= AudioEffect.ERROR_BAD_VALUE || audioSessionId == currentSessionId) {
            return
        }
        release()
        currentSessionId = audioSessionId

        runCatching {
            equalizer = Equalizer(0, audioSessionId).apply {
                enabled = eqEnabled
            }
            applyBandsInternal()
        }

        runCatching {
            loudnessEnhancer = LoudnessEnhancer(audioSessionId).apply {
                setTargetGain(boostMb)
                enabled = boostMb > 0
            }
        }
    }

    @Synchronized
    fun updateEqualizer(enabled: Boolean, gainsDb: List<Float>) {
        eqEnabled = enabled
        targetGainsDb = gainsDb
        runCatching {
            equalizer?.enabled = enabled
            applyBandsInternal()
        }
    }

    @Synchronized
    fun updateLoudnessBoostPercent(boostPercent: Int) {
        // 0%..100% extra boost mapped smoothly to 0..1000 millibels (+10 dB)
        boostMb = (boostPercent.coerceIn(0, 100) * 10)
        runCatching {
            loudnessEnhancer?.apply {
                setTargetGain(boostMb)
                enabled = boostMb > 0
            }
        }
    }

    private fun applyBandsInternal() {
        val eq = equalizer ?: return
        val numBands = eq.numberOfBands.toInt()
        if (numBands <= 0) return
        val range = eq.bandLevelRange
        val minMb = range[0].toInt()
        val maxMb = range[1].toInt()

        for (b in 0 until numBands) {
            val mappedIdx = ((b.toFloat() / numBands.coerceAtLeast(1)) * targetGainsDb.size)
                .toInt()
                .coerceIn(0, targetGainsDb.lastIndex)
            val db = if (eqEnabled) targetGainsDb[mappedIdx] else 0f
            val mb = (db * 100f).toInt().coerceIn(minMb, maxMb).toShort()
            eq.setBandLevel(b.toShort(), mb)
        }
    }

    @Synchronized
    fun release() {
        runCatching { equalizer?.release() }
        runCatching { loudnessEnhancer?.release() }
        equalizer = null
        loudnessEnhancer = null
        currentSessionId = 0
    }
}

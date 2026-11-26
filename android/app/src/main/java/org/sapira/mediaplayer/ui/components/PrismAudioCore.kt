package org.sapira.mediaplayer.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import org.sapira.mediaplayer.model.SapiraTheme
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun PrismAudioCore(
    isPlaying: Boolean,
    artworkUri: Any?,
    theme: SapiraTheme,
    size: Dp = 268.dp,
    modifier: Modifier = Modifier
) {
    val transition = rememberInfiniteTransition(label = "sapiraAudioCore")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = (2.0 * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = if (isPlaying) 3800 else 12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase"
    )
    val pulse by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 920, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    val bars = 96
    val cosTable = remember {
        FloatArray(bars) { i ->
            val angle = (i.toFloat() / bars) * (2f * PI.toFloat()) - (PI.toFloat() / 2f)
            cos(angle)
        }
    }
    val sinTable = remember {
        FloatArray(bars) { i ->
            val angle = (i.toFloat() / bars) * (2f * PI.toFloat()) - (PI.toFloat() / 2f)
            sin(angle)
        }
    }
    val mirrorTable = remember {
        FloatArray(bars) { i ->
            val ratio = i.toFloat() / bars
            1f - abs(ratio * 2f - 1f)
        }
    }
    val contourPath = remember { Path() }

    val sweepBrush = remember(theme) {
        Brush.sweepGradient(
            0.0f to theme.c0,
            0.25f to theme.c1,
            0.5f to theme.c2,
            0.75f to theme.c1,
            1.0f to theme.c0
        )
    }

    val discSize = size * 0.52f

    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(size)) {
            val cx = this.size.width * 0.5f
            val cy = this.size.height * 0.5f
            val ringRadius = this.size.minDimension * 0.30f
            val baseRadius = this.size.minDimension * 0.335f
            val maxWave = this.size.minDimension * 0.115f
            val activeEnergy = if (isPlaying) 0.55f + pulse * 0.35f else 0.16f

            // Ambient radial glow
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        theme.c1.copy(alpha = if (isPlaying) 0.24f else 0.11f),
                        theme.c0.copy(alpha = if (isPlaying) 0.10f else 0.04f),
                        Color.Transparent
                    ),
                    center = Offset(cx, cy),
                    radius = this.size.minDimension * 0.49f
                ),
                radius = this.size.minDimension * 0.49f,
                center = Offset(cx, cy)
            )

            // Concentric halo ring
            drawCircle(
                brush = sweepBrush,
                radius = ringRadius,
                center = Offset(cx, cy),
                alpha = if (isPlaying) 0.18f + pulse * 0.14f else 0.08f,
                style = Stroke(width = 4.5.dp.toPx())
            )
            drawCircle(
                brush = sweepBrush,
                radius = ringRadius,
                center = Offset(cx, cy),
                alpha = if (isPlaying) 0.55f + pulse * 0.28f else 0.28f,
                style = Stroke(width = 1.5.dp.toPx())
            )

            // Aurora contour
            contourPath.reset()
            var firstX = 0f
            var firstY = 0f
            var prevX = 0f
            var prevY = 0f

            for (i in 0 until bars) {
                val m = mirrorTable[i]
                val wave = if (isPlaying) {
                    val w1 = 0.5f + 0.5f * sin(phase * 2f + m * 8.5f)
                    val w2 = 0.5f + 0.5f * sin(-phase * 3f + i * 0.22f)
                    (0.18f + 0.82f * (w1 * 0.62f + w2 * 0.38f)) * activeEnergy
                } else {
                    0.07f + 0.03f * sin(phase + m * 5f)
                }
                val r = baseRadius + wave * maxWave
                val x = cx + cosTable[i] * r
                val y = cy + sinTable[i] * r

                if (i == 0) {
                    firstX = x
                    firstY = y
                    contourPath.moveTo(x, y)
                } else {
                    val midX = (prevX + x) * 0.5f
                    val midY = (prevY + y) * 0.5f
                    contourPath.quadraticTo(prevX, prevY, midX, midY)
                }
                prevX = x
                prevY = y

                // Prism corona particles every 3rd step
                if (i % 3 == 0) {
                    val drift = (6f + wave * 18f)
                    val px = x + cosTable[i] * drift
                    val py = y + sinTable[i] * drift
                    drawCircle(
                        color = theme.c0.copy(alpha = if (isPlaying) 0.38f + wave * 0.45f else 0.15f),
                        radius = (1.4f + wave * 2.4f).dp.toPx() * 0.45f,
                        center = Offset(px, py)
                    )
                }
            }
            contourPath.quadraticTo(prevX, prevY, firstX, firstY)
            contourPath.close()

            drawPath(
                path = contourPath,
                brush = sweepBrush,
                alpha = if (isPlaying) 0.22f else 0.08f,
                style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
            )
            drawPath(
                path = contourPath,
                brush = sweepBrush,
                alpha = if (isPlaying) 0.78f else 0.32f,
                style = Stroke(width = 1.9.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
            )
        }

        // Center Cover Disc or Sapphire Prism Emblem
        Box(
            modifier = Modifier
                .size(discSize)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        colors = listOf(Color(0xFF0C1226), Color(0xFF060913))
                    )
                )
                .border(
                    width = 1.5.dp,
                    brush = Brush.linearGradient(listOf(theme.c0.copy(alpha = 0.55f), theme.c2.copy(alpha = 0.45f))),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            if (artworkUri != null) {
                AsyncImage(
                    model = artworkUri,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(discSize - 8.dp)
                        .clip(CircleShape)
                )
            } else {
                SapiraEmblemCanvas(theme = theme, size = discSize * 0.52f)
            }
        }
    }
}

@Composable
fun SapiraEmblemCanvas(theme: SapiraTheme, size: Dp = 32.dp) {
    Canvas(modifier = Modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val prism = Path().apply {
            moveTo(w * 0.24f, h * 0.14f)
            lineTo(w * 0.88f, h * 0.50f)
            lineTo(w * 0.24f, h * 0.86f)
            close()
        }
        drawPath(
            path = prism,
            brush = Brush.linearGradient(
                colors = listOf(theme.c0, theme.c1, theme.c2),
                start = Offset(0f, 0f),
                end = Offset(w, h)
            )
        )
        val inner = Path().apply {
            moveTo(w * 0.33f, h * 0.28f)
            lineTo(w * 0.72f, h * 0.50f)
            lineTo(w * 0.33f, h * 0.72f)
            close()
        }
        drawPath(
            path = inner,
            color = Color(0xFF070B19).copy(alpha = 0.62f)
        )
    }
}

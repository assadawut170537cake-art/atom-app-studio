package com.atom.ultronmobile.orb

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

private val CoreIdle = Color(0xFF39C0FF)
private val CoreListen = Color(0xFF3DFFA1)
private val CoreThink = Color(0xFFFFC94D)
private val CoreSpeak = Color(0xFFB16CFF)
private val CoreAlert = Color(0xFFFF4D6D)

private fun coreColor(s: OrbState): Color = when (s) {
    OrbState.IDLE -> CoreIdle
    OrbState.LISTENING -> CoreListen
    OrbState.THINKING -> CoreThink
    OrbState.SPEAKING -> CoreSpeak
    OrbState.ALERT -> CoreAlert
}

/** ORB วົงวน — จังหวะเร็วขึ้ นตามสถานะ */
@Composable
fun Orb(state: OrbState, modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "orb")
    val pulse by transition.animateFloat(
        initialValue = 0.55f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = when (state) {
                    OrbState.ALERT -> 400
                    OrbState.THINKING -> 700
                    else -> 1400
                },
                easing = LinearEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    val c = coreColor(state)
    Canvas(modifier = modifier.size(180.dp)) {
        val r = size.minDimension / 2f
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(c.copy(alpha = 0.95f * pulse), c.copy(alpha = 0.15f)),
                center = center
            ),
            radius = r * pulse
        )
        drawCircle(
            color = c.copy(alpha = 0.6f),
            radius = r * 0.92f,
            style = Stroke(width = 3f)
        )
    }
}

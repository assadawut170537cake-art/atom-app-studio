package com.atom.ultronmobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val UltronDark = darkColorScheme(
    primary = Color(0xFF39C0FF),
    background = Color(0xFF0B0F14),
    surface = Color(0xFF121821),
    onBackground = Color(0xFFE6EDF3),
    onSurface = Color(0xFFE6EDF3),
    error = Color(0xFFFF4D6D)
)

@Composable
fun UltronTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = UltronDark,
        content = content
    )
}

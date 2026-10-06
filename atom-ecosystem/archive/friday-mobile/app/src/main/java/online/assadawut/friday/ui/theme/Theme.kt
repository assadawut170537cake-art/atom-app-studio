package online.assadawut.friday.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val FridayPink = Color(0xFFFF6B9D)
private val Black = Color(0xFF000000)

private val DarkScheme = darkColorScheme(
    primary = FridayPink,
    background = Black,
    surface = Black
)

@Composable
fun FridayTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = DarkScheme, content = content)
}

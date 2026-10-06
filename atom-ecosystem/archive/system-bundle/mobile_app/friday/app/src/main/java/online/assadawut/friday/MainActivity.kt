package online.assadawut.friday

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import online.assadawut.friday.ui.screens.FridayMainScreen
import online.assadawut.friday.ui.theme.FridayTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FridayTheme {
                FridayMainScreen()
            }
        }
    }
}

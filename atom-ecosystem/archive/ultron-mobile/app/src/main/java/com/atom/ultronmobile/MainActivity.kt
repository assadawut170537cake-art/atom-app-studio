package com.atom.ultronmobile

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.atom.ultronmobile.ui.AtomScreen
import com.atom.ultronmobile.ui.theme.UltronTheme
import androidx.activity.ComponentActivity

class MainActivity : ComponentActivity() {

    private lateinit var vm: AtomViewModel

    private val micPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) vm.startListening()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            UltronTheme {
                val model: AtomViewModel = viewModel()
                vm = model
                val orb by vm.orbState.collectAsState()
                val error by vm.error.collectAsState()
                val nodes by vm.nodes.collectAsState()
                val online by vm.online.collectAsState()
                val transcript by vm.transcript.collectAsState()

                AtomScreen(
                    orbState = orb,
                    online = online,
                    nodes = nodes,
                    transcript = transcript,
                    error = error,
                    onMicPress = { ensureMicThen { vm.toggleListening() } },
                    onKillSwitch = { vm.triggerKillSwitch() },
                    onDismissError = { vm.consumeError() }
                )
            }
        }
    }

    private fun ensureMicThen(action: () -> Unit) {
        val granted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        if (granted) action() else micPermission.launch(Manifest.permission.RECORD_AUDIO)
    }
}

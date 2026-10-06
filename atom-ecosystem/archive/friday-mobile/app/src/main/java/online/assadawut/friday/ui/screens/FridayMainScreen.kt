package online.assadawut.friday.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel
import online.assadawut.friday.viewmodel.FridayMainViewModel

@Composable
fun FridayMainScreen(vm: FridayMainViewModel = viewModel()) {
    var selected by remember { mutableIntStateOf(0) }
    val lifecycleOwner = LocalLifecycleOwner.current
    val snackbarHostState = remember { SnackbarHostState() }
    val error by vm.error.collectAsState()

    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(it)
            vm.clearError()
        }
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> vm.startHeartbeat()
                Lifecycle.Event.ON_STOP -> vm.stopHeartbeat()
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) {
        vm.loadChatHistory()
        vm.refreshQueue()
        vm.refreshPresence()
    }

    Scaffold(
        containerColor = Color.Black,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            NavigationBar(containerColor = Color.Black) {
                NavigationBarItem(
                    selected = selected == 0,
                    onClick = { selected = 0 },
                    icon = { Icon(Icons.Default.Folder, null) },
                    label = { Text("เวิร์กสเปซ") }
                )
                NavigationBarItem(
                    selected = selected == 1,
                    onClick = { selected = 1 },
                    icon = { Icon(Icons.Default.Edit, null) },
                    label = { Text("เขียน") }
                )
                NavigationBarItem(
                    selected = selected == 2,
                    onClick = { selected = 2 },
                    icon = { Icon(Icons.Default.Chat, null) },
                    label = { Text("แชท") }
                )
                NavigationBarItem(
                    selected = selected == 3,
                    onClick = { selected = 3 },
                    icon = { Icon(Icons.Default.Settings, null) },
                    label = { Text("ระบบ") }
                )
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when (selected) {
                0 -> WorkspaceTab(vm) { selected = 1 }
                1 -> SpecEditorTab(vm)
                2 -> ChatTab(vm)
                3 -> SystemTab(vm) { selected = 4 }
            }
            // Import overlay: ทับทั้งหมดเมื่อกด ปุ่ มนำเข้าจาก System tab
            if (selected == 4) {
                ImportHistoryTab(vm) { selected = 3 }
            }
        }
    }
}

package online.assadawut.friday.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import online.assadawut.friday.viewmodel.FridayMainViewModel

@Composable
fun SystemTab(
    vm: FridayMainViewModel,
    onImport: () -> Unit
) {
    val presence = vm.presence.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(text = "SYSTEM STATUS", color = Color(0xFFFF6B9D))
        Spacer(Modifier.height(20.dp))
        Text(
            text = "PC Workstation: " +
                (presence.value?.nodes?.get("PC_WORKSTATION")?.status ?: "UNKNOWN"),
            color = Color.White
        )
        val mobileStatus = presence.value?.nodes?.get("MOBILE_S10")?.status ?: "UNKNOWN"
        Text(
            text = "Mobile S10: $mobileStatus",
            color = if (mobileStatus == "ONLINE") Color(0xFF00E676) else Color.White
        )
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = onImport,
            modifier = Modifier.fillMaxWidth()
        ) { Text("\uD83D\uDCE5 นำเข้าประวัตุิแชทจาก AI Studio") }
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { vm.triggerKillSwitch() },
            colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
            modifier = Modifier.fillMaxWidth()
        ) { Text("\uD83D\uDEA8 Emergency Kill Switch") }
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = { vm.resumeSystem() },
            modifier = Modifier.fillMaxWidth()
        ) { Text("Resume System") }
    }
}

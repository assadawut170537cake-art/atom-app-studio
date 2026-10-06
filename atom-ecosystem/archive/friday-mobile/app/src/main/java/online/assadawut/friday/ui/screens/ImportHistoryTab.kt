package online.assadawut.friday.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import online.assadawut.friday.viewmodel.FridayMainViewModel

@Composable
fun ImportHistoryTab(
    vm: FridayMainViewModel,
    onDone: () -> Unit
) {
    var json by remember { mutableStateOf("") }
    val progress by vm.importProgress.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .background(Color.Black) // เป็น overlay ทับ tab อื่่น จิงต้องไมใ่โปร่งใส
    ) {
        Text(text = "นำเข้าประวัตุิแชท", color = Color(0xFFFF6B9D))
        Text(
            text = "วาง JSON จาก AI Studio ท่นี่ค่ะ",
            color = Color.LightGray,
            modifier = Modifier.padding(vertical = 8.dp)
        )
        TextField(
            value = json,
            onValueChange = { json = it },
            placeholder = { Text("[{\"role\":\"user\",\"parts\":[{\"text\":\"...\"}]}]") },
            modifier = Modifier.fillMaxWidth().weight(1f)
        )
        if (progress in 1..99) {
            LinearProgressIndicator(
                progress = { progress / 100f },
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
            )
            Text(text = "กำลังนำเข้า... $progress%", color = Color.White)
        }
        Row(modifier = Modifier.padding(top = 12.dp)) {
            Button(onClick = {
                if (json.isNotBlank()) {
                    vm.importGeminiHistory(json)
                }
            }) { Text("เริ่ มนำเข้้า") }
            Button(
                onClick = onDone,
                modifier = Modifier.padding(start = 8.dp)
            ) { Text("กลั บ") }
        }
    }
}

package online.assadawut.friday.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
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
fun ChatTab(vm: FridayMainViewModel) {
    val messages = vm.chat.collectAsState()
    var input by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        LazyColumn(modifier = Modifier.weight(1f)) {
            items(messages.value) { msg ->
                Text(
                    text = "${msg.role}: ${msg.message}",
                    color = if (msg.role == "assistant") Color(0xFFFF6B9D) else Color.White,
                    modifier = Modifier.padding(8.dp)
                )
            }
        }
        Row {
            TextField(
                value = input,
                onValueChange = { input = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("พิมพ์ข้อความ...") }
            )
            Button(onClick = {
                if (input.isNotBlank()) {
                    vm.sendChatMessage(input)
                    input = ""
                }
            }) { Text("ส่าง") }
        }
    }
}

package online.assadawut.friday.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import online.assadawut.friday.viewmodel.FridayMainViewModel

@Composable
fun SpecEditorTab(vm: FridayMainViewModel) {
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(text = "เขียนสเปก", color = Color(0xFFFF6B9D))
        TextField(
            value = title,
            onValueChange = { title = it },
            placeholder = { Text("ชื่อสเปกค่ะ") },
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
        )
        TextField(
            value = content,
            onValueChange = { content = it },
            placeholder = { Text("เขียนรายละเอียดสเปกท่นี่นะคะ...") },
            modifier = Modifier.fillMaxWidth().weight(1f).padding(top = 8.dp)
        )
        Row(modifier = Modifier.padding(top = 12.dp)) {
            Button(onClick = {
                if (title.isNotBlank() && content.isNotBlank()) {
                    vm.saveSpec(null, title, content)
                    title = ""
                    content = ""
                }
            }) { Text("บันทึก") }
        }
    }
}

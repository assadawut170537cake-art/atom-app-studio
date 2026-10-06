package online.assadawut.friday.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import online.assadawut.friday.viewmodel.FridayMainViewModel

@Composable
fun WorkspaceTab(
    vm: FridayMainViewModel,
    onNewSpec: () -> Unit
) {
    val specs by vm.specs.collectAsState(initial = emptyList())

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp)
    ) {
        Text(text = "เวิร์กสเปซ", color = Color(0xFFFF6B9D))
        Button(
            onClick = onNewSpec,
            modifier = Modifier.padding(vertical = 12.dp)
        ) { Text("+ สเปกใหม้") }
        if (specs.isEmpty()) {
            Text(text = "ยังไม่มีสเปกค่ะ", color = Color.Gray)
        } else {
            LazyColumn {
                items(specs) { spec ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A))
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(text = spec.title, color = Color.White)
                            Text(
                                text = spec.content.take(120),
                                color = Color.LightGray,
                                modifier = Modifier.padding(top = 6.dp)
                            )
                            Text(
                                text = if (spec.synced) "\u2713 synced" else "\u25CB draft",
                                color = if (spec.synced) Color(0xFF4CAF50) else Color(0xFFFFB74D),
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

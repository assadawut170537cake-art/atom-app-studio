package com.atom.ultronmobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.atom.ultronmobile.data.PresenceNode
import com.atom.ultronmobile.orb.Orb
import com.atom.ultronmobile.orb.OrbState

@Composable
fun AtomScreen(
    orbState: OrbState,
    online: Boolean,
    nodes: List<PresenceNode>,
    transcript: String,
    error: String?,
    onMicPress: () -> Unit,
    onKillSwitch: () -> Unit,
    onDismissError: () -> Unit
) {
    var confirmKill by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F14))
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // --- แถบสถานะ ---
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .width(10.dp)
                    .height(10.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(if (online) Color(0xFF3DFFA1) else Color(0xFFFF4D6D))
            )
            Spacer(Modifier.width(8.dp))
            Text(
                if (online) "CONNECTED — ${nodes.size} nodes" else "OFFLINE — retrying...",
                color = Color(0xFF8B98A5),
                fontSize = 13.sp,
                fontFamily = FontFamily.Monospace
            )
        }

        Spacer(Modifier.height(24.dp))
        Orb(state = orbState)
        Spacer(Modifier.height(8.dp))
        Text(
            orbState.name,
            color = Color(0xFFE6EDF3),
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            fontFamily = FontFamily.Monospace
        )

        if (transcript.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Text(
                transcript,
                color = Color(0xFF39C0FF),
                fontSize = 14.sp,
                fontFamily = FontFamily.Monospace
            )
        }

        if (error != null) {
            Spacer(Modifier.height(10.dp))
            Text(
                "(tap) $error",
                color = Color(0xFFFF4D6D),
                fontSize = 13.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .padding(6.dp)
                    .clickable(onClick = onDismissError)
            )
        }

        Spacer(Modifier.weight(1f))

        // --- Presence dashboard ---
        if (nodes.isNotEmpty()) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF121821))
                    .padding(10.dp)
            ) {
                items(nodes) { n ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                        Text(
                            n.nodeId,
                            color = Color(0xFFE6EDF3),
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            if (n.status == "active") "● active" else "○ " + n.status,
                            color = if (n.status == "active") Color(0xFF3DFFA1) else Color(0xFF8B98A5),
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }

        // --- ปุ่มควบคุม ---
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(
                onClick = onMicPress,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF14283C),
                    contentColor = Color(0xFF39C0FF)
                )
            ) {
                Text(
                    if (orbState == OrbState.LISTENING || orbState == OrbState.SPEAKING)
                        "หยุดฟัง" else "ฟัง ULTRON",
                    fontSize = 15.sp
                )
            }
            Button(
                onClick = {
                    if (confirmKill) {
                        onKillSwitch()
                        confirmKill = false
                    } else {
                        confirmKill = true
                    }
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (confirmKill) Color(0xFFFF4D6D) else Color(0xFF331620),
                    contentColor = Color(0xFFFF4D6D)
                )
            ) {
                Text(
                    if (confirmKill) "ยืนยัน: หยุดทุกอย่างเป็นการ!" else "KILL SWITCH",
                    fontSize = 15.sp
                )
            }
        }
        Spacer(Modifier.height(12.dp))

    }
}

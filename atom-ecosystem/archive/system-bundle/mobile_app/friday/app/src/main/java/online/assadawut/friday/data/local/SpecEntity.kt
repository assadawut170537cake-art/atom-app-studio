package online.assadawut.friday.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "friday_specs")
data class SpecEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val content: String,
    val tags: String = "",
    val updatedAt: Long = System.currentTimeMillis(),
    val synced: Boolean = false
)

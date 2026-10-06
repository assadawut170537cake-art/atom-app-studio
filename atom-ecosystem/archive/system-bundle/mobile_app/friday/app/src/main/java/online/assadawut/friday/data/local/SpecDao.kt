package online.assadawut.friday.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface SpecDao {
    @Query("SELECT * FROM friday_specs ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<SpecEntity>>

    @Query("SELECT * FROM friday_specs WHERE id = :id")
    suspend fun getById(id: Long): SpecEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(spec: SpecEntity): Long

    @Update
    suspend fun update(spec: SpecEntity)

    @Delete
    suspend fun delete(spec: SpecEntity)

    @Query("UPDATE friday_specs SET synced = 1 WHERE id = :id")
    suspend fun markSynced(id: Long)
}

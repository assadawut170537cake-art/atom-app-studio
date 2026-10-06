package online.assadawut.friday.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [SpecEntity::class],
    version = 1,
    exportSchema = false
)
abstract class FridayDatabase : RoomDatabase() {

    abstract fun specDao(): SpecDao

    companion object {
        @Volatile
        private var INSTANCE: FridayDatabase? = null

        fun get(context: Context): FridayDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    FridayDatabase::class.java,
                    "friday.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}

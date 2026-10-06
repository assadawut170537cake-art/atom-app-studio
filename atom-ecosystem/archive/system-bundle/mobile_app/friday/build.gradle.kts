plugins {
    id("com.android.application") version "8.5.2" apply false
    // หมายเหต: ขยับ Kotlin 1.9.24 -> 1.9.25 เพรา composeCompiler 1.5.15 ตองคูกับ Kotlin 1.9.25
    id("org.jetbrains.kotlin.android") version "1.9.25" apply false
    id("com.google.devtools.ksp") version "1.9.25-1.0.20" apply false
}

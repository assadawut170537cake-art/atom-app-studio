import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// ความลับทั้งหมดอ่านจาก local.properties (ไม่ commit) — ดู local.properties.example
val lp = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun secret(key: String, def: String = ""): String = lp.getProperty(key) ?: def
fun secretAny(def: String, vararg keys: String): String =
    keys.firstNotNullOfOrNull { lp.getProperty(it)?.takeIf { v -> v.isNotBlank() } } ?: def


android {
    namespace = "com.atom.ultronmobile"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.atom.ultronmobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 7
        versionName = "7.0-phase7"

        buildConfigField("String", "ATOM_BASE_URL", "\"${secretAny("https://assadawut-jarvis.online", "BASE_URL", "ATOM_BASE_URL")}\"")
        buildConfigField("String", "ATOM_SECRET", "\"${secret("ATOM_SECRET")}\"")
        buildConfigField("String", "NODE_ID", "\"${secret("NODE_ID", "MOBILE_S10")}\"")
        buildConfigField("String", "GEMINI_API_KEY", "\"${secret("GEMINI_API_KEY")}\"")
        buildConfigField("String", "GEMINI_LIVE_MODEL", "\"${secret("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-preview-09-2025")}\"")
    }

    buildFeatures { compose = true; buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}

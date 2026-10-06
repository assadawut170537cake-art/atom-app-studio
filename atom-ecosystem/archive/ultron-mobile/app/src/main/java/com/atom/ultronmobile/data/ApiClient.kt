package com.atom.ultronmobile.data

import com.atom.ultronmobile.BuildConfig
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val req = chain.request().newBuilder()
                .header("X-Atom-Secret", BuildConfig.ATOM_SECRET)
                .build()
            chain.proceed(req)
        }
        .build()

    /** สำหรบั Gemini Live WebSocket — ไม่มí read timeout, ส่ง ping เก็บไว */
    val wsClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)
        .pingInterval(15, TimeUnit.SECONDS)
        .build()

    val api: AtomApi = Retrofit.Builder()
        .baseUrl(BuildConfig.ATOM_BASE_URL + "/")
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(AtomApi::class.java)
}

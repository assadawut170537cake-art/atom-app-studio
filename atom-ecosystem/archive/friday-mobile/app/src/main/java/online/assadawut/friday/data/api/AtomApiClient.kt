package online.assadawut.friday.data.api

import online.assadawut.friday.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object AtomApiClient {

    private val authInterceptor = Interceptor { chain ->
        val request = chain.request()
            .newBuilder()
            .addHeader("X-Atom-Secret", BuildConfig.ATOM_SECRET)
            .build()
        chain.proceed(request)
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BASIC
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    val api: FridayApiService = Retrofit.Builder()
        .baseUrl(BuildConfig.BASE_URL + "/")
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(FridayApiService::class.java)
}

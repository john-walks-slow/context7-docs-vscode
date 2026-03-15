// Kotlin 示例
package com.example

import kotlinx.coroutines.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import io.ktor.server.application.*
import io.ktor.server.routing.*
import org.koin.java.KoinJavaComponent.inject
import com.squareup.moshi.Json

// 测试选中这些标识符来检测库
class MainActivity : AppCompatActivity() {
    private val viewModel: MainViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Coroutines
        lifecycleScope.launch {
            viewModel.loadData()
        }
    }
}

// Retrofit
val retrofit = Retrofit.Builder()
    .baseUrl("https://api.example.com")
    .addConverterFactory(GsonConverterFactory.create())
    .build()

// Ktor
fun Application.module() {
    routing {
        get("/hello") {
            call.respondText("Hello, World!")
        }
    }
}

// Koin
val service: MyService by inject(MyService::class.java)

// Moshi
@Json(name = "user_name")
val userName: String
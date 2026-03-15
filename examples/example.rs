// Rust 示例
use serde::{Deserialize, Serialize};
use tokio::runtime::Runtime;
use actix_web::{web, App, HttpServer, HttpResponse};
use diesel::prelude::*;
use tracing::info;
use anyhow::Result;

// 测试选中这些标识符来检测库
// Deserialize -> 应该识别为 serde
// Serialize -> 应该识别为 serde  
// web::Json -> 应该识别为 actix_web
// HttpResponse -> 应该识别为 actix_web
// Runtime -> 应该识别为 tokio

#[derive(Serialize, Deserialize)]
struct User {
    name: String,
    age: u32,
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().finish()
}

fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    info!("Server starting...");
    
    let rt = Runtime::new()?;
    rt.block_on(async {
        HttpServer::new(|| {
            App::new()
                .route("/health", web::get().to(health_check))
        })
        .bind("127.0.0.1:8080")?
        .run()
        .await?;
        Ok(())
    })
}
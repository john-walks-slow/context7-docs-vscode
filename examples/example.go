package main

import (
	"fmt"
	"net/http"
	gin "github.com/gin-gonic/gin"
	"gorm.io/gorm"
	zap "go.uber.org/zap"
)

// 测试选中这些标识符来检测库
// gin.Default() -> 选中 gin 或 Default 或 gin.Default 都应该识别
// zap.Info() -> 应该识别为 zap (uber 的日志库)

func main() {
	// gin 别名测试
	r := gin.Default()
	
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})
	
	// zap 别名测试
	logger, _ := zap.NewProduction()
	logger.Info("server started",
		zap.String("port", "8080"),
	)
	
	var db *gorm.DB
	fmt.Println(db)
}
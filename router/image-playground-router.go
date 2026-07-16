package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"

	"github.com/gin-gonic/gin"
)

// SetImagePlaygroundRouter registers the image studio separately from the
// chat playground so upstream UI changes do not couple the two features.
func SetImagePlaygroundRouter(router *gin.Engine) {
	imagePlaygroundRouter := router.Group("/pg/images")
	imagePlaygroundRouter.Use(middleware.RouteTag("relay"))
	imagePlaygroundRouter.Use(middleware.SystemPerformanceCheck())
	imagePlaygroundRouter.Use(middleware.UserAuth(), middleware.ImagePlaygroundGroup(), middleware.Distribute())
	{
		imagePlaygroundRouter.POST("/generations", controller.ImagePlayground)
		imagePlaygroundRouter.POST("/edits", controller.ImagePlayground)
	}
}

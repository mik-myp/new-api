package middleware

import (
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

const imagePlaygroundGroupHeader = "New-Api-Group"

// ImagePlaygroundGroup selects a user-accessible group without placing the
// internal group field in JSON or multipart bodies forwarded to providers.
func ImagePlaygroundGroup() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestedGroup := strings.TrimSpace(c.GetHeader(imagePlaygroundGroupHeader))
		if requestedGroup == "" {
			c.Next()
			return
		}

		usingGroup := common.GetContextKeyString(c, constant.ContextKeyUsingGroup)
		if !service.GroupInUserUsableGroups(usingGroup, requestedGroup) && requestedGroup != usingGroup {
			abortWithOpenAiMessage(c, http.StatusForbidden, i18n.T(c, i18n.MsgDistributorGroupAccessDenied))
			return
		}

		common.SetContextKey(c, constant.ContextKeyUsingGroup, requestedGroup)
		common.SetContextKey(c, constant.ContextKeyTokenGroup, requestedGroup)
		c.Next()
	}
}

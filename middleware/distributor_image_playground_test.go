package middleware

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetModelRequestFromImagePlayground(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("generation JSON", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/pg/images/generations", bytes.NewBufferString(`{"model":"gpt-image-2","prompt":"draw"}`))
		c.Request.Header.Set("Content-Type", "application/json")

		request, shouldSelectChannel, err := getModelRequest(c)
		require.NoError(t, err)
		assert.True(t, shouldSelectChannel)
		assert.Equal(t, "gpt-image-2", request.Model)
	})

	t.Run("edit multipart", func(t *testing.T) {
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		require.NoError(t, writer.WriteField("model", "gpt-image-2"))
		require.NoError(t, writer.WriteField("prompt", "edit"))
		part, err := writer.CreateFormFile("image", "input.png")
		require.NoError(t, err)
		_, err = part.Write([]byte("image"))
		require.NoError(t, err)
		require.NoError(t, writer.Close())

		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/pg/images/edits", &body)
		c.Request.Header.Set("Content-Type", writer.FormDataContentType())

		request, shouldSelectChannel, err := getModelRequest(c)
		require.NoError(t, err)
		assert.True(t, shouldSelectChannel)
		assert.Equal(t, "gpt-image-2", request.Model)
	})
}

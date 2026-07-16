package constant

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeRequestPath(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		path string
		want string
	}{
		{name: "chat playground", path: "/pg/chat/completions", want: "/v1/chat/completions"},
		{name: "image generation playground", path: "/pg/images/generations", want: "/v1/images/generations"},
		{name: "image edit playground", path: "/pg/images/edits", want: "/v1/images/edits"},
		{name: "regular relay", path: "/v1/responses", want: "/v1/responses"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.want, NormalizeRequestPath(tt.path))
		})
	}
}

func TestPath2RelayModeSupportsImagePlayground(t *testing.T) {
	t.Parallel()

	assert.Equal(t, RelayModeImagesGenerations, Path2RelayMode("/pg/images/generations"))
	assert.Equal(t, RelayModeImagesEdits, Path2RelayMode("/pg/images/edits"))
}

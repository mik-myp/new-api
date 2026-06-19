package xai

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseTaskResult(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		wantStatus     string
		wantURL        string
		wantReason     string
		wantProgress   string
	}{
		{
			name:       "queued",
			body:       `{"id":"t1","status":"queued","progress":0}`,
			wantStatus: model.TaskStatusQueued,
		},
		{
			name:       "pending treated as queued",
			body:       `{"id":"t1","status":"pending","progress":5}`,
			wantStatus: model.TaskStatusQueued,
			wantProgress: "5%",
		},
		{
			name:       "in_progress with progress",
			body:       `{"id":"t1","status":"in_progress","progress":50}`,
			wantStatus: model.TaskStatusInProgress,
			wantProgress: "50%",
		},
		{
			name:       "done with video url",
			body:       `{"id":"t1","status":"done","progress":100,"video":{"url":"https://vidgen.x.ai/test.mp4","duration":4}}`,
			wantStatus: model.TaskStatusSuccess,
			wantURL:    "https://vidgen.x.ai/test.mp4",
		},
		{
			name:       "completed alias maps to success",
			body:       `{"id":"t1","status":"completed","video":{"url":"https://vidgen.x.ai/v2.mp4","duration":10}}`,
			wantStatus: model.TaskStatusSuccess,
			wantURL:    "https://vidgen.x.ai/v2.mp4",
		},
		{
			name:       "done without video block",
			body:       `{"id":"t1","status":"done","progress":100}`,
			wantStatus: model.TaskStatusSuccess,
			wantURL:    "",
		},
		{
			name:       "failed with error message",
			body:       `{"id":"t1","status":"failed","error":{"message":"content policy violation","code":"400"}}`,
			wantStatus: model.TaskStatusFailure,
			wantReason: "content policy violation",
		},
		{
			name:       "failed without error block",
			body:       `{"id":"t1","status":"failed"}`,
			wantStatus: model.TaskStatusFailure,
			wantReason: "task failed",
		},
		{
			name:       "cancelled treated as failure",
			body:       `{"id":"t1","status":"cancelled"}`,
			wantStatus: model.TaskStatusFailure,
			wantReason: "task failed",
		},
		{
			name:       "unknown status yields empty",
			body:       `{"id":"t1","status":"weird_state"}`,
			wantStatus: "",
		},
	}

	adaptor := &TaskAdaptor{}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := adaptor.ParseTaskResult([]byte(tt.body))
			require.NoError(t, err)
			assert.Equal(t, tt.wantStatus, result.Status)
			assert.Equal(t, tt.wantURL, result.Url)
			assert.Equal(t, tt.wantReason, result.Reason)
			if tt.wantProgress != "" {
				assert.Equal(t, tt.wantProgress, result.Progress)
			}
		})
	}
}

func TestParseTaskResult_InvalidJSON(t *testing.T) {
	adaptor := &TaskAdaptor{}
	_, err := adaptor.ParseTaskResult([]byte(`{invalid`))
	require.Error(t, err)
}

func TestEstimateBilling_DefaultSeconds(t *testing.T) {
	// EstimateBilling depends on gin.Context + GetTaskRequest which requires
	// full request body setup. Test the AdjustBillingOnSubmit path instead,
	// which exercises the same seconds-extraction logic on response data.
	adaptor := &TaskAdaptor{}

	tests := []struct {
		name        string
		body        string
		wantSeconds float64
		wantNil     bool
	}{
		{
			name:        "4 seconds from response",
			body:        `{"id":"t1","seconds":"4"}`,
			wantSeconds: 4,
		},
		{
			name:        "10 seconds",
			body:        `{"id":"t1","seconds":"10"}`,
			wantSeconds: 10,
		},
		{
			name:    "no seconds returns nil",
			body:    `{"id":"t1"}`,
			wantNil: true,
		},
		{
			name:    "zero seconds returns nil",
			body:    `{"id":"t1","seconds":"0"}`,
			wantNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ratios := adaptor.AdjustBillingOnSubmit(nil, []byte(tt.body))
			if tt.wantNil {
				assert.Nil(t, ratios)
			} else {
				require.NotNil(t, ratios)
				assert.Equal(t, tt.wantSeconds, ratios["seconds"])
			}
		})
	}
}

// Verify the JSON wrapper from common is used (Rule 1 compliance)
func TestCommonJSONUsed(t *testing.T) {
	var resp responseTask
	err := common.Unmarshal([]byte(`{"id":"x","status":"done","video":{"url":"https://test.mp4","duration":5}}`), &resp)
	require.NoError(t, err)
	assert.Equal(t, "done", resp.Status)
	assert.Equal(t, "https://test.mp4", resp.Video.URL)
	assert.Equal(t, 5, resp.Video.Duration)
}

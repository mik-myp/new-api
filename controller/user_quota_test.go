package controller

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestComputeAdjustedUserQuota(t *testing.T) {
	tests := []struct {
		name     string
		oldQuota int
		mode     string
		value    int
		factor   float64
		want     int
	}{
		{name: "add", oldQuota: 1000, mode: "add", value: 250, want: 1250},
		{name: "subtract", oldQuota: 1000, mode: "subtract", value: 250, want: 750},
		{name: "override", oldQuota: 1000, mode: "override", value: 120, want: 120},
		{name: "multiply", oldQuota: 1000, mode: "multiply", factor: 1.5, want: 1500},
		{name: "divide", oldQuota: 1000, mode: "divide", factor: 4, want: 250},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := computeAdjustedUserQuota(tt.oldQuota, tt.mode, tt.value, tt.factor)

			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestComputeAdjustedUserQuotaRejectsInvalidInputs(t *testing.T) {
	tests := []struct {
		name   string
		mode   string
		value  int
		factor float64
	}{
		{name: "zero add", mode: "add"},
		{name: "zero subtract", mode: "subtract"},
		{name: "zero multiply factor", mode: "multiply"},
		{name: "negative divide factor", mode: "divide", factor: -1},
		{name: "unknown mode", mode: "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := computeAdjustedUserQuota(1000, tt.mode, tt.value, tt.factor)

			require.Error(t, err)
		})
	}
}

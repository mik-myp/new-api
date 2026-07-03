package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveGroupBillingAttemptOrder(t *testing.T) {
	tests := []struct {
		name       string
		preference string
		policy     groupBillingSourcePolicy
		want       []string
		wantErr    string
	}{
		{
			name:       "unconfigured groups keep existing subscription first behavior",
			preference: "subscription_first",
			policy:     groupBillingSourcePolicy{wallet: true, subscription: true},
			want:       []string{BillingSourceSubscription, BillingSourceWallet},
		},
		{
			name:       "wallet first tries wallet then subscription when both are allowed",
			preference: "wallet_first",
			policy:     groupBillingSourcePolicy{wallet: true, subscription: true},
			want:       []string{BillingSourceWallet, BillingSourceSubscription},
		},
		{
			name:       "wallet first falls through to subscription when wallet is not allowed",
			preference: "wallet_first",
			policy:     groupBillingSourcePolicy{subscription: true},
			want:       []string{BillingSourceSubscription},
		},
		{
			name:       "subscription first falls through to wallet when subscription is not allowed",
			preference: "subscription_first",
			policy:     groupBillingSourcePolicy{wallet: true},
			want:       []string{BillingSourceWallet},
		},
		{
			name:       "subscription only rejects wallet only groups",
			preference: "subscription_only",
			policy:     groupBillingSourcePolicy{wallet: true},
			wantErr:    "does not support subscription billing",
		},
		{
			name:       "wallet only rejects subscription only groups",
			preference: "wallet_only",
			policy:     groupBillingSourcePolicy{subscription: true},
			wantErr:    "does not support wallet billing",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveGroupBillingAttemptOrder(tt.preference, tt.policy)
			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestGroupBillingPolicyMismatchMessage(t *testing.T) {
	tests := []struct {
		name       string
		group      string
		preference string
		policy     groupBillingSourcePolicy
		want       []string
	}{
		{
			name:       "subscription only on wallet group",
			group:      "gpt-lite",
			preference: "subscription_only",
			policy:     groupBillingSourcePolicy{wallet: true},
			want: []string{
				"分组选择和扣费方式不匹配",
				"当前分组「gpt-lite」只允许钱包扣费",
				"当前扣费方式「仅使用订阅」要求订阅扣费",
				"这是分组类型与扣费方式的冲突",
				"改选支持订阅扣费的分组",
				"把扣费方式改为钱包",
			},
		},
		{
			name:       "wallet only on subscription group",
			group:      "gpt-subscribe",
			preference: "wallet_only",
			policy:     groupBillingSourcePolicy{subscription: true},
			want: []string{
				"分组选择和扣费方式不匹配",
				"当前分组「gpt-subscribe」只允许订阅扣费",
				"当前扣费方式「仅使用钱包」要求钱包扣费",
				"这是分组类型与扣费方式的冲突",
				"改选支持钱包扣费的分组",
				"把扣费方式改为订阅",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msg := groupBillingPolicyMismatchMessage(tt.group, tt.preference, tt.policy)
			for _, want := range tt.want {
				assert.Contains(t, msg, want)
			}
		})
	}
}

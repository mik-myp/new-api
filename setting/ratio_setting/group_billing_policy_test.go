package ratio_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateGroupBillingPolicyByJSONString(t *testing.T) {
	original := GroupBillingPolicy2JSONString()
	t.Cleanup(func() {
		require.NoError(t, UpdateGroupBillingPolicyByJSONString(original))
	})

	err := UpdateGroupBillingPolicyByJSONString(`{
		"gpt-lite": { "sources": ["wallet"] },
		"gpt-subscribe": { "sources": ["subscription", "wallet"] }
	}`)
	require.NoError(t, err)

	assert.Equal(t, []string{GroupBillingSourceWallet}, GetGroupBillingSources("gpt-lite"))
	assert.ElementsMatch(t, DefaultGroupBillingSources(), GetGroupBillingSources("gpt-subscribe"))
	assert.ElementsMatch(t, DefaultGroupBillingSources(), GetGroupBillingSources("unconfigured"))
}

func TestUpdateGroupBillingPolicyByJSONStringRejectsInvalidSources(t *testing.T) {
	original := GroupBillingPolicy2JSONString()
	t.Cleanup(func() {
		require.NoError(t, UpdateGroupBillingPolicyByJSONString(original))
	})

	require.NoError(t, UpdateGroupBillingPolicyByJSONString(`{
		"gpt-lite": { "sources": ["wallet"] }
	}`))

	err := UpdateGroupBillingPolicyByJSONString(`{
		"gpt-lite": { "sources": ["wallet"] },
		"bad": { "sources": ["credits"] }
	}`)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported billing source")
	assert.Equal(t, []string{GroupBillingSourceWallet}, GetGroupBillingSources("gpt-lite"))
}

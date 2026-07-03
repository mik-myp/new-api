package ratio_setting

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/QuantumNous/new-api/types"
)

const (
	GroupBillingPolicyConfigName = "group_billing_policy_setting"
	GroupBillingPolicyField      = "group_billing_policy"
	GroupBillingPolicyOptionKey  = GroupBillingPolicyConfigName + "." + GroupBillingPolicyField

	GroupBillingSourceWallet       = "wallet"
	GroupBillingSourceSubscription = "subscription"
)

type GroupBillingPolicyRule struct {
	Sources []string `json:"sources"`
}

type GroupBillingPolicySetting struct {
	GroupBillingPolicy *types.RWMap[string, GroupBillingPolicyRule] `json:"group_billing_policy"`
}

var groupBillingPolicyMap = types.NewRWMap[string, GroupBillingPolicyRule]()

var groupBillingPolicySetting = GroupBillingPolicySetting{
	GroupBillingPolicy: groupBillingPolicyMap,
}

func init() {
	config.GlobalConfig.Register(GroupBillingPolicyConfigName, &groupBillingPolicySetting)
}

func DefaultGroupBillingSources() []string {
	return []string{GroupBillingSourceWallet, GroupBillingSourceSubscription}
}

func GetGroupBillingSources(group string) []string {
	rule, ok := groupBillingPolicyMap.Get(strings.TrimSpace(group))
	if !ok {
		return DefaultGroupBillingSources()
	}

	sources, err := normalizeGroupBillingSources(rule.Sources)
	if err != nil {
		common.SysLog(fmt.Sprintf("invalid group billing policy for %s: %s", group, err.Error()))
		return DefaultGroupBillingSources()
	}
	return sources
}

func GroupBillingPolicy2JSONString() string {
	return groupBillingPolicyMap.MarshalJSONString()
}

func UpdateGroupBillingPolicyByJSONString(jsonStr string) error {
	if strings.TrimSpace(jsonStr) == "" {
		jsonStr = "{}"
	}

	checkPolicy := make(map[string]GroupBillingPolicyRule)
	if err := common.UnmarshalJsonStr(jsonStr, &checkPolicy); err != nil {
		return err
	}

	normalized := make(map[string]GroupBillingPolicyRule, len(checkPolicy))
	for group, rule := range checkPolicy {
		sources, err := normalizeGroupBillingSources(rule.Sources)
		if err != nil {
			return fmt.Errorf("%s: %w", group, err)
		}
		normalized[strings.TrimSpace(group)] = GroupBillingPolicyRule{Sources: sources}
	}

	groupBillingPolicyMap.Clear()
	groupBillingPolicyMap.AddAll(normalized)
	return nil
}

func normalizeGroupBillingSources(sources []string) ([]string, error) {
	if len(sources) == 0 {
		return nil, fmt.Errorf("billing sources are required")
	}

	allowed := make(map[string]bool, len(sources))
	for _, source := range sources {
		switch strings.TrimSpace(strings.ToLower(source)) {
		case GroupBillingSourceWallet:
			allowed[GroupBillingSourceWallet] = true
		case GroupBillingSourceSubscription:
			allowed[GroupBillingSourceSubscription] = true
		default:
			return nil, fmt.Errorf("unsupported billing source %q", source)
		}
	}

	normalized := make([]string, 0, len(allowed))
	for _, source := range DefaultGroupBillingSources() {
		if allowed[source] {
			normalized = append(normalized, source)
		}
	}
	return normalized, nil
}

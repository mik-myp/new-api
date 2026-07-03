package service

import "fmt"

type groupBillingSourcePolicy struct {
	wallet       bool
	subscription bool
}

func newGroupBillingSourcePolicy(sources []string) groupBillingSourcePolicy {
	policy := groupBillingSourcePolicy{}
	for _, source := range sources {
		switch source {
		case BillingSourceWallet:
			policy.wallet = true
		case BillingSourceSubscription:
			policy.subscription = true
		}
	}
	return policy
}

func resolveGroupBillingAttemptOrder(preference string, policy groupBillingSourcePolicy) ([]string, error) {
	if !policy.wallet && !policy.subscription {
		return nil, fmt.Errorf("selected group has no available billing sources")
	}

	switch preference {
	case "wallet_only":
		if !policy.wallet {
			return nil, fmt.Errorf("selected group does not support wallet billing")
		}
		return []string{BillingSourceWallet}, nil
	case "subscription_only":
		if !policy.subscription {
			return nil, fmt.Errorf("selected group does not support subscription billing")
		}
		return []string{BillingSourceSubscription}, nil
	case "wallet_first":
		return appendAllowedBillingSources(policy, BillingSourceWallet, BillingSourceSubscription), nil
	default:
		return appendAllowedBillingSources(policy, BillingSourceSubscription, BillingSourceWallet), nil
	}
}

func appendAllowedBillingSources(policy groupBillingSourcePolicy, preferred string, fallback string) []string {
	sources := make([]string, 0, 2)
	if groupBillingSourceAllowed(policy, preferred) {
		sources = append(sources, preferred)
	}
	if groupBillingSourceAllowed(policy, fallback) {
		sources = append(sources, fallback)
	}
	return sources
}

func groupBillingSourceAllowed(policy groupBillingSourcePolicy, source string) bool {
	switch source {
	case BillingSourceWallet:
		return policy.wallet
	case BillingSourceSubscription:
		return policy.subscription
	default:
		return false
	}
}

func groupBillingPolicyMismatchMessage(group string, preference string, policy groupBillingSourcePolicy) string {
	groupName := group
	if groupName == "" {
		groupName = "default"
	}

	requiredSource := "可用"
	switch preference {
	case "subscription_only":
		requiredSource = "订阅扣费"
	case "wallet_only":
		requiredSource = "钱包扣费"
	default:
		requiredSource = "当前优先级中的扣费来源"
	}

	return fmt.Sprintf(
		"分组选择和扣费方式不匹配：当前分组「%s」只允许%s，当前扣费方式「%s」要求%s。这是分组类型与扣费方式的冲突，请改选支持%s的分组，或把扣费方式改为%s。",
		groupName,
		describeGroupBillingPolicy(policy),
		describeBillingPreference(preference),
		requiredSource,
		requiredSource,
		suggestBillingPreference(policy),
	)
}

func describeGroupBillingPolicy(policy groupBillingSourcePolicy) string {
	if policy.wallet && policy.subscription {
		return "钱包扣费和订阅扣费"
	}
	if policy.wallet {
		return "钱包扣费"
	}
	if policy.subscription {
		return "订阅扣费"
	}
	return "未配置可用扣费来源"
}

func describeBillingPreference(preference string) string {
	switch preference {
	case "wallet_only":
		return "仅使用钱包"
	case "wallet_first":
		return "优先使用钱包"
	case "subscription_only":
		return "仅使用订阅"
	default:
		return "优先使用订阅"
	}
}

func suggestBillingPreference(policy groupBillingSourcePolicy) string {
	if policy.wallet && policy.subscription {
		return "优先钱包或优先订阅"
	}
	if policy.wallet {
		return "钱包"
	}
	if policy.subscription {
		return "订阅"
	}
	return "管理员配置的可用扣费方式"
}

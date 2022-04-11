// Copyright (c) 2021 Gitpod GmbH. All rights reserved.
// Licensed under the GNU Affero General Public License (AGPL).
// See License-AGPL.txt in the project root for license information.

// experimental bundles all internal bits of configuration for which we do not offer
// support. We use those flags internally to operate SaaS, but do not expect anyone
// outside of Gitpod to use.
//
// Changes in this section will NOT be backwards compatible change at will without prior notice.
// If you use any setting herein, you forfeit support from Gitpod.
package experimental

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

// Config contains all experimental configuration.
type Config struct {
	Workspace *WorkspaceConfig `json:"workspace,omitempty"`
	WebApp    *WebAppConfig    `json:"webapp,omitempty"`
	IDE       *IDEConfig       `json:"ide,omitempty"`
}

type WorkspaceConfig struct {
	Tracing *Tracing `json:"tracing,omitempty"`
	Stage   string   `json:"stage"`

	CPULimits struct {
		Enabled          bool              `json:"enabled"`
		NodeCPUBandwidth resource.Quantity `json:"nodeBandwidth"`
		Limit            resource.Quantity `json:"limit"`
		BurstLimit       resource.Quantity `json:"burstLimit"`
	}

	RegistryFacade struct {
		IPFSCache struct {
			Enabled  bool   `json:"enabled"`
			IPFSAddr string `json:"ipfsAddr"`
		} `json:"ipfsCache"`
		RedisCache struct {
			Enabled        bool     `json:"enabled"`
			MasterName     string   `json:"masterName"`
			SentinelAddrs  []string `json:"sentinelAddrs"`
			Username       string   `json:"username"`
			PasswordSecret string   `json:"passwordSecret"`
		} `json:"redisCache"`
	} `json:"registryFacade"`

	WorkspaceClasses map[string]WorkspaceClass `json:"classes,omitempty"`
}

type WorkspaceClass struct {
	Resources struct {
		Requests corev1.ResourceList `json:"requests" validate:"required"`
		Limits   corev1.ResourceList `json:"limits,omitempty"`
	} `json:"resources" validate:"required"`
	Templates WorkspaceTemplates `json:"templates,omitempty"`
}
type WorkspaceTemplates struct {
	Default    *corev1.Pod `json:"default"`
	Prebuild   *corev1.Pod `json:"prebuild"`
	ImageBuild *corev1.Pod `json:"imagebuild"`
	Regular    *corev1.Pod `json:"regular"`
}

type WebAppConfig struct {
}

type IDEConfig struct {
	// Disable resolution of latest images and use bundled latest versions instead
	ResolveLatest *bool `json:"resolveLatest,omitempty"`
}

type TracingSampleType string

type Tracing struct {
	SamplerType  *TracingSampleType `json:"samplerType,omitempty" validate:"omitempty,tracing_sampler_type"`
	SamplerParam *float64           `json:"samplerParam,omitempty" validate:"required_with=SamplerType"`
}

// Values taken from https://github.com/jaegertracing/jaeger-client-go/blob/967f9c36f0fa5a2617c9a0993b03f9a3279fadc8/config/config.go#L71
const (
	TracingSampleTypeConst         TracingSampleType = "const"
	TracingSampleTypeProbabilistic TracingSampleType = "probabilistic"
	TracingSampleTypeRateLimiting  TracingSampleType = "rateLimiting"
	TracingSampleTypeRemote        TracingSampleType = "remote"
)

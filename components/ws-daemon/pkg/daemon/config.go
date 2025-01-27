// Copyright (c) 2020 Gitpod GmbH. All rights reserved.
// Licensed under the GNU Affero General Public License (AGPL).
// See License-AGPL.txt in the project root for license information.

package daemon

import (
	"github.com/gitpod-io/gitpod/ws-daemon/pkg/container"
	"github.com/gitpod-io/gitpod/ws-daemon/pkg/content"
	"github.com/gitpod-io/gitpod/ws-daemon/pkg/cpulimit"
	"github.com/gitpod-io/gitpod/ws-daemon/pkg/diskguard"
	"github.com/gitpod-io/gitpod/ws-daemon/pkg/hosts"
	"github.com/gitpod-io/gitpod/ws-daemon/pkg/iws"
	"k8s.io/apimachinery/pkg/api/resource"
)

// Config configures the workspace node daemon
type Config struct {
	Runtime RuntimeConfig `json:"runtime"`

	Content        content.Config      `json:"content"`
	Uidmapper      iws.UidmapperConfig `json:"uidmapper"`
	CPULimit       cpulimit.Config     `json:"cpulimit"`
	IOLimit        IOLimitConfig       `json:"ioLimit"`
	Hosts          hosts.Config        `json:"hosts"`
	DiskSpaceGuard diskguard.Config    `json:"disk"`
}

type RuntimeConfig struct {
	Container           *container.Config `json:"containerRuntime"`
	Kubeconfig          string            `json:"kubeconfig"`
	KubernetesNamespace string            `json:"namespace"`
}

type IOLimitConfig struct {
	WriteBWPerSecond resource.Quantity `json:"writeBandwidthPerSecond"`
	ReadBWPerSecond  resource.Quantity `json:"readBandwidthPerSecond"`
	WriteIOPS        int64             `json:"writeIOPS"`
	ReadIOPS         int64             `json:"readIOPS"`
}

// Copyright (c) 2022 Gitpod GmbH. All rights reserved.
// Licensed under the MIT License. See License-MIT.txt in the project root for license information.

package public_api_server

import (
	"github.com/gitpod-io/gitpod/common-go/log"
	"github.com/gitpod-io/gitpod/installer/pkg/common"
	"k8s.io/apimachinery/pkg/runtime"
)

var Objects = common.RenderFunc(func(ctx *common.RenderContext) ([]runtime.Object, error) {
	cfg := getExperimentalPublicAPIConfig(ctx)
	if cfg == nil {
		return nil, nil
	}

	log.Debug("Detected experimental.WebApp.PublicApi configuration", cfg)
	return common.CompositeRenderFunc(
		deployment,
		rolebinding,
		common.DefaultServiceAccount(Component),
		service,
	)(ctx)
})

package public_api_server

import (
	"github.com/gitpod-io/gitpod/installer/pkg/common"
	"k8s.io/apimachinery/pkg/runtime"
)

func service(ctx *common.RenderContext) ([]runtime.Object, error) {
	if cfg := getExperimentalPublicAPIConfig(ctx); cfg == nil {
		return nil, nil
	}

	return common.GenerateService(Component, map[string]common.ServicePort{
		PortName: {
			ContainerPort: ContainerPort,
			ServicePort:   ServicePort,
		},
	})(ctx)
}

package public_api_server

import (
	"github.com/gitpod-io/gitpod/installer/pkg/common"
	"k8s.io/apimachinery/pkg/runtime"
)

func service(ctx *common.RenderContext) ([]runtime.Object, error) {

	return common.GenerateService(Component, map[string]common.ServicePort{
		PortName: {
			ContainerPort: ContainerPort,
			ServicePort:   ServicePort,
		},
	}), nil
}

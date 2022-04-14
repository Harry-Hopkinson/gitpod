package public_api_server

import (
	"github.com/gitpod-io/gitpod/installer/pkg/common"
	"github.com/gitpod-io/gitpod/installer/pkg/config/v1"
	"github.com/gitpod-io/gitpod/installer/pkg/config/versions"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestDeployment_NoObjects_WhenExperimentalConfigNotSet(t *testing.T) {
	ctx, err := common.NewRenderContext(config.Config{}, versions.Manifest{}, "test-namespace")
	require.NoError(t, err)
	objects, err := deployment(ctx)
	require.Nil(t, objects, "must not render any objects when experimental config is not specified")
}

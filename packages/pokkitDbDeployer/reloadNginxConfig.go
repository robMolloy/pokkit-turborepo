package pokkitDbDeployer

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbUtils"
)

func ReloadNginxConfig(app pbCore.App) error {
	err := pokkitDbUtils.ExecuteBashCommand("systemctl reload nginx")
	if err != nil {
		return fmt.Errorf("Error reloading nginx with new config in reloadNginxConfig: %w", err)
	}
	return nil
}

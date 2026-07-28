package pokkitDbConfigSync

import (
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
)

func ImportEnvVarsFromSecretsFile(app pbCore.App) error {
	configDirPath := GetConfigDirPath(app)
	secretsFilePath := configDirPath + "/" + SecretsFileName

	obj, err := utils.ReadJsonFromFile(secretsFilePath)
	if err != nil {
		return fmt.Errorf("cannot read json from %s: %w", secretsFilePath, err)
	}

	for key, value := range obj {
		strValue := fmt.Sprintf("%v", value)
		os.Setenv(key, strValue)
	}

	return nil
}

func OnServeImportEnvVarsFromSecretsFileHandler(se *pbCore.ServeEvent) error {
	err := ImportEnvVarsFromSecretsFile(se.App)
	if err != nil {
		se.App.Logger().Error("ImportEnvVarsFromSecretsFile", "err", err)
	}

	return se.Next()
}

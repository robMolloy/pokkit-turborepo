package pokkitDbDeployer

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

const lowestPortNumber = 9000

func getNextDeploymentPortNumber(app pbCore.App) (int, error) {
	highestPortNumber := 0
	deployPokkitDbFilesRecords, err := FindDeployPokkitDbFilesRecordsByFilter(app, "", "-portNumber", 1, 0)
	if err != nil {
		return 0, fmt.Errorf("error returned from FindDeployPokkitDbFilesRecordsByFilter in getNextPortNumber: %w", err)
	}

	if len(deployPokkitDbFilesRecords) > 0 {
		highestPortNumber = deployPokkitDbFilesRecords[0].getPortNumber()
	}

	nextPortNumber := highestPortNumber + 1
	if nextPortNumber < lowestPortNumber {
		return lowestPortNumber, nil
	}
	return nextPortNumber, nil
}

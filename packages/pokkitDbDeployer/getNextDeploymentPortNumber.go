package pokkitDbDeployer

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

const lowestPortNumber = 9000

func getNextDeploymentPortNumber(app pbCore.App) (int, error) {
	records, err := app.FindRecordsByFilter(
		deploymentsCollectionName,
		"",
		"-portNumber",
		1,
		0,
	)
	if err != nil {
		return 0, fmt.Errorf("error returned from app.FindRecordsByFilter in getNextPortNumber: %w", err)
	}

	highestPortNumber := 0
	if len(records) > 0 {
		highestPortNumber = records[0].GetInt("portNumber")
	}

	nextPortNumber := highestPortNumber + 1
	if nextPortNumber < lowestPortNumber {
		return lowestPortNumber, nil
	}
	return nextPortNumber, nil
}

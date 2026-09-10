package pokkitDbDeployer

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

const MIN_PORT_NUMBER = 11001

func getHighestDeploymentPortNumber(app pbCore.App) (int, error) {
	highestPortNumber := 0
	deployPokkitDbFilesRecords, err := FindDeployPokkitDbFilesRecordsByFilter(app, "", "-portNumber", 1, 0)
	if err != nil {
		return 0, fmt.Errorf("error returned from FindDeployPokkitDbFilesRecordsByFilter in getHighestDeploymentPortNumber: %w", err)
	}

	if len(deployPokkitDbFilesRecords) == 1 {
		portNumber := deployPokkitDbFilesRecords[0].getPortNumber()
		if portNumber > highestPortNumber {
			highestPortNumber = portNumber
		}
	}

	deployPokkitDbFilesRecords, err = FindDeployPokkitDbFilesRecordsByFilter(app, "", "-sslPortNumber", 1, 0)
	if err != nil {
		return 0, fmt.Errorf("error returned from FindDeployPokkitDbFilesRecordsByFilter in getHighestDeploymentPortNumber: %w", err)
	}

	if len(deployPokkitDbFilesRecords) == 1 {
		portNumber := deployPokkitDbFilesRecords[0].getSslPortNumber()
		if portNumber > highestPortNumber {
			highestPortNumber = portNumber
		}
	}

	deployViteFilesRecords, err := FindDeployViteFilesRecordsByFilter(app, "", "-portNumber", 1, 0)
	if err != nil {
		return 0, fmt.Errorf("error returned from FindDeployViteFilesRecordsByFilter in getHighestDeploymentPortNumber: %w", err)
	}

	if len(deployViteFilesRecords) == 1 {
		portNumber := deployViteFilesRecords[0].getPortNumber()
		if portNumber > highestPortNumber {
			highestPortNumber = portNumber
		}
	}

	deployViteFilesRecords, err = FindDeployViteFilesRecordsByFilter(app, "", "-sslPortNumber", 1, 0)
	if err != nil {
		return 0, fmt.Errorf("error returned from FindDeployViteFilesRecordsByFilter in getHighestDeploymentPortNumber: %w", err)
	}

	if len(deployViteFilesRecords) == 1 {
		portNumber := deployViteFilesRecords[0].getSslPortNumber()
		if portNumber > highestPortNumber {
			highestPortNumber = portNumber
		}
	}

	return highestPortNumber, nil
}

func getTruncatedHighestDeploymentPortNumber(app pbCore.App) (int, error) {
	highestPortNumber, err := getHighestDeploymentPortNumber(app)
	if err != nil {
		return 0, fmt.Errorf("error returned from getHighestDeploymentPortNumber in getTruncatedHighestDeploymentPortNumber: %w", err)
	}

	truncatedHighestPortNumber := (func() int {
		if highestPortNumber < MIN_PORT_NUMBER {
			return MIN_PORT_NUMBER
		}

		return highestPortNumber
	})()

	return truncatedHighestPortNumber, nil
}

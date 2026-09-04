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

	return highestPortNumber, nil
}

func assignMissingDeploymentPortNumbers(app pbCore.App, record *deployPokkitDbFilesRecord) error {
	if record.getPortNumber() != 0 && record.getSslPortNumber() != 0 {
		return nil
	}

	highestPortNumber, err := getHighestDeploymentPortNumber(app)
	if err != nil {
		return err
	}
	if portNumber := record.getPortNumber(); portNumber > highestPortNumber {
		highestPortNumber = portNumber
	}
	if sslPortNumber := record.getSslPortNumber(); sslPortNumber > highestPortNumber {
		highestPortNumber = sslPortNumber
	}

	nextPortNumber := func() int {
		if highestPortNumber < MIN_PORT_NUMBER {
			highestPortNumber = MIN_PORT_NUMBER - 1
		}
		highestPortNumber++
		return highestPortNumber
	}

	if record.getPortNumber() == 0 {
		record.setPortNumber(nextPortNumber())
	}
	if record.getSslPortNumber() == 0 {
		record.setSslPortNumber(nextPortNumber())
	}

	return nil
}

package pokkitDbDeployer

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func ServePb(pbFilePath string, pbPortNumber int, logFilePath string) (*exec.Cmd, error) {
	if _, err := os.Stat(pbFilePath); err != nil {
		return nil, fmt.Errorf("servePb: pbFile does not exist: %s", pbFilePath)
	}

	if err := os.MkdirAll(filepath.Dir(logFilePath), 0755); err != nil {
		return nil, err
	}

	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, err
	}

	cmd := exec.Command(pbFilePath, "serve", fmt.Sprintf("--http=0.0.0.0:%d", pbPortNumber), "--dev")
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if err := cmd.Start(); err != nil {
		logFile.Close()
		return nil, err
	}

	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		b, err := os.ReadFile(logFilePath)
		if err != nil {
			cmd.Process.Kill()
			return nil, err
		}
		if strings.Contains(string(b), "Server started at") {
			return cmd, nil
		}
		time.Sleep(50 * time.Millisecond)
	}

	cmd.Process.Kill()
	return nil, fmt.Errorf("servePb: timed out waiting for pocketbase to start")
}

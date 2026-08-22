package pokkitDbDeployer

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ServePbResult struct {
	Cmd        *exec.Cmd
	DbUrl      string
	DbServeUrl string
}

func ServePb(pbFilePath string, pbPortNumber int, logFilePath string) (*ServePbResult, error) {
	if _, err := os.Stat(pbFilePath); err != nil {
		return nil, fmt.Errorf("servePb: pbFile does not exist: %s", pbFilePath)
	}

	if err := os.MkdirAll(filepath.Dir(logFilePath), 0755); err != nil {
		return nil, fmt.Errorf("failed to os.MkdirAll(filepath.Dir(logFilePath), 0755) in ServePb: %w", err)
	}

	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644) in ServePb: %w", err)
	}

	dbServeUrl := fmt.Sprintf("0.0.0.0:%d", pbPortNumber)
	dbUrl := fmt.Sprintf("http://0.0.0.0:%d", pbPortNumber)

	cmd := exec.Command(pbFilePath, "serve", "--http="+dbServeUrl, "--dev")
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if err := cmd.Start(); err != nil {
		logFile.Close()
		return nil, fmt.Errorf("failed to cmd.Start() in ServePb: %w", err)
	}

	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	timeout := time.After(30 * time.Second)
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case err := <-done:
			if err != nil {
				return nil, fmt.Errorf("pocketbase exited before server started in ServePb: %w", err)
			}
			return nil, fmt.Errorf("pocketbase exited before server started in ServePb")
		case <-timeout:
			cmd.Process.Kill()
			return nil, fmt.Errorf("timed out waiting for pocketbase to start in ServePb")
		case <-ticker.C:
			b, err := os.ReadFile(logFilePath)
			if err != nil {
				cmd.Process.Kill()
				return nil, fmt.Errorf("failed to os.ReadFile(logFilePath) in ServePb: %w", err)
			}
			if strings.Contains(string(b), "Server started at") {
				return &ServePbResult{
					Cmd:        cmd,
					DbUrl:      dbUrl,
					DbServeUrl: dbServeUrl,
				}, nil
			}
		}
	}
}

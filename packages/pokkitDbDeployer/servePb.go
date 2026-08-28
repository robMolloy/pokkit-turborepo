package pokkitDbDeployer

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
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
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		logFile.Close()
		return nil, fmt.Errorf("failed to cmd.StdoutPipe() in ServePb: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		logFile.Close()
		return nil, fmt.Errorf("failed to cmd.StderrPipe() in ServePb: %w", err)
	}

	if err := cmd.Start(); err != nil {
		logFile.Close()
		return nil, fmt.Errorf("failed to cmd.Start() in ServePb: %w", err)
	}

	var logMu sync.Mutex
	writeLog := func(line string) {
		logMu.Lock()
		defer logMu.Unlock()
		_, _ = fmt.Fprintln(logFile, line)
	}

	started := make(chan struct{})
	var startedOnce sync.Once
	onLine := func(line string) {
		if strings.Contains(line, "Server started at") {
			startedOnce.Do(func() { close(started) })
		}
	}

	go copyPbOutput(stdout, writeLog, onLine)
	go copyPbOutput(stderr, writeLog, onLine)

	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	select {
	case <-started:
		return &ServePbResult{
			Cmd:        cmd,
			DbUrl:      dbUrl,
			DbServeUrl: dbServeUrl,
		}, nil
	case err := <-done:
		if err != nil {
			return nil, fmt.Errorf("pocketbase exited before server started in ServePb: %w", err)
		}
		return nil, fmt.Errorf("pocketbase exited before server started in ServePb")
	case <-time.After(30 * time.Second):
		cmd.Process.Kill()
		return nil, fmt.Errorf("timed out waiting for pocketbase to start in ServePb")
	}
}

func copyPbOutput(r io.Reader, writeLog func(string), onLine func(string)) error {
	scanner := bufio.NewScanner(r)
	err := scanner.Err()
	if err != nil {
		return fmt.Errorf("failed to scanner.Err() in copyPbOutput: %w", err)
	}
	for scanner.Scan() {
		line := scanner.Text()
		writeLog(line)
		onLine(line)
	}
	return nil
}

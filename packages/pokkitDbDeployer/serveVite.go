package pokkitDbDeployer

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type ServeViteResult struct {
	Cmd *exec.Cmd
}

func ServeVite(distParentDirPath string, portNumber int, logFilePath string) (*ServeViteResult, error) {
	if _, err := os.Stat(distParentDirPath); err != nil {
		return nil, fmt.Errorf("serveVite: file does not exist: %s", distParentDirPath)
	}

	if err := os.MkdirAll(filepath.Dir(logFilePath), 0755); err != nil {
		return nil, fmt.Errorf("failed to os.MkdirAll(filepath.Dir(logFilePath), 0755) in ServePb: %w", err)
	}

	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644) in ServePb: %w", err)
	}

	cmd := exec.Command("npx vite preview " + distParentDirPath + " --port " + strconv.Itoa(portNumber) + " --host")
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		logFile.Close()
		return nil, fmt.Errorf("failed to cmd.StdoutPipe() in ServeVite: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		logFile.Close()
		return nil, fmt.Errorf("failed to cmd.StderrPipe() in ServeVite: %w", err)
	}

	if err := cmd.Start(); err != nil {
		logFile.Close()
		return nil, fmt.Errorf("failed to cmd.Start() in ServeVite: %w", err)
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
		if strings.Contains(line, "http://localhost:") {
			startedOnce.Do(func() { close(started) })
		}
	}

	go cmdOutputHandler(stdout, writeLog, onLine)
	go cmdOutputHandler(stderr, writeLog, onLine)

	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	select {
	case <-started:
		return &ServeViteResult{
			Cmd: cmd,
		}, nil
	case err := <-done:
		if err != nil {
			return nil, fmt.Errorf("vite serve command exited before it started: %w", err)
		}
		return nil, fmt.Errorf("vite serve command exited before it started")
	case <-time.After(30 * time.Second):
		cmd.Process.Kill()
		return nil, fmt.Errorf("timed out waiting for pocketbase to start in ServePb")
	}
}

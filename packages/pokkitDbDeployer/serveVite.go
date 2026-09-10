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
		return nil, fmt.Errorf("serveVite: dist parent dir does not exist: %s", distParentDirPath)
	}

	distParentDirPath, err := filepath.Abs(distParentDirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to filepath.Abs(distParentDirPath) in ServeVite: %w", err)
	}

	distDirPath := filepath.Join(distParentDirPath, "dist")
	if _, err := os.Stat(distDirPath); err != nil {
		return nil, fmt.Errorf("serveVite: dist dir does not exist: %s", distDirPath)
	}

	logFilePath, err = filepath.Abs(logFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to filepath.Abs(logFilePath) in ServeVite: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(logFilePath), 0755); err != nil {
		return nil, fmt.Errorf("failed to os.MkdirAll(filepath.Dir(logFilePath), 0755) in ServeVite: %w", err)
	}

	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644) in ServeVite: %w", err)
	}

	configPath := filepath.Join(distParentDirPath, "vite.config.mjs")
	if err := os.WriteFile(configPath, []byte("export default {}\n"), 0644); err != nil {
		logFile.Close()
		return nil, fmt.Errorf("failed to write vite config in ServeVite: %w", err)
	}

	port := strconv.Itoa(portNumber)
	cmd := exec.Command(
		"npx",
		"--yes",
		"vite",
		"preview",
		distParentDirPath,
		"--config", configPath,
		"--outDir", distDirPath,
		"--port", port,
		"--host", "0.0.0.0",
		"--strictPort",
	)
	cmd.Dir = distParentDirPath

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
		if isVitePreviewReady(line) {
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
			return nil, fmt.Errorf("vite preview exited before it started in ServeVite: %w", err)
		}
		return nil, fmt.Errorf("vite preview exited before it started in ServeVite")
	case <-time.After(30 * time.Second):
		cmd.Process.Kill()
		return nil, fmt.Errorf("timed out waiting for vite preview to start in ServeVite")
	}
}

func isVitePreviewReady(line string) bool {
	return strings.Contains(line, "Local:") ||
		strings.Contains(line, "http://localhost:") ||
		strings.Contains(line, "http://127.0.0.1:") ||
		strings.Contains(line, "http://0.0.0.0:")
}

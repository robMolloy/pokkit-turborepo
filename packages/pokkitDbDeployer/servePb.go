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
)

type ServePbResult struct {
	Cmd        *exec.Cmd
	DbUrl      string
	DbServeUrl string
}

func getPbServeAddress(portNumber int) string {
	return fmt.Sprintf("0.0.0.0:%d", portNumber)
}

func getPbServeUrl(pbPortNumber int) string {
	return fmt.Sprintf("http://0.0.0.0:%d", pbPortNumber)
}

func ServePb(pbFilePath string, pbPortNumber int, logFilePath string) (*ServePbResult, error) {
	if _, err := os.Stat(pbFilePath); err != nil {
		return nil, fmt.Errorf("servePb: pbFile does not exist: %s", pbFilePath)
	}

	dbServeUrl := getPbServeAddress(pbPortNumber)
	dbUrl := getPbServeUrl(pbPortNumber)

	cmd := exec.Command(pbFilePath, "serve", "--http="+dbServeUrl, "--dev")

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to cmd.StdoutPipe() in ServePb: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to cmd.StderrPipe() in ServePb: %w", err)
	}

	var logFile *os.File
	if logFilePath != "" {
		if err := os.MkdirAll(filepath.Dir(logFilePath), 0755); err != nil {
			return nil, fmt.Errorf("failed to os.MkdirAll(filepath.Dir(logFilePath), 0755) in ServePb: %w", err)
		}

		logFile, err = os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil {
			return nil, fmt.Errorf("failed to os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644) in ServePb: %w", err)
		}
	}

	if err := cmd.Start(); err != nil {
		if logFile != nil {
			logFile.Close()
		}
		return nil, fmt.Errorf("failed to cmd.Start() in ServePb: %w", err)
	}

	var logMu sync.Mutex
	writeLog := func(prefix string, data string) {
		if logFile == nil {
			return
		}
		logMu.Lock()
		defer logMu.Unlock()
		_, _ = logFile.WriteString(prefix + data)
		if !strings.HasSuffix(data, "\n") {
			_, _ = logFile.WriteString("\n")
		}
	}

	started := make(chan struct{})
	var startOnce sync.Once
	signalStarted := func() {
		startOnce.Do(func() {
			close(started)
		})
	}

	var readers sync.WaitGroup
	readers.Add(2)

	go streamPbOutput(&readers, stdout, "[stdout] ", writeLog, signalStarted)
	go streamPbOutput(&readers, stderr, "[stderr] ", writeLog, nil)

	done := make(chan error, 1)
	go func() {
		waitErr := cmd.Wait()
		readers.Wait()
		if logFile != nil {
			logFile.Close()
		}
		done <- waitErr
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
	}
}

func streamPbOutput(
	readers *sync.WaitGroup,
	r io.Reader,
	prefix string,
	writeLog func(prefix string, data string),
	signalStarted func(),
) {
	defer readers.Done()

	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := scanner.Text()
		writeLog(prefix, line)
		if signalStarted != nil && strings.Contains(line, "Server started at") {
			signalStarted()
		}
	}
}

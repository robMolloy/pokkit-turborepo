package pokkitDbUtils

import (
	"fmt"
	"os/exec"
	"strings"
	"time"
)

func ExecuteBashCommand(bashCommand string) error {
	cmd := exec.Command("bash", "-c", bashCommand)
	return cmd.Start()
}

func ExecuteBashCommandAndWait(bashCommand string) error {
	cmd := exec.Command("bash", "-c", bashCommand)
	return cmd.Run()
}

func KillProcessByPortNumber(portNumber int) error {
	pid, err := getListeningPidOnPort(portNumber)
	if err != nil {
		return fmt.Errorf("error looking up process on port %d in KillProcessByPortNumber: %w", portNumber, err)
	}
	if pid == "" {
		return nil
	}

	err = ExecuteBashCommandAndWait(fmt.Sprintf(`kill -15 %s 2>/dev/null || true`, pid))
	if err != nil {
		return fmt.Errorf("error returned from ExecuteBashCommand in KillPocketbaseInstanceByDbPortNumber: %w", err)
	}

	deadline := time.Now().Add(10 * time.Second)
	for {
		currentPid, err := getListeningPidOnPort(portNumber)
		if err != nil {
			return fmt.Errorf("error checking process on port %d in KillProcessByPortNumber: %w", portNumber, err)
		}
		if currentPid != pid {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timed out waiting for process on port %d to exit in KillProcessByPortNumber", portNumber)
		}
		time.Sleep(50 * time.Millisecond)
	}
}

func getListeningPidOnPort(portNumber int) (string, error) {
	cmd := exec.Command("bash", "-c", fmt.Sprintf(`lsof -tiTCP:"%d" -sTCP:LISTEN 2>/dev/null | head -n 1 || true`, portNumber))
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

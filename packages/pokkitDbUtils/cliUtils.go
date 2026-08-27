package pokkitDbUtils

import (
	"fmt"
	"io"
	"os/exec"
)

func ExecuteBashCommand(bashCommand string) error {
	cmd := exec.Command("bash", "-c", bashCommand)
	return cmd.Start()
}

func KillProcessByPortNumber(portNumber int) error {
	cmd := exec.Command(
		"bash",
		"-c",
		fmt.Sprintf(`kill -9 $(lsof -tiTCP:"%d" -sTCP:LISTEN 2>/dev/null | head -n 1) 2>/dev/null || true`, portNumber),
	)
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("error returned from ExecuteBashCommand in KillPocketbaseInstanceByDbPortNumber: %w", err)
	}
	return nil
}

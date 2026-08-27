package pokkitDbUtils

import (
	"fmt"
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
		fmt.Sprintf(
			`pids=$(lsof -t -iTCP:%d -sTCP:LISTEN 2>/dev/null || true); if [ -n "$pids" ]; then kill -TERM $pids 2>/dev/null || true; fi`,
			portNumber,
		),
	)
	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("error returned from ExecuteBashCommand in KillPocketbaseInstanceByDbPortNumber: %w", err)
	}
	return nil
}

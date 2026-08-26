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
	err := ExecuteBashCommand(
		fmt.Sprintf(`kill -9 $(lsof -ti :"%d" 2>/dev/null | head -n 1) 2>/dev/null || true`, portNumber),
	)

	if err != nil {
		return fmt.Errorf("error returned from ExecuteBashCommand in KillPocketbaseInstanceByDbPortNumber: %w", err)
	}
	return nil
}

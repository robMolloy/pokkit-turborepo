package pokkitDbUtils

import (
	"bufio"
	"fmt"
	"os/exec"
)

func ExecuteBashCommand(bashCommand string) error {
	cmd := exec.Command("bash", "-c", bashCommand)
	return cmd.Start()
}

func ExecuteAndWaitBashCommand(
	bashCommand string,
	handleOutputLine func(string, func()),
) error {
	cmd := exec.Command("bash", "-c", bashCommand)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	killProcess := func() {
		cmd.Process.Kill()
	}

	scanner := bufio.NewScanner(stdout)

	for scanner.Scan() {
		handleOutputLine(scanner.Text(), killProcess)
	}

	if err := scanner.Err(); err != nil {
		return err
	}

	return cmd.Wait()
}

func KillProcessByPortNumber(portNumber int) error {
	err := ExecuteBashCommand(
		fmt.Sprintf(`kill -15 $(lsof -tiTCP:"%d" -sTCP:LISTEN 2>/dev/null | head -n 1) 2>/dev/null || true`, portNumber),
	)

	if err != nil {
		return fmt.Errorf("error returned from ExecuteBashCommand in KillPocketbaseInstanceByDbPortNumber: %w", err)
	}
	return nil
}

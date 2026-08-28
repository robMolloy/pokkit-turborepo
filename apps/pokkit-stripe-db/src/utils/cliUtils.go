package utils

import (
	"bufio"
	"fmt"
	"os/exec"
)

func ExecuteBashCommand(bashCommand string) error {
	cmd := exec.Command("bash", "-c", bashCommand)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		fmt.Println(scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		return err
	}

	return cmd.Wait()
}

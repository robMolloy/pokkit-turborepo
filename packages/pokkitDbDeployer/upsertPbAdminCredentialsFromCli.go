package pokkitDbDeployer

import (
	"bufio"
	"fmt"
	"os/exec"
	"strings"
)

func UpsertPbAdminCredentialsFromCli(pbFilePath string, superuserEmail string, superuserPassword string) error {
	cmd := exec.Command(pbFilePath, "superuser", "upsert", superuserEmail, superuserPassword)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to cmd.StdoutPipe in UpsertPbAdminCredentialsFromCli: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to cmd.Start in UpsertPbAdminCredentialsFromCli: %w", err)
	}

	scanner := bufio.NewScanner(stdout)
	saved := false
	for scanner.Scan() {
		line := scanner.Text()
		fmt.Println(line)
		if strings.Contains(line, "Successfully saved") {
			saved = true
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("failed to scan stdout in UpsertPbAdminCredentialsFromCli: %w", err)
	}

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("failed to cmd.Wait in UpsertPbAdminCredentialsFromCli: %w", err)
	}

	if !saved {
		return fmt.Errorf("did not see Successfully saved in UpsertPbAdminCredentialsFromCli")
	}

	return nil
}

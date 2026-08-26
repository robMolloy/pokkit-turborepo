package pokkitDbDeployer

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
)

func UpsertPbAdminCredentialsFromCli(pbFilePath string, superuserEmail string, superuserPassword string) error {
	absPbFilePath, err := filepath.Abs(pbFilePath)
	if err != nil {
		return fmt.Errorf("failed to filepath.Abs(pbFilePath) in UpsertPbAdminCredentialsFromCli: %w", err)
	}
	cmd := exec.Command(absPbFilePath, "superuser", "upsert", superuserEmail, superuserPassword)
	cmd.Dir = filepath.Dir(absPbFilePath)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to cmd.StdoutPipe in UpsertPbAdminCredentialsFromCli: %w", err)
	}

	err = cmd.Start()
	if err != nil {
		return fmt.Errorf("failed to cmd.Start in UpsertPbAdminCredentialsFromCli: %w", err)
	}

	buf := make([]byte, 4096)
	for {
		n, _ := stdout.Read(buf)
		if n > 0 && strings.Contains(string(buf[:n]), "Successfully saved") {
			return nil
		}
	}
}

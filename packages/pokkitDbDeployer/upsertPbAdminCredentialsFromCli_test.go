package pokkitDbDeployer

import (
	"os"
	"path/filepath"
	"testing"
)

func writeExecutableScript(t *testing.T, body string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "fake-pb")
	if err := os.WriteFile(path, []byte(body), 0755); err != nil {
		t.Fatalf("failed to write fake pb script: %v", err)
	}
	return path
}

func TestUpsertPbAdminCredentialsFromCliSuccess(t *testing.T) {
	pbFilePath := writeExecutableScript(t, "#!/bin/sh\necho 'Successfully saved superuser'\n")
	err := UpsertPbAdminCredentialsFromCli(pbFilePath, "admin@example.com", "password")
	if err != nil {
		t.Fatalf("UpsertPbAdminCredentialsFromCli returned error: %v", err)
	}
}

func TestUpsertPbAdminCredentialsFromCliMissingSuccessLine(t *testing.T) {
	pbFilePath := writeExecutableScript(t, "#!/bin/sh\necho 'something else'\n")
	err := UpsertPbAdminCredentialsFromCli(pbFilePath, "admin@example.com", "password")
	if err == nil {
		t.Fatal("UpsertPbAdminCredentialsFromCli returned nil, want error when success line is missing")
	}
}

func TestUpsertPbAdminCredentialsFromCliCommandFailure(t *testing.T) {
	pbFilePath := writeExecutableScript(t, "#!/bin/sh\nexit 1\n")
	err := UpsertPbAdminCredentialsFromCli(pbFilePath, "admin@example.com", "password")
	if err == nil {
		t.Fatal("UpsertPbAdminCredentialsFromCli returned nil, want error when command fails")
	}
}

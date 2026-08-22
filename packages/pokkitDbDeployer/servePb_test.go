package pokkitDbDeployer

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestServePbMissingBinary(t *testing.T) {
	dir := t.TempDir()
	_, err := ServePb(filepath.Join(dir, "missing-pb"), 8090, filepath.Join(dir, "pb.log"))
	if err == nil {
		t.Fatal("expected error when pbFile does not exist")
	}
	if !strings.Contains(err.Error(), "pbFile does not exist") {
		t.Errorf("error = %v; want pbFile does not exist", err)
	}
}

func TestServePbWritesCliOutputToLogFile(t *testing.T) {
	dir := t.TempDir()
	pbFilePath := filepath.Join(dir, "fake-pb")
	logFilePath := filepath.Join(dir, "logs", "pb.log")

	script := "#!/bin/sh\necho \"Server started at http://0.0.0.0:8090\"\nsleep 30\n"
	if err := os.WriteFile(pbFilePath, []byte(script), 0755); err != nil {
		t.Fatalf("failed to write fake pocketbase script: %v", err)
	}

	cmd, err := ServePb(pbFilePath, 8090, logFilePath)
	if err != nil {
		t.Fatalf("ServePb() error = %v", err)
	}
	if cmd == nil || cmd.Process == nil {
		t.Fatal("ServePb() returned no running process")
	}
	t.Cleanup(func() {
		_ = cmd.Process.Kill()
	})

	logBytes, err := os.ReadFile(logFilePath)
	if err != nil {
		t.Fatalf("failed to read log file: %v", err)
	}
	if !strings.Contains(string(logBytes), "Server started at") {
		t.Errorf("log file = %q; want Server started at", logBytes)
	}
}

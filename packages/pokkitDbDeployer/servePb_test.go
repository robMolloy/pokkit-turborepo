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

	result, err := ServePb(pbFilePath, 8090, logFilePath)
	if err != nil {
		t.Fatalf("ServePb() error = %v", err)
	}
	if result == nil || result.Cmd == nil || result.Cmd.Process == nil {
		t.Fatal("ServePb() returned no running process")
	}
	t.Cleanup(func() {
		_ = result.Cmd.Process.Kill()
		_, _ = result.Cmd.Process.Wait()
	})

	if result.DbServeUrl != "0.0.0.0:8090" {
		t.Errorf("DbServeUrl = %q; want %q", result.DbServeUrl, "0.0.0.0:8090")
	}
	if result.DbUrl != "http://0.0.0.0:8090" {
		t.Errorf("DbUrl = %q; want %q", result.DbUrl, "http://0.0.0.0:8090")
	}

	logBytes, err := os.ReadFile(logFilePath)
	if err != nil {
		t.Fatalf("failed to read log file: %v", err)
	}
	logContent := string(logBytes)
	if !strings.Contains(logContent, "[stdout] Server started at http://0.0.0.0:8090") {
		t.Errorf("log file = %q; want stdout server started line", logContent)
	}
}

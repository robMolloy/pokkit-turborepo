package pokkitDbUtils

import "testing"

func TestExecuteBashCommandSuccess(t *testing.T) {
	if err := ExecuteBashCommand("echo READY"); err != nil {
		t.Fatalf("ExecuteBashCommand(echo READY) returned error: %v", err)
	}
}

func TestExecuteBashCommandFailure(t *testing.T) {
	if err := ExecuteBashCommand("exit 1"); err == nil {
		t.Fatal("ExecuteBashCommand(exit 1) returned nil, want error")
	}
}

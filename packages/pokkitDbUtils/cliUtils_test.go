package pokkitDbUtils

import (
	"bufio"
	"os/exec"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestKillProcessByPortNumberWaitsUntilProcessExits(t *testing.T) {
	cmd := exec.Command("python3", "-c", `
import socket, signal, sys, time

def handle_term(signum, frame):
    time.sleep(0.3)
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_term)

s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1], flush=True)
s.listen(1)
while True:
    time.sleep(1)
`)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("stdout pipe: %v", err)
	}
	if err := cmd.Start(); err != nil {
		t.Fatalf("start listener: %v", err)
	}
	defer func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}()

	portLine, err := bufio.NewReader(stdout).ReadString('\n')
	if err != nil {
		t.Fatalf("read port: %v", err)
	}
	port, err := strconv.Atoi(strings.TrimSpace(portLine))
	if err != nil {
		t.Fatalf("parse port %q: %v", portLine, err)
	}

	waitUntilListening(t, port)

	startedAt := time.Now()
	if err := KillProcessByPortNumber(port); err != nil {
		t.Fatalf("KillProcessByPortNumber: %v", err)
	}
	elapsed := time.Since(startedAt)

	if elapsed < 250*time.Millisecond {
		t.Fatalf("KillProcessByPortNumber returned before the process finished exiting: elapsed %v", elapsed)
	}

	pid, err := getListeningPidOnPort(port)
	if err != nil {
		t.Fatalf("getListeningPidOnPort: %v", err)
	}
	if pid != "" {
		t.Fatalf("process still listening on port %d after KillProcessByPortNumber returned: pid %s", port, pid)
	}
}

func TestKillProcessByPortNumberNoProcess(t *testing.T) {
	cmd := exec.Command("python3", "-c", `
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1], flush=True)
`)
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("get free port: %v", err)
	}
	port, err := strconv.Atoi(strings.TrimSpace(string(out)))
	if err != nil {
		t.Fatalf("parse port %q: %v", out, err)
	}

	if err := KillProcessByPortNumber(port); err != nil {
		t.Fatalf("KillProcessByPortNumber: %v", err)
	}
}

func waitUntilListening(t *testing.T, port int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for {
		pid, err := getListeningPidOnPort(port)
		if err != nil {
			t.Fatalf("getListeningPidOnPort: %v", err)
		}
		if pid != "" {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for test process to listen on port %d", port)
		}
		time.Sleep(20 * time.Millisecond)
	}
}

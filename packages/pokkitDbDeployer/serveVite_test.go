package pokkitDbDeployer

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestIsVitePreviewReady(t *testing.T) {
	t.Parallel()

	readyLines := []string{
		"  ➜  Local:   http://localhost:4173/",
		"  ➜  Network: http://0.0.0.0:4173/",
		"http://127.0.0.1:4173/",
	}
	for _, line := range readyLines {
		if !isVitePreviewReady(line) {
			t.Errorf("isVitePreviewReady(%q) = false, want true", line)
		}
	}

	if isVitePreviewReady("failed to load config") {
		t.Errorf("isVitePreviewReady(%q) = true, want false", "failed to load config")
	}
}

func TestServeViteMissingDistParentDir(t *testing.T) {
	t.Parallel()

	_, err := ServeVite(filepath.Join(t.TempDir(), "missing"), 18000, filepath.Join(t.TempDir(), "log.txt"))
	if err == nil {
		t.Fatal("expected error for missing dist parent dir, got nil")
	}
	if !strings.Contains(err.Error(), "dist parent dir does not exist") {
		t.Errorf("error = %q, want dist parent dir does not exist", err.Error())
	}
}

func TestServeViteMissingDistDir(t *testing.T) {
	t.Parallel()

	_, err := ServeVite(t.TempDir(), 18001, filepath.Join(t.TempDir(), "log.txt"))
	if err == nil {
		t.Fatal("expected error for missing dist dir, got nil")
	}
	if !strings.Contains(err.Error(), "dist dir does not exist") {
		t.Errorf("error = %q, want dist dir does not exist", err.Error())
	}
}

func TestServeViteServesDistIndexHtml(t *testing.T) {
	if _, err := exec.LookPath("npx"); err != nil {
		t.Skip("npx not found")
	}

	distParentDirPath := t.TempDir()
	distDirPath := filepath.Join(distParentDirPath, "dist")
	if err := os.Mkdir(distDirPath, 0755); err != nil {
		t.Fatalf("failed to create dist dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(distDirPath, "index.html"), []byte("<html>serve-vite-ok</html>"), 0644); err != nil {
		t.Fatalf("failed to write index.html: %v", err)
	}

	portNumber := mustFreePort(t)
	logFilePath := filepath.Join(t.TempDir(), "log.txt")

	serveViteResp, err := ServeVite(distParentDirPath, portNumber, logFilePath)
	if err != nil {
		t.Fatalf("ServeVite returned error: %v", err)
	}
	if serveViteResp == nil || serveViteResp.Cmd == nil || serveViteResp.Cmd.Process == nil {
		t.Fatal("expected ServeVite to return a running process")
	}
	defer func() {
		if serveViteResp.Cmd.Process != nil {
			_ = serveViteResp.Cmd.Process.Kill()
		}
	}()

	client := &http.Client{Timeout: 5 * time.Second}
	url := fmt.Sprintf("http://127.0.0.1:%d/", portNumber)

	var lastErr error
	var body []byte
	for attempt := 0; attempt < 10; attempt++ {
		resp, getErr := client.Get(url)
		if getErr != nil {
			lastErr = getErr
			time.Sleep(100 * time.Millisecond)
			continue
		}
		body, lastErr = io.ReadAll(resp.Body)
		resp.Body.Close()
		if lastErr != nil {
			time.Sleep(100 * time.Millisecond)
			continue
		}
		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("status = %d, want 200", resp.StatusCode)
			time.Sleep(100 * time.Millisecond)
			continue
		}
		lastErr = nil
		break
	}
	if lastErr != nil {
		t.Fatalf("GET %s failed: %v", url, lastErr)
	}
	if !strings.Contains(string(body), "serve-vite-ok") {
		t.Errorf("body = %q, want serve-vite-ok", string(body))
	}
}

func mustFreePort(t *testing.T) int {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to get free port: %v", err)
	}
	portNumber := listener.Addr().(*net.TCPAddr).Port
	if err := listener.Close(); err != nil {
		t.Fatalf("failed to close free-port listener: %v", err)
	}
	return portNumber
}

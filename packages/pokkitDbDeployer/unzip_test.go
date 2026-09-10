package pokkitDbDeployer

import (
	"archive/zip"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestUnzipExtractsZipAFolderLayout(t *testing.T) {
	tempDir := t.TempDir()
	zipFilePath := filepath.Join(tempDir, "dist.zip")
	destDir := filepath.Join(tempDir, "out")

	writeTestZip(t, zipFilePath, map[string]string{
		"index.html":    "<html>ok</html>",
		"assets/app.js": "console.log(1)",
		"assets/":       "",
	})

	unzipResp, err := Unzip(zipFilePath, destDir)
	if err != nil {
		t.Fatalf("Unzip returned error: %v", err)
	}
	if unzipResp == nil {
		t.Fatal("expected unzipResp, got nil")
	}

	indexBytes, err := os.ReadFile(filepath.Join(destDir, "index.html"))
	if err != nil {
		t.Fatalf("failed to read extracted index.html: %v", err)
	}
	if string(indexBytes) != "<html>ok</html>" {
		t.Errorf("index.html contents = %q, want %q", string(indexBytes), "<html>ok</html>")
	}

	assetBytes, err := os.ReadFile(filepath.Join(destDir, "assets", "app.js"))
	if err != nil {
		t.Fatalf("failed to read extracted assets/app.js: %v", err)
	}
	if string(assetBytes) != "console.log(1)" {
		t.Errorf("assets/app.js contents = %q, want %q", string(assetBytes), "console.log(1)")
	}

	if unzipResp.DestDir != destDir && unzipResp.DestDir != filepath.Clean(destDir) {
		absDest, _ := filepath.Abs(destDir)
		if unzipResp.DestDir != absDest {
			t.Errorf("unzipResp.DestDir = %q, want %q", unzipResp.DestDir, absDest)
		}
	}
}

func TestUnzipRejectsZipSlip(t *testing.T) {
	tempDir := t.TempDir()
	zipFilePath := filepath.Join(tempDir, "evil.zip")
	destDir := filepath.Join(tempDir, "out")

	zipFile, err := os.Create(zipFilePath)
	if err != nil {
		t.Fatalf("failed to create zip: %v", err)
	}
	writer := zip.NewWriter(zipFile)
	header := &zip.FileHeader{
		Name:   "../escape.txt",
		Method: zip.Deflate,
	}
	entry, err := writer.CreateHeader(header)
	if err != nil {
		t.Fatalf("failed to create zip header: %v", err)
	}
	if _, err := entry.Write([]byte("nope")); err != nil {
		t.Fatalf("failed to write zip entry: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close zip writer: %v", err)
	}
	if err := zipFile.Close(); err != nil {
		t.Fatalf("failed to close zip file: %v", err)
	}

	_, err = Unzip(zipFilePath, destDir)
	if err == nil {
		t.Fatal("expected zip slip error, got nil")
	}
	if !strings.Contains(err.Error(), "illegal file path") {
		t.Errorf("error = %q, want illegal file path", err.Error())
	}
}

func TestUnzipMissingZipFile(t *testing.T) {
	_, err := Unzip(filepath.Join(t.TempDir(), "missing.zip"), t.TempDir())
	if err == nil {
		t.Fatal("expected error for missing zip, got nil")
	}
}

func writeTestZip(t *testing.T, zipFilePath string, files map[string]string) {
	t.Helper()

	zipFile, err := os.Create(zipFilePath)
	if err != nil {
		t.Fatalf("failed to create zip: %v", err)
	}
	defer zipFile.Close()

	writer := zip.NewWriter(zipFile)
	defer writer.Close()

	for name, contents := range files {
		header := &zip.FileHeader{
			Name:   name,
			Method: zip.Deflate,
		}
		if strings.HasSuffix(name, "/") {
			header.SetMode(os.ModeDir | 0755)
		}
		entry, err := writer.CreateHeader(header)
		if err != nil {
			t.Fatalf("failed to create zip entry %s: %v", name, err)
		}
		if _, err := entry.Write([]byte(contents)); err != nil {
			t.Fatalf("failed to write zip entry %s: %v", name, err)
		}
	}
}

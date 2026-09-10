package pokkitDbDeployer

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type UnzipResult struct {
	DestDir string
	Files   []string
}

func Unzip(zipFilePath string, destDir string) (*UnzipResult, error) {
	if _, err := os.Stat(zipFilePath); err != nil {
		return nil, fmt.Errorf("unzip: zip file does not exist: %s", zipFilePath)
	}

	reader, err := zip.OpenReader(zipFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to zip.OpenReader(zipFilePath) in Unzip: %w", err)
	}
	defer reader.Close()

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to os.MkdirAll(destDir, 0755) in Unzip: %w", err)
	}

	destDirAbs, err := filepath.Abs(destDir)
	if err != nil {
		return nil, fmt.Errorf("failed to filepath.Abs(destDir) in Unzip: %w", err)
	}

	files := []string{}
	for _, file := range reader.File {
		extractedPath, err := unzipFile(file, destDirAbs)
		if err != nil {
			return nil, err
		}
		files = append(files, extractedPath)
	}

	return &UnzipResult{
		DestDir: destDirAbs,
		Files:   files,
	}, nil
}

func unzipFile(file *zip.File, destDirAbs string) (string, error) {
	targetPath, err := unzipTargetPath(file.Name, destDirAbs)
	if err != nil {
		return "", err
	}

	if file.FileInfo().IsDir() {
		if err := os.MkdirAll(targetPath, 0755); err != nil {
			return "", fmt.Errorf("failed to os.MkdirAll(targetPath, 0755) in Unzip: %w", err)
		}
		return targetPath, nil
	}

	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return "", fmt.Errorf("failed to os.MkdirAll(filepath.Dir(targetPath), 0755) in Unzip: %w", err)
	}

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to file.Open() in Unzip: %w", err)
	}
	defer src.Close()

	perm := file.Mode().Perm()
	if perm == 0 {
		perm = 0644
	}

	dst, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, perm)
	if err != nil {
		return "", fmt.Errorf("failed to os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, perm) in Unzip: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed to io.Copy(dst, src) in Unzip: %w", err)
	}

	return targetPath, nil
}

func unzipTargetPath(fileName string, destDirAbs string) (string, error) {
	targetPath := filepath.Join(destDirAbs, fileName)
	destPrefix := destDirAbs + string(os.PathSeparator)
	if targetPath != destDirAbs && !strings.HasPrefix(targetPath, destPrefix) {
		return "", fmt.Errorf("illegal file path in zip in Unzip: %s", fileName)
	}
	return targetPath, nil
}

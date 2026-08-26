package pokkitDbDeployer

import (
	"strings"
	"testing"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func TestStorageFileKeyUsesRecordBaseFilesPath(t *testing.T) {
	collection := pbCore.NewBaseCollection("deployments", "pbc_1968374250")
	record := pbCore.NewRecord(collection)
	record.Id = "abcdefghijklmno"

	deployment := convertUnproxiedRecordToDeploymentRecord(record)
	fileName := "settings.json_abc123xyz"
	got := deployment.storageFileKey(fileName)

	want := record.BaseFilesPath() + "/" + fileName
	if got != want {
		t.Fatalf("storageFileKey() = %q, want %q", got, want)
	}
	if strings.Contains(got, "/pb_config/") {
		t.Fatalf("storageFileKey() inserted pb_config into the PocketBase file key: %q", got)
	}
}

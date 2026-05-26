package instanceRecordsSdk

import (
	"testing"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func TestConvertStructToInstanceRecordAndBackAgain(t *testing.T) {
	instanceRecordStruct := TInstanceRecordStruct{
		Id:                "id123",
		InstanceRequestId: "idReq123",
		PortNumber:        100,
		Status:            "pending",
		Created:           types.NowDateTime(),
		Updated:           types.NowDateTime(),
	}

	mockInstanceCollection := pbCore.Collection{}
	newMockRecord := pbCore.NewRecord(&mockInstanceCollection)
	PopulateInstanceRecordWithStruct(newMockRecord, instanceRecordStruct)

	newInstanceRecordStruct := ConvertInstanceRecordToStruct(newMockRecord)

	if instanceRecordStruct != newInstanceRecordStruct {
		t.Errorf("instanceRecordStruct!=newInstanceRecordStruct => got %v; want %v", instanceRecordStruct, newInstanceRecordStruct)
	}
}

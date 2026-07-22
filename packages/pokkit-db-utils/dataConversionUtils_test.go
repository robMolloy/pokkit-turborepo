package pokkitDbUtils

import (
	"testing"

	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TMockStruct struct {
	Id                string           `json:"id"`
	InstanceRequestId string           `json:"instanceRequestId"`
	PortNumber        int              `json:"portNumber"`
	Status            string           `json:"status"`
	Created           pbTypes.DateTime `json:"created"`
	Updated           pbTypes.DateTime `json:"updated"`
}

var MockStruct = TMockStruct{
	Id:                "id123",
	InstanceRequestId: "id234",
	PortNumber:        1001,
	Status:            "pending",
	Created:           pbTypes.NowDateTime(),
	Updated:           pbTypes.NowDateTime(),
}
var MockStructSlice = []TMockStruct{MockStruct}

func TestStructToMap(t *testing.T) {
	result, err := StructToMap(MockStruct)
	if err != nil {
		t.Errorf("Error occurred while converting struct to map: %v", err)
	}
	if result == nil {
		t.Error("Expected non-nil map, got nil")
	}
	if result["id"] != MockStruct.Id {
		t.Errorf("Expected id %v, got %v", MockStruct.Id, result["id"])
	}
}

func TestStructSliceToMapSlice(t *testing.T) {
	result, err := StructSliceToMapSlice(MockStructSlice)
	if err != nil {
		t.Errorf("Error occurred while converting struct slice to map slice: %v", err)
	}
	if result == nil {
		t.Error("Expected non-nil slice, got nil")
	}
	if len(result) != len(MockStructSlice) {
		t.Errorf("Expected length %v, got %v", len(MockStructSlice), len(result))
	}
	if result[0]["id"] != MockStruct.Id {
		t.Errorf("Expected id %v, got %v", MockStruct.Id, result[0]["id"])
	}
}

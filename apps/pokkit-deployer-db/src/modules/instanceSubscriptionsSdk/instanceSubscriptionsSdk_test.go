package instanceSubscriptionsSdk

import (
	"testing"

	"github.com/pocketbase/pocketbase/tools/types"
)

func TestConvertInstancesSubscriptionRecordStructToAdditionalData(t *testing.T) {
	instancesSubscriptionRecordStruct1 := TInstancesSubscriptionRecordStruct{
		PaidUntilDateTime: types.NowDateTime().Add(1000),
	}
	instancesSubscriptionAdditionalDataStruct1 := ConvertInstancesSubscriptionRecordStructToAdditionalData(instancesSubscriptionRecordStruct1)
	if instancesSubscriptionAdditionalDataStruct1.IsExpired == true {
		t.Errorf("instancesSubscriptionAdditionalDataStruct1.IsExpired == true, but should equal false")
	}

	instancesSubscriptionRecordStruct2 := TInstancesSubscriptionRecordStruct{
		PaidUntilDateTime: types.NowDateTime().Add(-1000),
	}
	instancesSubscriptionAdditionalDataStruct2 := ConvertInstancesSubscriptionRecordStructToAdditionalData(instancesSubscriptionRecordStruct2)
	if instancesSubscriptionAdditionalDataStruct2.IsExpired == false {
		t.Errorf("instancesSubscriptionAdditionalDataStruct2.IsExpired == false, but should equal true")
	}

}

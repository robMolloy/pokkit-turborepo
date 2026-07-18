package utils

import pbTypes "github.com/pocketbase/pocketbase/tools/types"

func ConvertStripeDateIntToPbDateTime(dateInt int64) (pbTypes.DateTime, error) {
	return pbTypes.ParseDateTime(dateInt)
}

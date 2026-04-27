import { useInstanceRecordsStore } from "@/modules/instanceRecords/dbInstanceRecords";
import { useStripeLedgerRecordsStore } from "@/modules/instanceRecords/dbStripeLedgerRecords";
import { useUserBalanceRecordStore } from "@/modules/instanceRecords/dbUserBalanceRecord";
import { useUserBalanceRecordsStore } from "@/modules/instanceRecords/dbUserBalanceRecords";
import { useGlobalUserPermissionStore, useUserRecordsStore, useUserStore } from "@repo/pokkit-auth";

const IndexPage = () => {
  const userStore = useUserStore();
  const userRecordsStore = useUserRecordsStore();
  const globalUserPermissionStore = useGlobalUserPermissionStore();
  const instanceRecordsStore = useInstanceRecordsStore();
  const userBalanceRecordStore = useUserBalanceRecordStore();
  const userBalanceRecordsStore = useUserBalanceRecordsStore();
  const stripeLedgerRecordsStore = useStripeLedgerRecordsStore();

  return (
    <div>
      <h1>Stores</h1>

      <pre>
        {JSON.stringify(
          {
            userStore,
            userRecordsStore,
            globalUserPermissionStore,
            instanceRecordsStore,
            userBalanceRecordStore,
            userBalanceRecordsStore,
            stripeLedgerRecordsStore,
          },
          undefined,
          2,
        )}
      </pre>
    </div>
  );
};

export default IndexPage;

import { useInstanceRecordsStore } from "@/modules/instanceRecords/dbInstanceRecords";
import { useInstancesSubscriptionRecordsStore } from "@/modules/instanceRecords/dbInstancesSubscriptionRecords";
import { useStripeLedgerRecordsStore } from "@/modules/instanceRecords/dbStripeLedgerRecords";
import { useUserBalanceRecordStore } from "@/modules/instanceRecords/dbUserBalanceRecord";
import { useUserBalanceRecordsStore } from "@/modules/instanceRecords/dbUserBalanceRecords";
import { useGlobalUserPermissionStore, useUserRecordsStore, useUserStore } from "@repo/pokkit-auth";
import { DisplayAnything } from "@repo/pokkit-components";

const IndexPage = () => {
  const userStore = useUserStore();
  const userRecordsStore = useUserRecordsStore();
  const globalUserPermissionStore = useGlobalUserPermissionStore();
  const instanceRecordsStore = useInstanceRecordsStore();
  const userBalanceRecordStore = useUserBalanceRecordStore();
  const userBalanceRecordsStore = useUserBalanceRecordsStore();
  const stripeLedgerRecordsStore = useStripeLedgerRecordsStore();
  const instancesSubscriptionRecordsStore = useInstancesSubscriptionRecordsStore();

  return (
    <div>
      <h1>Stores</h1>

      <pre>
        <DisplayAnything
          title=""
          data={{
            userStore,
            userRecordsStore,
            globalUserPermissionStore,
            instanceRecordsStore,
            userBalanceRecordStore,
            userBalanceRecordsStore,
            stripeLedgerRecordsStore,
            instancesSubscriptionRecordsStore,
          }}
          hideFunctions={true}
          expandLevel={1}
        />
      </pre>
    </div>
  );
};

export default IndexPage;

import { useGlobalUserPermissionStore, useUserRecordsStore, useUserStore } from "@repo/pokkit-auth";
import { DisplayAnything } from "@repo/pokkit-components";

const IndexPage = () => {
  const userStore = useUserStore();
  const userRecordsStore = useUserRecordsStore();
  const globalUserPermissionStore = useGlobalUserPermissionStore();

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
          }}
          hideFunctions={true}
          expandLevel={1}
        />
      </pre>
    </div>
  );
};

export default IndexPage;

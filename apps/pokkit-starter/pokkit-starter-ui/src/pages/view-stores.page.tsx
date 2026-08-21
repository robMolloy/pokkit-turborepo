import { useGlobalUserPermissionStore, useUserRecordsStore, useUserStore } from "@repo/pokkit-auth";
import { DisplayAnything } from "@repo/pokkit-components";

const useStores = (indexedUseStores: Record<string, () => any>) => {
  const rtn: { [key: string]: any } = {};
  Object.entries(indexedUseStores).forEach(([key, useStore]) => {
    const store = useStore();
    const storeName = key.replace("use", "");

    return (rtn[storeName] = store);
  });
  return rtn;
};

const Page = () => {
  const stores = useStores({ useUserStore, useUserRecordsStore, useGlobalUserPermissionStore });

  return (
    <div>
      <h1>Stores</h1>

      <DisplayAnything title="" data={stores} hideFunctions={true} expandLevel={1} />
    </div>
  );
};

export default Page;

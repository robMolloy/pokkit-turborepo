import type { CollectionModel } from "pocketbase";
import {
  serveBuildAndWriteLogs,
  upsertAdminCredentials,
  applyCollectionsToDb,
} from "../helpers/pbHelpers";

import fse from "fs-extra";

export const setupAndServeDb = async (p: {
  writeDbBuildToFilePathFn: () => Promise<unknown>;
  dbBuildFilePath: string;
  dbLogFilePath: string;
  dbUrl: string;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
  applyCollections?:
    | { required: true; getCollectionsFn: () => Promise<CollectionModel[]> }
    | { required?: false };
}) => {
  fse.ensureFileSync(p.dbBuildFilePath);
  await p.writeDbBuildToFilePathFn();

  const pbProcess = await serveBuildAndWriteLogs({
    dbBuildFilePath: p.dbBuildFilePath,
    dbLogFilePath: p.dbLogFilePath,
    dbUrl: p.dbUrl,
  });

  await upsertAdminCredentials({
    buildFilePath: p.dbBuildFilePath,
    dbSuperuserEmail: p.dbSuperuserEmail,
    dbSuperuserPassword: p.dbSuperuserPassword,
  });

  if (p.applyCollections?.required) {
    const collections = await p.applyCollections.getCollectionsFn();
    await applyCollectionsToDb({
      dbUrl: p.dbUrl,
      dbSuperuserEmail: p.dbSuperuserEmail,
      dbSuperuserPassword: p.dbSuperuserPassword,
      collections,
    });
  }

  return pbProcess;
};

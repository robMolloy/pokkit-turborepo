import { CollectionModel } from "pocketbase";
import {
  serveBuildAndWriteLogs,
  upsertAdminCredentials,
  applyCollectionsToDb,
} from "../helpers/pbHelpers";

import fse from "fs-extra";

export const setupAndServeTempDb = async (p: {
  getCollectionsFn: () => Promise<CollectionModel[]>;
  /**
   * Ensure the db build file is executable
   */
  writeDbBuildToTempDirFn: () => Promise<unknown>;
  dbBuildFilePath: string;
  dbLogFilePath: string;
  dbUrl: string;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
}) => {
  const collections = await p.getCollectionsFn();

  fse.ensureFileSync(p.dbBuildFilePath);
  await p.writeDbBuildToTempDirFn();

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

  await applyCollectionsToDb({
    dbUrl: p.dbUrl,
    dbSuperuserEmail: p.dbSuperuserEmail,
    dbSuperuserPassword: p.dbSuperuserPassword,
    collections,
  });

  return pbProcess;
};

import type { CollectionModel } from "pocketbase";
import {
  serveBuildAndWriteLogs,
  upsertAdminCredentials,
  applyCollectionsToDb,
} from "../helpers/pbHelpers";

import fse from "fs-extra";

export const setupAndServeDb = async (p: {
  dbBuildDirPath: string;
  dbUrl: string;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
  applyCollections?:
    | { required: true; getCollectionsFn: () => Promise<CollectionModel[]> }
    | { required?: false };
}) => {
  const dbBuildFilePath = `${p.dbBuildDirPath}/app-db`;
  const dbLogFilePath = `${p.dbBuildDirPath}/log.txt`;

  const buildFileExists = await fse.pathExists(dbBuildFilePath);
  if (!buildFileExists)
    throw new Error(`setupAndServeDb: dbBuildFile does not exist: ${dbBuildFilePath}`);

  fse.ensureFile(dbLogFilePath);

  const pbProcess = await serveBuildAndWriteLogs({
    dbBuildFilePath,
    dbLogFilePath,
    dbUrl: p.dbUrl,
  });

  await upsertAdminCredentials({
    buildFilePath: dbBuildFilePath,
    dbSuperuserEmail: p.dbSuperuserEmail,
    dbSuperuserPassword: p.dbSuperuserPassword,
  });

  await upsertAdminCredentials({
    buildFilePath: dbBuildFilePath,
    dbSuperuserEmail: p.dbSuperuserEmail,
    dbSuperuserPassword: p.dbSuperuserPassword,
  });
  return pbProcess;
};

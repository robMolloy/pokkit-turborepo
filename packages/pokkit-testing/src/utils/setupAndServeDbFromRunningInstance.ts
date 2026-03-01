import {
  getPortNumberFromDbUrl,
  serveBuildAndWriteLogs,
  upsertAdminCredentials,
  getCollectionsFromRunningDbInstance,
  applyCollectionsToDb,
} from "../helpers/pbHelpers";
import fse from "fs-extra";
import PocketBase from "pocketbase";

export const setupAndServeDbFromRunningInstance = async (p: {
  runningBuildFilePath: string;
  runningDbUrl: string;
  runningDbSuperuserEmail: string;
  runningDbSuperuserPassword: string;
  newDbBuildFilePath: string;
  newDbUrl: string;
  newDbLogFilePath: string;
  newDbSuperuserEmail: string;
  newDbSuperuserPassword: string;
}) => {
  try {
    const runningPb = new PocketBase(p.runningDbUrl);
    await runningPb.health.check();
  } catch (error) {
    throw new Error(
      `No running PocketBase instance found at ${p.runningDbUrl} - the "setupAndServeTempDbFromRunningInstance()" command will fail without a running instance to copy from`,
    );
  }

  const tempBuildFilePath = p.newDbBuildFilePath;

  const tempDbPortNumber = getPortNumberFromDbUrl(p.newDbUrl);
  if (!tempDbPortNumber) return;

  // copyBuildToTempFolder
  fse.ensureFileSync(p.newDbLogFilePath);
  fse.copyFileSync(p.runningBuildFilePath, tempBuildFilePath);
  const pbProcess = await serveBuildAndWriteLogs({
    dbUrl: p.newDbUrl,
    dbBuildFilePath: tempBuildFilePath,
    dbLogFilePath: p.newDbLogFilePath,
  });

  await upsertAdminCredentials({
    buildFilePath: tempBuildFilePath,
    dbSuperuserEmail: p.newDbSuperuserEmail,
    dbSuperuserPassword: p.newDbSuperuserPassword,
  });

  const collections = await getCollectionsFromRunningDbInstance({
    dbUrl: p.runningDbUrl,
    dbSuperuserEmail: p.runningDbSuperuserEmail,
    dbSuperuserPassword: p.runningDbSuperuserPassword,
  });

  await applyCollectionsToDb({
    dbUrl: p.newDbUrl,
    dbSuperuserEmail: p.newDbSuperuserEmail,
    dbSuperuserPassword: p.newDbSuperuserPassword,
    collections,
  });

  return pbProcess;
};

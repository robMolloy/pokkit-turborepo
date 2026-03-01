import {
  getPortNumberFromDbServeUrl,
  serveBuildAndWriteLogs,
  upsertAdminCredentials,
  getCollectionsFromRunningDbInstance,
  applyCollectionsToDb,
} from "../helpers/pbHelpers";
import fse from "fs-extra";
import PocketBase from "pocketbase";

export const setupAndServeTempDbFromRunningInstance = async (p: {
  runningBuildFilePath: string;
  runningDbUrl: string;
  runningDbSuperuserEmail: string;
  runningDbSuperuserPassword: string;
  tempDbBuildFilePath: string;
  tempDbUrl: string;
  tempDbLogFilePath: string;
  tempDbSuperuserEmail: string;
  tempDbSuperuserPassword: string;
}) => {
  try {
    const runningPb = new PocketBase(p.runningDbUrl);
    await runningPb.health.check();
  } catch (error) {
    throw new Error(
      `No running PocketBase instance found at ${p.runningDbUrl} - the "setupAndServeTempDbFromRunningInstance()" command will fail without a running instance to copy from`,
    );
  }

  const tempBuildFilePath = p.tempDbBuildFilePath;

  const tempDbPortNumber = getPortNumberFromDbServeUrl(p.tempDbUrl);
  if (!tempDbPortNumber) return;

  // copyBuildToTempFolder
  fse.ensureFileSync(p.tempDbLogFilePath);
  fse.copyFileSync(p.runningBuildFilePath, tempBuildFilePath);
  const pbProcess = await serveBuildAndWriteLogs({
    dbUrl: p.tempDbUrl,
    dbBuildFilePath: tempBuildFilePath,
    dbLogFilePath: p.tempDbLogFilePath,
  });

  await upsertAdminCredentials({
    buildFilePath: tempBuildFilePath,
    dbSuperuserEmail: p.tempDbSuperuserEmail,
    dbSuperuserPassword: p.tempDbSuperuserPassword,
  });

  const collections = await getCollectionsFromRunningDbInstance({
    dbUrl: p.runningDbUrl,
    dbSuperuserEmail: p.runningDbSuperuserEmail,
    dbSuperuserPassword: p.runningDbSuperuserPassword,
  });

  await applyCollectionsToDb({
    dbUrl: p.tempDbUrl,
    dbSuperuserEmail: p.tempDbSuperuserEmail,
    dbSuperuserPassword: p.tempDbSuperuserPassword,
    collections,
  });

  return pbProcess;
};

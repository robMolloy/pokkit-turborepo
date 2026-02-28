import PocketBase, { CollectionModel } from "pocketbase";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";

const superusersCollectionName = "_superusers";

const getPortNumberFromDbUrl = (url: string): string | undefined => {
  return url.split(":")[2]?.match(/^\d+/)?.[0];
};

/**
 * Serves the PocketBase build and writes logs to a file.
 *
 * assumptions:
 * - the directory containing the log file already exists
 * - the build file path is to an existing PocketBase executable
 *
 * @param buildFilePath - Path to the existing PocketBase executable to serve.
 * @param logFilePath - Path to the file where logs will be written.
 * @param dbUrl - Database URL in the format http://anyurl:1234 (port number after second colon).
 */
const serveBuildAndWriteLogs = async (p: {
  buildFilePath: string;
  logFileDirPath: string;
  dbUrl: string;
}): Promise<ChildProcessWithoutNullStreams> => {
  const dbServeUrl = p.dbUrl.replace("http://", "");
  const dbPortNumber = getPortNumberFromDbUrl(p.dbUrl);

  if (!dbPortNumber)
    throw new Error(
      `Invalid dbUrl: ${p.dbUrl} - requires format http://anyurl:1234 (port number after second colon)`,
    );

  const logStream = fse.createWriteStream(`${p.logFileDirPath}/pocketbase.log`, { flags: "a" });
  const pbProcess = spawn(p.buildFilePath, ["serve", `--http=${dbServeUrl}`]);

  return new Promise((resolve) => {
    pbProcess.stdout.on("data", (data) => {
      const strData = data.toString() as string;
      logStream.write(`[stdout] ${strData}\n`);
      if (strData.includes(dbPortNumber)) resolve(pbProcess);
    });

    pbProcess.stderr.on("data", (data) => {
      logStream.write(`[stderr] ${data.toString()}\n`);
    });

    pbProcess.on("error", (error) => {
      logStream.write(`[error] ${error.message}\n`);
      logStream.end();
    });
  });
};

/**
 * Creates or updates the superuser admin credentials for the test database.
 *
 * @param buildFilePath - Path to the temporary test PocketBase executable used to apply the credential change.
 * @param dbSuperuserEmail - The email address to set for the superuser account.
 * @param dbSuperuserPassword - The password to set for the superuser account.
 */
const upsertAdminCredentials = async (p: {
  buildFilePath: string;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
}) => {
  const upsertProcess = spawn(`${p.buildFilePath}`, [
    "superuser",
    "upsert",
    p.dbSuperuserEmail,
    p.dbSuperuserPassword,
  ]);

  return new Promise((resolve) => {
    upsertProcess.stdout.on("data", (data) => {
      if (data.toString().includes("Successfully saved")) resolve(true);
    });
  });
};

/**
 * Retrieves all collections from the specified PocketBase database.
 *
 * @param dbUrl - The URL of the PocketBase database to connect to.
 * @param dbSuperuserEmail - The email address of the superuser account.
 * @param dbSuperuserPassword - The password of the superuser account.
 */
const getCollectionsFromDb = async (p: {
  dbUrl: string;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
}) => {
  const appPb = new PocketBase(p.dbUrl);
  await appPb
    .collection(superusersCollectionName)
    .authWithPassword(p.dbSuperuserEmail, p.dbSuperuserPassword);

  const collections = await appPb.collections.getFullList();
  return collections;
};

/**
 * Applies the given collections to the specified PocketBase database
 *
 * @param p.dbUrl - The URL of the PocketBase database to connect to.
 * @param p.dbSuperuserEmail - The email address of the superuser account.
 * @param p.dbSuperuserPassword - The password of the superuser account.
 * @param p.collections - An array of CollectionModel objects to import into the database.
 */
const applyCollectionsToDb = async (p: {
  dbUrl: string;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
  collections: CollectionModel[];
}) => {
  const testPb = new PocketBase(p.dbUrl);
  await testPb
    .collection(superusersCollectionName)
    .authWithPassword(p.dbSuperuserEmail, p.dbSuperuserPassword);

  await testPb.collections.import(p.collections);
};

export type TSetupAndServeTestDbFromRunningInstance = Parameters<
  typeof setupAndServeTempDbFromRunningInstance
>[0];

export const setupAndServeTempDbFromRunningInstance = async (p: {
  runningBuildFilePath: string;
  runningDbUrl: string;
  runningDbSuperuserEmail: string;
  runningDbSuperuserPassword: string;
  tempDbUrl: string;
  tempDirPath: string;
  tempDbSuperuserEmail: string;
  tempDbSuperuserPassword: string;
}) => {
  const pocketbaseBuildFileName = p.runningBuildFilePath
    .split("/")
    .filter((x) => !!x)
    .slice(-1)[0]!;
  const tempBuildFilePath = `${p.tempDirPath}/${pocketbaseBuildFileName}`;

  const tempDbPortNumber = getPortNumberFromDbUrl(p.tempDbUrl);
  if (!tempDbPortNumber) return;

  // deleteTempTestDir
  fse.removeSync(p.tempDirPath);

  // copyBuildToTempFolder
  fse.ensureDirSync(p.tempDirPath);
  fse.copyFileSync(p.runningBuildFilePath, tempBuildFilePath);
  const pbProcess = await serveBuildAndWriteLogs({
    dbUrl: p.tempDbUrl,
    buildFilePath: tempBuildFilePath,
    logFileDirPath: p.tempDirPath,
  });

  await upsertAdminCredentials({
    buildFilePath: tempBuildFilePath,
    dbSuperuserEmail: p.tempDbSuperuserEmail,
    dbSuperuserPassword: p.tempDbSuperuserPassword,
  });

  const collections = await getCollectionsFromDb({
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

export const clearDatabase = async (p: {
  dbUrl: string;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
}) => {
  const superuserPb = new PocketBase(p.dbUrl);
  await superuserPb
    .collection(superusersCollectionName)
    .authWithPassword(p.dbSuperuserEmail, p.dbSuperuserPassword);

  const collections = await superuserPb.collections.getFullList();
  const truncationPromises = collections
    .filter((coll) => coll.name !== superusersCollectionName)
    .map((coll) => superuserPb.collections.truncate(coll.name));
  await Promise.all(truncationPromises);

  const superuserRecords = await superuserPb.collection(superusersCollectionName).getFullList();
  const deleteSuperuserPromises = superuserRecords
    .filter((record) => record.email !== p.dbSuperuserEmail)
    .map((record) => superuserPb.collection(superusersCollectionName).delete(record.id));
  await Promise.all(deleteSuperuserPromises);

  superuserPb.authStore.clear();
};

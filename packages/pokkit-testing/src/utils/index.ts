import PocketBase, { CollectionModel } from "pocketbase";
import { exec, spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import { promisify } from "util";
import { superusersCollectionName } from "./setupAndServeTempDbFromRunningInstance";

const execAsync = promisify(exec);

export const getPortNumberFromDbServeUrl = (dbServeUrl: string): string | undefined => {
  return dbServeUrl.split(":")[2]?.match(/^\d+/)?.[0];
};

export const killPocketbaseInstanceByDbServeUrl = (dbServeUrl: string) => {
  const portNumber = getPortNumberFromDbServeUrl(dbServeUrl);
  return execAsync(
    `kill -9 $(lsof -ti :"${portNumber}" 2>/dev/null | head -n 1) 2>/dev/null || true`,
  );
};
export const killPocketbaseInstanceBySpawnProcess = (
  spawnProcess: ChildProcessWithoutNullStreams,
) => {
  return spawnProcess.kill("SIGTERM");
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
  dbBuildFilePath: string;
  dbLogFilePath: string;
  dbUrl: string;
}): Promise<ChildProcessWithoutNullStreams> => {
  const dbServeUrl = p.dbUrl.replace("http://", "");
  const dbPortNumber = getPortNumberFromDbServeUrl(p.dbUrl);

  if (!dbPortNumber)
    throw new Error(
      `Invalid dbUrl: ${p.dbUrl} - requires format http://anyurl:1234 (port number after second colon)`,
    );

  fse.ensureFileSync(p.dbLogFilePath);
  const logStream = fse.createWriteStream(p.dbLogFilePath, { flags: "a" });
  const pbProcess = spawn(p.dbBuildFilePath, ["serve", `--http=${dbServeUrl}`]);

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
const getCollectionsFromRunningDbInstance = async (p: {
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

import PocketBase from "pocketbase";
import type { CollectionModel } from "pocketbase";
import { exec, spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import { promisify } from "util";
import { superusersCollectionName } from "./pbMetadata";

const execAsync = promisify(exec);

export const getPortNumberFromDbUrl = (dbUrl: string): string | undefined => {
  return dbUrl.split(":").slice(-1)[0]?.match(/^\d+/)?.[0];
};

export const killPocketbaseInstanceByDbUrl = (dbUrl: string) => {
  const portNumber = getPortNumberFromDbUrl(dbUrl);
  return execAsync(
    `kill -9 $(lsof -ti :"${portNumber}" 2>/dev/null | head -n 1) 2>/dev/null || true`,
  );
};

export const killPocketbaseInstanceBySpawnProcess = (
  spawnProcess: ChildProcessWithoutNullStreams,
) => {
  return spawnProcess.kill("SIGTERM");
};

export const createPbServeAddress = (p: { portNumber: number }) => `0.0.0.0:${p.portNumber}`;
export const createPbServeUrl = (p: { portNumber: number }) => `http://0.0.0.0:${p.portNumber}`;
export const createPbBuildFilePath = (p: { dirPath: string }) => `${p.dirPath}/app-db`;
export const createPbLogFilePath = (p: { dirPath: string }) => `${p.dirPath}/log.txt`;

/**
 * Serves the PocketBase build and writes logs to a file.
 *
 * @param buildFilePath - Path to the existing PocketBase executable to serve.
 * @param logFilePath - Path to the file where logs will be written.
 * @param dbUrl - Database URL in the format http://anyurl:1234 (port number after second colon).
 */
export const serveDbAndWriteLogs = async (p: {
  dbBuildDirPath: string;
  dbPortNumber: number;
}): Promise<{
  pbProcess: ChildProcessWithoutNullStreams;
  dbServeUrl: string;
  dbUrl: string;
}> => {
  const dbServeUrl = createPbServeAddress({ portNumber: p.dbPortNumber });
  const dbUrl = createPbServeUrl({ portNumber: p.dbPortNumber });
  const dbBuildFilePath = createPbBuildFilePath({ dirPath: p.dbBuildDirPath });
  const dbLogFilePath = createPbLogFilePath({ dirPath: p.dbBuildDirPath });

  const buildFileExists = await fse.pathExists(dbBuildFilePath);
  if (!buildFileExists)
    throw new Error(`setupAndServeDb: dbBuildFile does not exist: ${dbBuildFilePath}`);

  fse.ensureFileSync(dbLogFilePath);

  const logStream = fse.createWriteStream(dbLogFilePath, { flags: "a" });
  const pbProcess = spawn(dbBuildFilePath, ["serve", `--http=${dbServeUrl}`]);

  await new Promise((resolve) => {
    pbProcess.stdout.on("data", (data) => {
      const strData = data.toString() as string;
      logStream.write(`[stdout] ${strData}\n`);

      if (strData.includes("Server started at")) resolve(pbProcess);
    });

    pbProcess.stderr.on("data", (data) => {
      logStream.write(`[stderr] ${data.toString()}\n`);
    });

    pbProcess.on("error", (error) => {
      logStream.write(`[error] ${error.message}\n`);
      logStream.end();
    });
  });

  return { pbProcess, dbUrl, dbServeUrl };
};

/**
 * Creates or updates the superuser admin credentials for the test database.
 *
 * @param buildFilePath - Path to the temporary test PocketBase executable used to apply the credential change.
 * @param dbSuperuserEmail - The email address to set for the superuser account.
 * @param dbSuperuserPassword - The password to set for the superuser account.
 */
export const upsertAdminCredentials = async (p: {
  buildDirPath: string;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
}) => {
  const dbBuildFilePath = `${p.buildDirPath}/app-db`;

  const upsertProcess = spawn(`${dbBuildFilePath}`, [
    "superuser",
    "upsert",
    p.dbSuperuserEmail,
    p.dbSuperuserPassword,
  ]);

  upsertProcess.on("error", (err) => console.error("spawn error:", err));

  return new Promise((resolve) => {
    upsertProcess.stdout.on("data", (data) => {
      if (data.toString().includes("Successfully saved")) {
        resolve(true);
      }
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
export const getCollectionsFromRunningDbInstance = async (p: {
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
export const applyCollectionsToDb = async (p: {
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

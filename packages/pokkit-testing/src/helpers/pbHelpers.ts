import { exec, spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import { promisify } from "util";
import PocketBase from "pocketbase";
import { superusersCollectionName } from "../helpers/pbMetadata";

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
export const killPocketbaseInstanceByDbPortNumber = (portNumber: number) => {
  return execAsync(
    `kill -9 $(lsof -ti :"${portNumber}" 2>/dev/null | head -n 1) 2>/dev/null || true`,
  );
};

export const killPocketbaseInstanceBySpawnProcess = (
  spawnProcess: ChildProcessWithoutNullStreams,
) => {
  return spawnProcess.kill("SIGTERM");
};

export const killPbInstance = (
  p: { spawnProcess: ChildProcessWithoutNullStreams } | { pbPortNumber: number },
) => {
  if ("pbPortNumber" in p) return killPocketbaseInstanceByDbPortNumber(p.pbPortNumber);
  return killPocketbaseInstanceBySpawnProcess(p.spawnProcess);
};

export const getPbServeAddress = (p: { portNumber: number }) => `0.0.0.0:${p.portNumber}`;
export const getPbServeUrl = (p: { pbPortNumber: number }) => `http://0.0.0.0:${p.pbPortNumber}`;
export const getPbBuildFilePath = (p: { dirPath: string }) => p.dirPath + "/app-db";
export const getPbLogFilePath = (p: { dirPath: string }) => p.dirPath + "/log.txt";

/**
 * Serves the PocketBase build and writes logs to a file.
 *
 * @param buildFilePath - Path to the existing PocketBase executable to serve.
 * @param logFilePath - Path to the file where logs will be written.
 * @param dbUrl - Database URL in the format http://anyurl:1234 (port number after second colon).
 */
export const servePb = async (p: {
  pbFilePath: string;
  pbPortNumber: number;
  logFilePath?: string;
}): Promise<{
  pbProcess: ChildProcessWithoutNullStreams;
  dbServeUrl: string;
  dbUrl: string;
}> => {
  const portNumber = p.pbPortNumber;
  const dbServeUrl = getPbServeAddress({ portNumber });
  const dbUrl = getPbServeUrl({ pbPortNumber: portNumber });

  const buildFileExists = await fse.pathExists(p.pbFilePath);
  if (!buildFileExists) throw new Error(`servePb: pbFile does not exist: ${p.pbFilePath}`);

  const pbProcess = spawn(p.pbFilePath, ["serve", `--http=${dbServeUrl}`, "--dev"]);

  if (p.logFilePath) fse.ensureFileSync(p.logFilePath);
  const logStream = p.logFilePath
    ? fse.createWriteStream(p.logFilePath, { flags: "a" })
    : undefined;

  await new Promise((resolve) => {
    pbProcess.stdout.on("data", (data) => {
      const strData = data.toString();
      logStream?.write(`[stdout] ${strData}\n`);

      if (strData.includes("Server started at")) resolve(pbProcess);
    });

    pbProcess.stderr.on("data", (data) => {
      logStream?.write(`[stderr] ${data.toString()}\n`);
      resolve(pbProcess);
    });

    pbProcess.on("error", (error) => {
      logStream?.write(`[error] ${error.message}\n`);
      logStream?.end();
      resolve(pbProcess);
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
export const upsertAdminCredentialsFromCli = async (p: {
  pbFilePath: string;
  superuserEmail: string;
  superuserPassword: string;
}) => {
  const upsertProcess = spawn(`${p.pbFilePath}`, [
    "superuser",
    "upsert",
    p.superuserEmail,
    p.superuserPassword,
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

export const clearPb = async (p: {
  pbPortNumber: number;
  superuserEmail: string;
  superuserPassword: string;
}) => {
  const superuserPb = new PocketBase(getPbServeUrl({ pbPortNumber: p.pbPortNumber }));
  await superuserPb
    .collection(superusersCollectionName)
    .authWithPassword(p.superuserEmail, p.superuserPassword);

  const collections = await superuserPb.collections.getFullList();

  const truncationPromises = collections
    .filter((coll) => coll.name !== superusersCollectionName)
    .map((coll) => superuserPb.collections.truncate(coll.name));
  await Promise.all(truncationPromises);

  const superuserRecords = await superuserPb.collection(superusersCollectionName).getFullList();
  const deleteSuperuserPromises = superuserRecords
    .filter((record) => record.email !== p.superuserEmail)
    .map((record) => superuserPb.collection(superusersCollectionName).delete(record.id));
  await Promise.all(deleteSuperuserPromises);

  superuserPb.authStore.clear();
};

import { exec, spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";
import { promisify } from "util";
import PocketBase from "pocketbase";
import type { ListOptions } from "pocketbase";
import { superusersCollectionName } from "../helpers/pbMetadata";
import { delay } from "@repo/pokkit-utils";

const execAsync = promisify(exec);

export const getPortNumberFromDbUrl = (dbUrl: string): number | undefined => {
  const rtn = dbUrl.split(":").slice(-1)[0]?.match(/^\d+/)?.[0];
  if (!rtn) return undefined;
  return parseInt(rtn);
};

export const killPocketbaseInstanceByDbUrl = async (dbUrl: string) => {
  const portNumber = getPortNumberFromDbUrl(dbUrl);
  if (!portNumber) return { success: false, error: "Port number not found in dbUrl" } as const;

  return killPocketbaseInstanceByDbPortNumber(portNumber);
};
export const killPocketbaseInstanceByDbPortNumber = async (portNumber: number) => {
  try {
    const result = await execAsync(
      `kill -15 $(lsof -tiTCP:"${portNumber}" -sTCP:LISTEN 2>/dev/null | head -n 1) 2>/dev/null || true`,
    );
    return { success: true, data: result } as const;
  } catch (error) {
    return { success: false, error } as const;
  }
};

export const killPocketbaseInstanceBySpawnProcess = async (
  spawnProcess: ChildProcessWithoutNullStreams,
) => {
  try {
    const result = await new Promise<void>((resolve, reject) => {
      spawnProcess.once("exit", () => resolve());
      // spawnProcess.once("close", () => resolve());
      spawnProcess.once("error", reject);
      spawnProcess.kill("SIGTERM");
    });
    return { success: true, data: result } as const;
  } catch (error) {
    return { success: false, error } as const;
  }
};

export const killPbInstance = (
  p: { spawnProcess: ChildProcessWithoutNullStreams } | { pbPortNumber: number },
) => {
  if ("pbPortNumber" in p) return killPocketbaseInstanceByDbPortNumber(p.pbPortNumber);
  return killPocketbaseInstanceBySpawnProcess(p.spawnProcess);
};

export const getPbServeAddress = (p: { portNumber: number }) => `0.0.0.0:${p.portNumber}`;
export const getPbServeUrl = (p: { pbPortNumber: number }) => `http://0.0.0.0:${p.pbPortNumber}`;
export const getPbFilePath = (p: { pbDirPath: string }) => p.pbDirPath + "/app-db";

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
}) => {
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
  try {
    await new Promise((resolve, reject) => {
      pbProcess.stdout.on("data", (data) => {
        const strData = data.toString();
        logStream?.write(`[stdout] ${strData}\n`);

        if (strData.includes("Server started at")) resolve(pbProcess);
      });

      pbProcess.stderr.on("data", (data) => {
        logStream?.write(`[stderr] ${data.toString()}\n`);
        logStream?.end();
        reject(data.toString());
      });

      pbProcess.on("error", (error) => {
        logStream?.write(`[error] ${error.message}\n`);
        logStream?.end();
        reject(error);
      });
    });
    return { success: true, data: { pbProcess, dbUrl, dbServeUrl } } as const;
  } catch (error) {
    return { success: false, error } as const;
  }
};

/**
 * Creates or updates the superuser admin credentials for the test database.
 */
export const upsertPbAdminCredentialsFromCli = async (p: {
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

export const truncatePbCollections = async (p: {
  pbPortNumber: number;
  superuserEmail: string;
  superuserPassword: string;
  ignoreCollections: string[];
}) => {
  const superuserPb = new PocketBase(getPbServeUrl({ pbPortNumber: p.pbPortNumber }));
  await superuserPb
    .collection(superusersCollectionName)
    .authWithPassword(p.superuserEmail, p.superuserPassword);

  const collections = await superuserPb.collections.getFullList();

  const truncationPromises = collections
    .filter((coll) => !p.ignoreCollections.includes(coll.name))
    .map((coll) => superuserPb.collections.truncate(coll.name));
  await Promise.all(truncationPromises);

  superuserPb.authStore.clear();
};

export const pollPbLogsUntilNonZeroItems = async (p: {
  pb: PocketBase;
  maxDurationMs: number;
  delayMs: number;
}) => {
  let iterations = 0;
  const startDateTime = new Date();
  const endDateTime = new Date(startDateTime.getTime() + p.maxDurationMs);

  while (new Date().getTime() < endDateTime.getTime()) {
    const logs = await p.pb.logs.getList();
    iterations += 1;
    if (logs.totalItems > 0) {
      const timeTakenMs = new Date().getTime() - startDateTime.getTime();
      return { success: true, data: logs, timeTakenMs, iterations } as const;
    }

    await delay(p.delayMs);
  }
  const timeTakenMs = new Date().getTime() - startDateTime.getTime();
  return { success: false, error: "No logs found", timeTakenMs, iterations } as const;
};

export const pollPbLogsUntilNumberOfItemsChange = async (p: {
  pb: PocketBase;
  maxDurationMs: number;
  delayMs: number;
  props?: { page: number; perPage: number; options: ListOptions };
}) => {
  const normalisedProps = [p.props?.page, p.props?.perPage, p.props?.options] as const;
  let iterations = 0;
  const startDateTime = new Date();
  const endDateTime = new Date(startDateTime.getTime() + p.maxDurationMs);

  const logsBefore = await p.pb.logs.getList(...normalisedProps);
  while (new Date().getTime() < endDateTime.getTime()) {
    const logsAfter = await p.pb.logs.getList(...normalisedProps);
    iterations += 1;
    if (logsAfter.totalItems !== logsBefore.totalItems) {
      const timeTakenMs = new Date().getTime() - startDateTime.getTime();
      return { success: true, data: logsAfter, timeTakenMs, iterations } as const;
    }

    await delay(p.delayMs);
  }
  return { success: false, error: "No logs found" } as const;
};

export const createPbTestFunctions = (p: {
  pbPortNumber: number;
  pbFilePath: string;
  sourcePbDirPath: string;
  sandboxPbDirPath: string;
  logFilePath: string;
  superuserEmail: string;
  superuserPassword: string;
}) => {
  const cleanup = async () => {
    await killPbInstance({ pbPortNumber: p.pbPortNumber });
    fse.removeSync(p.sandboxPbDirPath);
  };

  const copySourcePbDirToSandbox = async () => {
    fse.copySync(p.sourcePbDirPath, p.sandboxPbDirPath);
  };

  const serveSandboxPb = async () => {
    await servePb({
      pbFilePath: getPbFilePath({ pbDirPath: p.sandboxPbDirPath }),
      pbPortNumber: p.pbPortNumber,
      logFilePath: p.logFilePath,
    });
  };

  const upsertPbAdminCredentials = async () => {
    await upsertPbAdminCredentialsFromCli({
      pbFilePath: p.pbFilePath,
      superuserEmail: p.superuserEmail,
      superuserPassword: p.superuserPassword,
    });
  };
  return { cleanup, copySourcePbDirToSandbox, serveSandboxPb, upsertPbAdminCredentials };
};

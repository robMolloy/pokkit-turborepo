import { exec, spawn, type ChildProcessWithoutNullStreams } from "child_process";
import http from "node:http";
import fse from "fs-extra";
import { promisify } from "util";
import PocketBase from "pocketbase";
import type { ListOptions } from "pocketbase";
import { superusersCollectionName } from "../helpers/pbMetadata";
import { delay } from "@repo/pokkit-utils";

const execAsync = promisify(exec);

const ignoreStdioError = () => {};

const getListenPidsOnPort = async (portNumber: number) => {
  const { stdout } = await execAsync(
    `lsof -t -iTCP:${portNumber} -sTCP:LISTEN 2>/dev/null || true`,
  );
  return stdout.trim().split(/\s+/).filter(Boolean);
};

const killPids = async (pids: string[], signal: "TERM" | "KILL") => {
  if (pids.length === 0) return;
  const flag = signal === "KILL" ? "-9" : "-TERM";
  await execAsync(`kill ${flag} ${pids.join(" ")} 2>/dev/null || true`);
};

const waitForPortToBeFree = async (portNumber: number, timeoutMs: number) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pids = await getListenPidsOnPort(portNumber);
    if (pids.length === 0) return true;
    await delay(50);
  }
  return (await getListenPidsOnPort(portNumber)).length === 0;
};

const preventUncaughtChildStdioErrors = (spawnProcess: ChildProcessWithoutNullStreams) => {
  spawnProcess.stdout?.on("error", ignoreStdioError);
  spawnProcess.stderr?.on("error", ignoreStdioError);
  spawnProcess.stdin?.on("error", ignoreStdioError);
};

export const getPortNumberFromDbUrl = (dbUrl: string): string | undefined => {
  return dbUrl.split(":").slice(-1)[0]?.match(/^\d+/)?.[0];
};

export const killPocketbaseInstanceByDbUrl = async (dbUrl: string) => {
  const portNumber = Number(getPortNumberFromDbUrl(dbUrl));
  if (!Number.isFinite(portNumber)) {
    return { success: false, error: new Error(`invalid port in dbUrl: ${dbUrl}`) } as const;
  }
  return killPocketbaseInstanceByDbPortNumber(portNumber);
};

export const killPocketbaseInstanceByDbPortNumber = async (portNumber: number) => {
  try {
    // SIGKILL (kill -9) skips PocketBase OnTerminate hooks and can flush broken
    // stdout/stderr pipes, which Node then surfaces as uncaught exceptions after
    // a test has already passed. SIGTERM first lets the process shut down cleanly.
    const pids = await getListenPidsOnPort(portNumber);
    await killPids(pids, "TERM");
    await waitForPortToBeFree(portNumber, 3000);
    const remainingPids = await getListenPidsOnPort(portNumber);
    await killPids(remainingPids, "KILL");
    await waitForPortToBeFree(portNumber, 1000);
    return { success: true, data: { pids } } as const;
  } catch (error) {
    return { success: false, error } as const;
  }
};

export const killPocketbaseInstanceBySpawnProcess = (
  spawnProcess: ChildProcessWithoutNullStreams,
) => {
  try {
    preventUncaughtChildStdioErrors(spawnProcess);
    const result = spawnProcess.kill("SIGTERM");
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
 * Checks PocketBase /api/health without keeping the TCP connection alive.
 *
 * `fetch()` (undici) pools sockets. When killPbInstance later stops the server,
 * those idle sockets emit uncaught "other side closed" errors after the test
 * has already passed.
 */
export const fetchPbHealthStatus = (p: { pbPortNumber: number }) => {
  const url = `${getPbServeUrl({ pbPortNumber: p.pbPortNumber })}/api/health`;
  return new Promise<number>((resolve, reject) => {
    const req = http.get(url, { agent: false }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode ?? 0));
    });
    req.on("error", reject);
  });
};

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
  preventUncaughtChildStdioErrors(pbProcess);

  if (p.logFilePath) fse.ensureFileSync(p.logFilePath);
  const logStream = p.logFilePath
    ? fse.createWriteStream(p.logFilePath, { flags: "a" })
    : undefined;
  logStream?.on("error", ignoreStdioError);

  const writeLog = (prefix: string, data: Buffer | string) => {
    if (!logStream || logStream.destroyed || logStream.writableEnded) return;
    logStream.write(`${prefix} ${data.toString()}\n`);
  };

  try {
    await new Promise((resolve, reject) => {
      let settled = false;
      const settleResolve = (value: unknown) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const settleReject = (error: unknown) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      const onOutput = (source: "stdout" | "stderr", data: Buffer) => {
        const strData = data.toString();
        writeLog(`[${source}]`, strData);
        if (strData.includes("Server started at")) settleResolve(pbProcess);
      };

      pbProcess.stdout.on("data", (data: Buffer) => onOutput("stdout", data));
      // PocketBase/Go write routine logs to stderr. Treating that as fatal used
      // to end the log stream, so a later killPbInstance flush threw
      // "write after end" after the test had already passed.
      pbProcess.stderr.on("data", (data: Buffer) => onOutput("stderr", data));

      pbProcess.on("error", (error) => {
        writeLog("[error]", error.message);
        settleReject(error);
      });

      pbProcess.on("exit", (code, signal) => {
        if (!settled) {
          settleReject(
            new Error(`pocketbase exited before server started (code=${code}, signal=${signal})`),
          );
        }
      });

      pbProcess.on("close", () => {
        if (logStream && !logStream.destroyed && !logStream.writableEnded) logStream.end();
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
  preventUncaughtChildStdioErrors(upsertProcess);

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

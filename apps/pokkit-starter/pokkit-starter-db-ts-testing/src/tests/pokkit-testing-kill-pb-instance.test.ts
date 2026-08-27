import { fetchPbHealthStatus, killPbInstance, servePb } from "@repo/pokkit-testing";
import fse from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dummyServerSource = `#!/usr/bin/env node
const http = require("http");
const httpArg = process.argv.find((a) => String(a).startsWith("--http="));
const address = httpArg ? httpArg.slice("--http=".length) : "0.0.0.0:8090";
const lastColon = address.lastIndexOf(":");
const host = address.slice(0, lastColon);
const port = Number(address.slice(lastColon + 1));
const server = http.createServer((req, res) => {
  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ code: 200, message: "API is healthy." }));
    return;
  }
  res.writeHead(404);
  res.end();
});
server.listen(port, host, () => {
  console.error("dev mode enabled");
  console.log("Server started at http://" + host + ":" + port);
  setInterval(() => console.error("still running"), 50);
});
`;

describe("killPbInstance after servePb", () => {
  const pbPortNumber = 18901;
  const tmpDir = path.join(os.tmpdir(), `pokkit-kill-pb-${process.pid}`);
  const pbFilePath = path.join(tmpDir, "app-db");
  const logFilePath = path.join(tmpDir, "log.txt");

  afterAll(async () => {
    await killPbInstance({ pbPortNumber });
    await fse.remove(tmpDir);
  });

  it("does not throw after a passing health check when the instance is killed", async () => {
    const uncaught: unknown[] = [];
    const onUncaught = (err: unknown) => {
      uncaught.push(err);
    };
    process.on("uncaughtException", onUncaught);
    process.on("unhandledRejection", onUncaught);

    await fse.ensureDir(tmpDir);
    await fse.writeFile(pbFilePath, dummyServerSource, { mode: 0o755 });

    const serveResp = await servePb({ pbFilePath, pbPortNumber, logFilePath });
    expect(serveResp.success).toBe(true);

    const healthStatus = await fetchPbHealthStatus({ pbPortNumber });
    expect(healthStatus).toBe(200);

    await killPbInstance({ pbPortNumber });
    await new Promise((resolve) => setTimeout(resolve, 250));

    process.off("uncaughtException", onUncaught);
    process.off("unhandledRejection", onUncaught);

    expect(uncaught).toEqual([]);
  });
});

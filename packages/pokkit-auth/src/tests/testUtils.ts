import { setupAndServeDbFromRunningInstance, setupAndServeDb } from "@repo/pokkit-testing";
import { CollectionModel } from "pocketbase";

export const setupAndServeDbFromRunningInstanceWithDefaults = (p: {
  newDbBuildFilePath: string;
  newDbUrl: string;
  newDbLogFilePath: string;
}) =>
  setupAndServeDbFromRunningInstance({
    runningBuildFilePath: "../../apps/pokkit-whisper-db",
    runningDbUrl: "http://0.0.0.0:8090",
    runningDbSuperuserEmail: "admin@admin.com",
    runningDbSuperuserPassword: "admin@admin.com",
    newDbSuperuserPassword: "admin@admin.com",
    newDbSuperuserEmail: "admin@admin.com",
    newDbBuildFilePath: p.newDbBuildFilePath,
    newDbUrl: p.newDbUrl,
    newDbLogFilePath: p.newDbLogFilePath,
  });

export const setupAndServeDbWithDefaults = (p: {
  writeDbBuildToFilePathFn: () => Promise<unknown>;
  dbUrl: string;
  dbBuildFilePath: string;
  dbLogFilePath: string;
}) =>
  setupAndServeDb({
    getCollectionsFn: function (): Promise<CollectionModel[]> {
      throw new Error("Function not implemented.");
    },
    dbSuperuserEmail: "admin@admin.com",
    dbSuperuserPassword: "admin@admin.com",

    writeDbBuildToFilePathFn: p.writeDbBuildToFilePathFn,
    dbBuildFilePath: p.dbBuildFilePath,
    dbLogFilePath: p.dbLogFilePath,
    dbUrl: p.dbUrl,
  });

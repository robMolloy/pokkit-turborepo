import { setupAndServeTempDbFromRunningInstance } from "@repo/pokkit-testing";

type TSetupAndServeTempDbFromRunningInstance = Parameters<
  typeof setupAndServeTempDbFromRunningInstance
>[0];

export const setupAndServeTempDbFromRunningInstanceWithDefault = (
  p: Partial<Omit<TSetupAndServeTempDbFromRunningInstance, "tempDbUrl" | "tempDirPath">> &
    Pick<TSetupAndServeTempDbFromRunningInstance, "tempDbUrl" | "tempDirPath">,
) =>
  setupAndServeTempDbFromRunningInstance({
    runningBuildFilePath: p.runningBuildFilePath ?? "../../apps/pokkit-whisper-db",
    runningDbUrl: p.runningDbUrl ?? "http://0.0.0.0:8090",
    runningDbSuperuserEmail: p.runningDbSuperuserEmail ?? "admin@admin.com",
    runningDbSuperuserPassword: p.runningDbSuperuserPassword ?? "admin@admin.com",
    tempDbUrl: p.tempDbUrl,
    tempDirPath: p.tempDirPath,
    tempDbSuperuserEmail: p.tempDbSuperuserEmail ?? "admin@admin.com",
    tempDbSuperuserPassword: p.tempDbSuperuserPassword ?? "admin@admin.com",
  });

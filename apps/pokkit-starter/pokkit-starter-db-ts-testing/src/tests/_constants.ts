import os from "node:os";

export const sourceTestBuildDirPath = "./source-test-build";
export const getUntouchedSourcePbForPlatformDirPath = () => {
  const platform = process.platform;
  const arch = os.arch();

  if (platform === "darwin" && arch === "arm64") return "./source-untouched-pb-build/darwin-arm64";
  if (platform === "darwin" && arch === "x64") return "./source-untouched-pb-build/darwin-x64";
  if (platform === "linux" && arch === "arm64") return "./source-untouched-pb-build/linux-arm64";
  if (platform === "linux" && arch === "x64") return "./source-untouched-pb-build/linux-x64";

  throw new Error(`Unsupported platform: ${platform}`);
};

export const superuserEmail = "admin@admin.com";
export const superuserPassword = "admin@admin.com";

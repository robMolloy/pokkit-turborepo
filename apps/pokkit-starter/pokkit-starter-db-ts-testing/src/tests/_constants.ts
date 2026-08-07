export const sourceTestBuildDirPath = "./source-test-build";
export const getUntouchedSourcePbForPlatformDirPath = () => {
  const platform = process.platform;

  if (platform === "darwin") return "./source-untouched-pb-build/mac";
  if (platform === "linux") return "./source-untouched-pb-build/linux";

  throw new Error(`Unsupported platform: ${platform}`);
};

export const superuserEmail = "admin@admin.com";
export const superuserPassword = "admin@admin.com";

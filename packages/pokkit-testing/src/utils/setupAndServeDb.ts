import { serveDbAndWriteLogs, upsertAdminCredentials } from "../helpers/pbHelpers";

export const setupAndServeDb = async (p: {
  dbBuildDirPath: string;
  dbPortNumber: number;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
}) => {
  const resp = await serveDbAndWriteLogs({
    dbBuildDirPath: p.dbBuildDirPath,
    dbPortNumber: p.dbPortNumber,
  });

  await upsertAdminCredentials({
    buildDirPath: p.dbBuildDirPath,
    dbSuperuserEmail: p.dbSuperuserEmail,
    dbSuperuserPassword: p.dbSuperuserPassword,
  });
  return resp;
};

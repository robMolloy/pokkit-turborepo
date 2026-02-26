import PocketBase from "pocketbase";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fse from "fs-extra";

const superusersCollectionName = "_superusers";

const serveTempBuildOnPort = async (p: {
  tempTestFilePath: string;
  tempTestDirPath: string;
  dbUrl: string;
}): Promise<ChildProcessWithoutNullStreams> => {
  const dbServeUrl = p.dbUrl.replace("http://", "");
  const dbPortNumber = p.dbUrl.split(":").slice(-1)[0]!;

  const pbProcess = spawn(p.tempTestFilePath, [
    "serve",
    `--http=${dbServeUrl}`,
  ]);
  const logStream = fse.createWriteStream(
    `${p.tempTestDirPath}/pocketbase.log`,
    { flags: "a" },
  );

  return new Promise((resolve) => {
    pbProcess.stdout.on("data", (data) => {
      const strData = data.toString();
      logStream.write(`[stdout] ${data.toString()}\n`);
      if (strData.includes(dbPortNumber)) resolve(pbProcess);
    });

    pbProcess.stderr.on("data", (data) => {
      logStream.write(`[stderr] ${data.toString()}\n`);
    });

    pbProcess.on("error", (error) => {
      logStream.write(`[error] ${error.message}\n`);
      logStream.end();
    });
  });
};

const upsertAdminCredentials = async (p: {
  tempTestFilePath: string;
  testDbSuperuserEmail: string;
  testDbSuperuserPassword: string;
}) => {
  const upsertProcess = spawn(`${p.tempTestFilePath}`, [
    "superuser",
    "upsert",
    p.testDbSuperuserEmail,
    p.testDbSuperuserPassword,
  ]);

  return new Promise((resolve) => {
    upsertProcess.stdout.on("data", (data) => {
      if (data.toString().includes("Successfully saved")) resolve(true);
    });
  });
};

const getCollectionsFromDb = async (p: {
  appDbUrl: string;
  testDbUrl: string;
  appDbSuperuserEmail: string;
  appDbSuperuserPassword: string;
  testDbSuperuserEmail: string;
  testDbSuperuserPassword: string;
}) => {
  const appPb = new PocketBase(p.appDbUrl);
  await appPb
    .collection(superusersCollectionName)
    .authWithPassword(p.appDbSuperuserEmail, p.appDbSuperuserPassword);

  const collections = await appPb.collections.getFullList();

  const testPb = new PocketBase(p.testDbUrl);
  await testPb
    .collection(superusersCollectionName)
    .authWithPassword(p.testDbSuperuserEmail, p.testDbSuperuserPassword);

  await testPb.collections.import(collections);
};

export type TSetupAndServeTestDbFromRunningInstance = Parameters<
  typeof setupAndServeTestDbFromRunningInstance
>[0];
export const setupAndServeTestDbFromRunningInstance = async (p: {
  pocketbaseBuildFilePath: string;
  appDbUrl: string;
  appDbSuperuserEmail: string;
  appDbSuperuserPassword: string;
  testDirPath: string;
  testDbUrl: string;
  testDbSuperuserEmail: string;
  testDbSuperuserPassword: string;
}) => {
  const pocketbaseBuildFileName = p.pocketbaseBuildFilePath
    .split("/")
    .filter((x) => !!x)
    .slice(-1)[0]!;
  const tempTestFilePath = `${p.testDirPath}/${pocketbaseBuildFileName}`;

  const testDbPortNumber = p.testDbUrl
    .split(":")
    .filter((x) => !!x)
    .slice(-1)[0]
    ?.replace(/\D+/g, "");
  if (!testDbPortNumber) return;

  // deleteTempTestDir
  fse.removeSync(p.testDirPath);

  // copyBuildToTempFolder
  fse.ensureDirSync(p.testDirPath);
  fse.copyFileSync(p.pocketbaseBuildFilePath, tempTestFilePath);
  const pbProcess = await serveTempBuildOnPort({
    tempTestFilePath,
    tempTestDirPath: p.testDirPath,
    dbUrl: p.testDbUrl,
  });
  await upsertAdminCredentials({
    tempTestFilePath,
    testDbSuperuserEmail: p.testDbSuperuserEmail,
    testDbSuperuserPassword: p.testDbSuperuserPassword,
  });
  await getCollectionsFromDb({
    appDbUrl: p.appDbUrl,
    testDbUrl: p.testDbUrl,
    appDbSuperuserEmail: p.appDbSuperuserEmail,
    appDbSuperuserPassword: p.appDbSuperuserPassword,
    testDbSuperuserEmail: p.testDbSuperuserEmail,
    testDbSuperuserPassword: p.testDbSuperuserPassword,
  });

  return pbProcess;
};

export const clearDatabase = async (p: {
  dbUrl: string;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
}) => {
  const superuserPb = new PocketBase(p.dbUrl);
  await superuserPb
    .collection(superusersCollectionName)
    .authWithPassword(p.dbSuperuserEmail, p.dbSuperuserPassword);

  const collections = await superuserPb.collections.getFullList();
  const truncationPromises = collections
    .filter((coll) => coll.name !== superusersCollectionName)
    .map((coll) => superuserPb.collections.truncate(coll.name));
  await Promise.all(truncationPromises);

  const superuserRecords = await superuserPb
    .collection(superusersCollectionName)
    .getFullList();
  const deleteSuperuserPromises = superuserRecords
    .filter((record) => record.email !== p.dbSuperuserEmail)
    .map((record) =>
      superuserPb.collection(superusersCollectionName).delete(record.id),
    );
  await Promise.all(deleteSuperuserPromises);

  superuserPb.authStore.clear();
};

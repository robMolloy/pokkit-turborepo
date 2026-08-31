import PocketBase from "pocketbase";
import fs from "fs-extra";

const pb = new PocketBase("https://pokkit.cloud:9999/");

await (async () => {
  const collectionsBuffer = fs.readFileSync(
    "../pokkit-starter-db/build/pb_config/collections.json",
  );
  const secretsBuffer = fs.readFileSync("../pokkit-starter-db/build/pb_config/secrets.json");
  const settingsBuffer = fs.readFileSync("../pokkit-starter-db/build/pb_config/settings.json");
  const collectionsFile = collectionsBuffer
    ? new File([collectionsBuffer], "collections.json")
    : undefined;
  const secretsFile = secretsBuffer ? new File([secretsBuffer], "secrets.json") : undefined;
  const settingsFile = settingsBuffer ? new File([settingsBuffer], "settings.json") : undefined;

  const deployment = await pb.collection("deployments").create({
    buildFile: fs.readFileSync("../pokkit-starter-db/build/app-db"),
    collectionsFile,
    secretsFile,
    settingsFile,
    superuserEmail: "admin@admin.com",
    superuserPassword: "admin@admin.com",
  });

  console.log(deployment);
})();

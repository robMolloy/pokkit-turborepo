import PocketBase from "pocketbase";
import fs from "fs-extra";

await (async () => {
  const pb = new PocketBase("https://pokkit.cloud:9999");
  pb.autoCancellation(false);

  await pb.collection("_superusers").authWithPassword("admin@admin.com", "admin@admin.com");

  const buildBuffer = fs.readFileSync("../pokkit-starter-db/build/app-db");
  const buildFile = new File([buildBuffer], "app-db");
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
    buildFile,
    collectionsFile,
    secretsFile,
    settingsFile,
    superuserEmail: "admin@admin.com",
    superuserPassword: "admin@admin.com",
  });

  const portNumber = deployment.portNumber;
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `portNumber=${portNumber}\n`);
  } else {
    console.log(portNumber);
  }
})();

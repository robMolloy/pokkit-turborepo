import PocketBase from "pocketbase";
import { envConfig } from "./envConfig";

export const pb = new PocketBase(envConfig.VITE_POCKETBASE_URL);
pb.autoCancellation(false);

export { PocketBase };

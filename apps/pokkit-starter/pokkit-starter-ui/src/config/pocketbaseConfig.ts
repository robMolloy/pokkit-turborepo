import PocketBase from "pocketbase";
import { envConfig } from "./envConfig";

export const createPbConnection = () => {
  const pb = new PocketBase(envConfig.VITE_POCKETBASE_URL);
  pb.autoCancellation(false);
  return pb;
};
export const pb = createPbConnection();

export { PocketBase };

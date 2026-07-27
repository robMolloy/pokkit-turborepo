import PocketBase from "pocketbase";
import { superusersCollectionName } from "../helpers/pbMetadata";

export const clearDb = async (p: {
  dbPortNumber: number;
  dbSuperuserEmail: string;
  dbSuperuserPassword: string;
}) => {
  const superuserPb = new PocketBase(`http://0.0.0.0:${p.dbPortNumber}`);
  await superuserPb
    .collection(superusersCollectionName)
    .authWithPassword(p.dbSuperuserEmail, p.dbSuperuserPassword);

  const collections = await superuserPb.collections.getFullList();

  const truncationPromises = collections
    .filter((coll) => coll.name !== superusersCollectionName)
    .map((coll) => superuserPb.collections.truncate(coll.name));
  await Promise.all(truncationPromises);

  const superuserRecords = await superuserPb.collection(superusersCollectionName).getFullList();
  const deleteSuperuserPromises = superuserRecords
    .filter((record) => record.email !== p.dbSuperuserEmail)
    .map((record) => superuserPb.collection(superusersCollectionName).delete(record.id));
  await Promise.all(deleteSuperuserPromises);

  superuserPb.authStore.clear();
};

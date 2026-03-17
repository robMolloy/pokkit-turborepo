import PocketBase from "pocketbase";
import { createRecordHelper, smartSubscribeToAllRecords } from "@repo/pokkit-auth";
import z from "zod";

const audioRecordingsCollectionName = "audioRecordings";
const audioRecordingRecordSchema = z.object({
  id: z.string(),
  collectionName: z.string(),
  fileName: z.string(),
  created: z.string(),
  updated: z.string(),
});
export type TAudioRecordingRecord = z.infer<typeof audioRecordingRecordSchema>;

export const createAudioRecordingRecord = async (p: { pb: PocketBase; audioBlob: Blob }) => {
  return createRecordHelper({
    pb: p.pb,
    collectionName: audioRecordingsCollectionName,
    data: { fileName: p.audioBlob },
    schema: audioRecordingRecordSchema,
    successMessagesFn: () => ["Successfully created audio recording record"],
    errorMessagesFn: () => ["Failed to create audio recording record"],
  });
};

export const smartSubscribeToAllAudioRecordingRecords = async (p: {
  pb: PocketBase;
  onChange: (x: TAudioRecordingRecord[]) => void;
}) => {
  return smartSubscribeToAllRecords({
    pb: p.pb,
    collectionName: audioRecordingsCollectionName,
    itemSchema: audioRecordingRecordSchema,
    onChange: p.onChange,
  });
};

export const getAudioBlobFromAudioRecordingRecord = async (p: {
  pb: PocketBase;
  record: TAudioRecordingRecord;
}) => {
  const url = p.pb.files.getURL(p.record, p.record.fileName);

  const response = await fetch(url);
  return response.blob();
};

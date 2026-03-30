import { smartSubscribeToAllRecords } from "@repo/pokkit-auth";
import PocketBase from "pocketbase";
import z from "zod";

const audioTranscriptionsCollectionName = "audioTranscriptions";
const audioTranscriptionRecordSchema = z.object({
  id: z.string(),
  collectionName: z.string(),
  text: z.string(),
  created: z.string(),
  updated: z.string(),
});
export type TAudioTranscriptionRecord = z.infer<typeof audioTranscriptionRecordSchema>;

// export const createAudioRecordingRecord = async (p: { pb: PocketBase; audioBlob: Blob }) => {
//   return createRecordHelper({
//     pb: p.pb,
//     collectionName: audioTranscriptionsCollectionName,
//     data: { fileName: p.audioBlob },
//     schema: audioTranscriptionRecordSchema,
//     successMessagesFn: () => ["Successfully created audio recording record"],
//     errorMessagesFn: () => ["Failed to create audio recording record"],
//   });
// };

export const smartSubscribeToAllAudioTranscriptionRecords = async (p: {
  pb: PocketBase;
  onChange: (x: TAudioTranscriptionRecord[]) => void;
}) => {
  return smartSubscribeToAllRecords({
    pb: p.pb,
    collectionName: audioTranscriptionsCollectionName,
    itemSchema: audioTranscriptionRecordSchema,
    onChange: p.onChange,
  });
};

// export const getAudioBlobFromAudioRecordingRecord = async (p: {
//   pb: PocketBase;
//   record: TAudioRecordingRecord;
// }) => {
//   const url = p.pb.files.getURL(p.record, p.record.fileName);

//   const response = await fetch(url);
//   return response.blob();
// };

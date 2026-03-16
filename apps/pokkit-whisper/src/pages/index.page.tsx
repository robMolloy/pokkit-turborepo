import { AudioRecorder } from "@/components/audioRecorder";
import { pb, PocketBase } from "@/config/pocketbaseConfig";
import {
  extractMessageFromPbError,
  SignedInRouteProtector,
  SignedOutRouteProtector,
  smartSubscribeToAllRecords,
} from "@repo/pokkit-auth";
import { CustomIcon } from "@repo/pokkit-components";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import z from "zod";

const audioRecordingsCollectionName = "audioRecordings";
const audioRecordingRecordSchema = z.object({
  id: z.string(),
  collectionName: z.string(),
  fileName: z.string(),
  created: z.string(),
  updated: z.string(),
});
type TAudioRecordingRecord = z.infer<typeof audioRecordingRecordSchema>;

const createRecordHelper = async <T extends object, U extends z.ZodType>(p: {
  pb: PocketBase;
  collectionName: string;
  data: T;
  schema: U;
  successMessagesFn: (x: z.infer<U>) => string[];
  errorMessagesFn: (x: T) => string[];
}) => {
  try {
    const resp = await p.pb.collection(p.collectionName).create(p.data);

    const data = p.schema.parse(resp);
    const messages = p.successMessagesFn(data);

    return { success: true, data, messages } as const;
  } catch (error) {
    const messagesResp = extractMessageFromPbError({ error });
    const messages = [...p.errorMessagesFn(p.data), ...(messagesResp ? messagesResp : [])];

    return { success: false, error, messages } as const;
  }
};

const createAudioRecordingRecord = async (p: { audioBlob: Blob }) => {
  return createRecordHelper({
    pb,
    collectionName: audioRecordingsCollectionName,
    data: { fileName: p.audioBlob },
    schema: audioRecordingRecordSchema,
    successMessagesFn: () => ["Successfully created audio recording record"],
    errorMessagesFn: () => ["Failed to create audio recording record"],
  });
};

const smartSubscribeToAllAudioRecordingRecords = async (p: {
  onChange: (x: TAudioRecordingRecord[]) => void;
}) => {
  return smartSubscribeToAllRecords({
    pb,
    collectionName: audioRecordingsCollectionName,
    itemSchema: audioRecordingRecordSchema,
    onChange: p.onChange,
  });
};

const DisplayAudioBlob = (p: { initId: string; audioBlob: Blob }) => {
  const [audioBlobFileUrl, setAudioBlobFileUrl] = useState<string | undefined>(
    p.audioBlob ? URL.createObjectURL(p.audioBlob) : undefined,
  );

  useEffect(() => {
    setAudioBlobFileUrl(p.audioBlob ? URL.createObjectURL(p.audioBlob) : undefined);

    return () => {
      if (audioBlobFileUrl) URL.revokeObjectURL(audioBlobFileUrl);
    };
  }, [p.audioBlob]);

  return (
    <div className="flex gap-12">
      {p.audioBlob && !audioBlobFileUrl && <div>Loading...</div>}

      {audioBlobFileUrl && <audio controls src={audioBlobFileUrl} />}
    </div>
  );
};

const DisplayAudioRecordingRecord = (p: {
  audioRecordingRecord: TAudioRecordingRecord;
  audioBlob?: Blob;
}) => {
  const [audioBlob, setAudioBlob] = useState<Blob | undefined>(p.audioBlob);
  const [audioBlobFileUrl, setAudioBlobFileUrl] = useState<string | undefined>(
    p.audioBlob ? URL.createObjectURL(p.audioBlob) : undefined,
  );

  useEffect(() => {
    setAudioBlob(p.audioBlob);
  }, [p.audioBlob]);

  useEffect(() => {
    if (audioBlob) setAudioBlobFileUrl(audioBlob ? URL.createObjectURL(audioBlob) : undefined);

    return () => {
      if (audioBlobFileUrl) URL.revokeObjectURL(audioBlobFileUrl);
    };
  }, [audioBlob]);

  return (
    <div className="flex gap-6">
      <span>{p.audioRecordingRecord.fileName}</span>
      {!audioBlobFileUrl && (
        <button
          onClick={async () => {
            const url = pb.files.getURL(p.audioRecordingRecord, p.audioRecordingRecord.fileName);

            const response = await fetch(url);
            const blob = await response.blob();
            setAudioBlob(blob);
          }}
        >
          <CustomIcon iconName="Download" size="md" />
        </button>
      )}

      {audioBlobFileUrl && <audio controls src={audioBlobFileUrl} />}
    </div>
  );
};

const IndexPage = () => {
  const navigate = useNavigate();

  const [audioBlobAndIdsList, setAudioBlobsAndIds] = useState<
    { audioBlob: Blob; tempId?: string; audioRecordId?: string }[]
  >([]);
  const [audioRecordingRecords, setAudioRecordingRecords] = useState<TAudioRecordingRecord[]>([]);

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllAudioRecordingRecords({
      onChange: (newAudioRecordingRecords) => setAudioRecordingRecords(newAudioRecordingRecords),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, []);

  return (
    <div>
      <h1>Pokkit Whisper</h1>
      <br />

      <SignedInRouteProtector ifUserIsUnverified={() => navigate("/auth/verification-request")}>
        <div>You are signed in</div>
        <AudioRecorder
          onRecordingComplete={async (audioBlob) => {
            const tempId = crypto.randomUUID();
            setAudioBlobsAndIds((prev) => [...prev, { audioBlob, tempId: tempId }]);

            const createResp = await createAudioRecordingRecord({ audioBlob });

            if (!createResp.success) return;

            setAudioBlobsAndIds((prev) => {
              const index = prev.findIndex((item) => item.tempId === tempId);
              if (index !== -1) prev[index] = { ...prev[index], audioRecordId: createResp.data.id };
              return [...prev];
            });
          }}
        />
        <br />

        <div className="flex flex-col gap-4">
          {audioBlobAndIdsList
            .filter((audioBlobAndIds) => !audioBlobAndIds.audioRecordId)
            .map((audioBlobAndIds, j) => {
              return (
                <div key={j} className="flex gap-4">
                  <span>{j}:</span>
                  <DisplayAudioBlob
                    initId={audioBlobAndIds.tempId!}
                    audioBlob={audioBlobAndIds.audioBlob}
                  />
                </div>
              );
            })}
          {audioRecordingRecords
            .sort((a, b) => (a.created < b.created ? 1 : -1))
            .map((audioRecord, j) => {
              const blobItem = audioBlobAndIdsList.find((x) => x.audioRecordId === audioRecord.id);

              return (
                <div key={audioRecord.id} className="flex gap-4">
                  <span>{j}:</span>
                  <DisplayAudioRecordingRecord
                    audioRecordingRecord={audioRecord}
                    audioBlob={blobItem?.audioBlob}
                  />
                </div>
              );
            })}
        </div>
      </SignedInRouteProtector>

      <SignedOutRouteProtector>
        <div>You are signed out</div>
        <div>Log in to enjoy the app</div>
      </SignedOutRouteProtector>

      <br />
    </div>
  );
};

export default IndexPage;

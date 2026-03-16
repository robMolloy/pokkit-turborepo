import { AudioRecorder } from "@/components/audioRecorder";
import { pb } from "@/config/pocketbaseConfig";
import {
  SignedInRouteProtector,
  SignedOutRouteProtector,
  smartSubscribeToAllRecords,
} from "@repo/pokkit-auth";
import { CustomIcon } from "@repo/pokkit-components";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import z from "zod";

const recordingsCollectionName = "recordings";
const recordingSchema = z.object({
  id: z.string(),
  collectionName: z.string(),
  file: z.string(),
  created: z.string(),
  updated: z.string(),
});
type TRecording = z.infer<typeof recordingSchema>;

const DisplayAndCreateRecordForAudioBlob = (p: { initId: string; audioBlob: Blob }) => {
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

const DisplayRecording = (p: { recording: TRecording; audioBlob?: Blob }) => {
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
      <span>{p.recording.file}</span>
      {!audioBlobFileUrl && (
        <button
          onClick={async () => {
            const firstFilename = p.recording.file;
            const url = pb.files.getURL(p.recording, firstFilename);

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
  const [audioRecords, setAudioRecords] = useState<TRecording[]>([]);

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllRecords({
      pb,
      collectionName: recordingsCollectionName,
      itemSchema: recordingSchema,
      onChange: (newRecordingRecords) => {
        setAudioRecords(newRecordingRecords);
      },
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

            const newAudioRecord = await pb.collection("recordings").create({ file: audioBlob });
            const parsedResp = recordingSchema.safeParse(newAudioRecord);
            if (!parsedResp.success) return;

            setAudioBlobsAndIds((prev) => {
              const index = prev.findIndex((item) => item.tempId === tempId);
              if (index !== -1) prev[index] = { ...prev[index], audioRecordId: newAudioRecord.id };
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
                  <DisplayAndCreateRecordForAudioBlob
                    initId={audioBlobAndIds.tempId!}
                    audioBlob={audioBlobAndIds.audioBlob}
                  />
                </div>
              );
            })}
          {audioRecords
            .sort((a, b) => (a.created < b.created ? 1 : -1))
            .map((audioRecord, j) => {
              const blobItem = audioBlobAndIdsList.find((x) => x.audioRecordId === audioRecord.id);

              return (
                <div key={audioRecord.id} className="flex gap-4">
                  <span>{j}:</span>
                  <DisplayRecording recording={audioRecord} audioBlob={blobItem?.audioBlob} />
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

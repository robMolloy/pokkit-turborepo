import { AudioRecorder } from "@/modules/audioRecordings/AudioRecorder";
import { pb } from "@/config/pocketbaseConfig";
import {
  createAudioRecordingRecord,
  smartSubscribeToAllAudioRecordingRecords,
  TAudioRecordingRecord,
} from "@/modules/audioRecordings/audioRecordingDbUtils";
import { DisplayAudioRecordingRecord } from "@/modules/audioRecordings/DisplayAudioRecordingRecord";
import { SignedInRouteProtector, SignedOutRouteProtector } from "@repo/pokkit-auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DisplayAudioBlob } from "@/modules/audioRecordings/DisplayAudioBlob";
import {
  smartSubscribeToAllAudioTranscriptionRecords,
  TAudioTranscriptionRecord,
} from "@/modules/audioTranscriptions/audioTranscriptionDbUtils";

const IndexPage = () => {
  const navigate = useNavigate();

  const [audioBlobAndIdsList, setAudioBlobsAndIds] = useState<
    { audioBlob: Blob; tempId?: string; audioRecordId?: string }[]
  >([]);
  const [audioRecordingRecords, setAudioRecordingRecords] = useState<TAudioRecordingRecord[]>([]);
  const [audioTranscriptionRecords, setAudioTranscriptionRecords] = useState<
    TAudioTranscriptionRecord[]
  >([]);

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllAudioRecordingRecords({
      pb,
      onChange: (x) => setAudioRecordingRecords(x),
    });

    return () => {
      unsubPromise.then((x) => x.unsubscribe());
    };
  }, []);

  useEffect(() => {
    const unsubPromise = smartSubscribeToAllAudioTranscriptionRecords({
      pb,
      onChange: (x) => setAudioTranscriptionRecords(x),
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

            const createResp = await createAudioRecordingRecord({ pb, audioBlob });

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
              const transcriptionRecord = audioTranscriptionRecords.find(
                (x) => x.id === audioRecord.id,
              );

              return (
                <div key={audioRecord.id} className="flex gap-4">
                  <span>{j}:</span>
                  <DisplayAudioRecordingRecord
                    pb={pb}
                    audioRecordingRecord={audioRecord}
                    audioBlob={blobItem?.audioBlob}
                    transcriptionRecord={transcriptionRecord}
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

      <pre>{JSON.stringify(audioTranscriptionRecords, undefined, 2)}</pre>
    </div>
  );
};

export default IndexPage;

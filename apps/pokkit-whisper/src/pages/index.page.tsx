import { AudioRecorder } from "@/components/audioRecorder";
import { pb } from "@/config/pocketbaseConfig";
import {
  SignedInRouteProtector,
  SignedOutRouteProtector,
  smartSubscribeToAllRecords,
  useReactiveAuthStore,
} from "@repo/pokkit-auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import z from "zod";

const recordingsCollectionName = "recordings";
const recordingSchema = z.object({ id: z.string(), file: z.string() });
type TRecording = z.infer<typeof recordingSchema>;

const DisplayRecording = (p: { recording: TRecording; audioBlob?: Blob }) => {
  useEffect(() => {}, []);

  return <div>{p.recording.file}</div>;
};

const IndexPage = () => {
  const authStore = useReactiveAuthStore();
  const navigate = useNavigate();

  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);
  const [recordings, setRecordings] = useState<TRecording[]>([]);
  useEffect(() => {
    const unsubPromise = smartSubscribeToAllRecords({
      pb,
      collectionName: recordingsCollectionName,
      itemSchema: recordingSchema,
      onChange: (x) => {
        setRecordings([...x]);
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
        <>
          <div>You are signed in</div>
          <AudioRecorder
            onRecordingComplete={(audioBlob) => {
              pb.collection("recordings").create({ file: audioBlob });
              setAudioBlobs((prev) => [audioBlob, ...prev]);
            }}
          />
          <br />
          <div className="flex flex-col gap-4 ">
            {recordings.map((recording, j) => (
              <div key={recording.id} className="flex">
                {j}: <DisplayRecording recording={recording} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4 ">
            {audioBlobs.map((audioBlob, j) => (
              <div key={j}>
                <audio controls src={URL.createObjectURL(audioBlob)} />
              </div>
            ))}
          </div>
          <div>Enjoy the app</div>
        </>
      </SignedInRouteProtector>

      <SignedOutRouteProtector>
        <>
          <div>You are signed out</div>
          <div>Log in to enjoy the app</div>
        </>
      </SignedOutRouteProtector>

      <br />
      <pre>{JSON.stringify({ authStore }, undefined, 2)}</pre>
    </div>
  );
};

export default IndexPage;

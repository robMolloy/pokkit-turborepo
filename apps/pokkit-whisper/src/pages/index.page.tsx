import { AudioRecorder } from "@/components/audioRecorder";
import { pb } from "@/config/pocketbaseConfig";
import {
  SignedInRouteProtector,
  SignedOutRouteProtector,
  smartSubscribeToAllRecords,
  useReactiveAuthStore,
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
});
type TRecording = z.infer<typeof recordingSchema>;

const DisplayAndCreateRecordForAudioBlob = (p: {
  initId: string;
  initAudioBlob: Blob;
  onAudioRecordSaved: (p1: { audioRecord: TRecording }) => void;
}) => {
  const [audioBlobFileUrl, setAudioBlobFileUrl] = useState<string | undefined>(
    p.initAudioBlob ? URL.createObjectURL(p.initAudioBlob) : undefined,
  );

  useEffect(() => {
    setAudioBlobFileUrl(URL.createObjectURL(p.initAudioBlob));
  }, []);

  useEffect(() => {
    (async () => {
      const resp = await pb.collection("recordings").create({ file: p.initAudioBlob });
      const parsedResp = recordingSchema.safeParse(resp);
      if (parsedResp.success) p.onAudioRecordSaved?.({ audioRecord: parsedResp.data });
    })();
  }, []);

  return (
    <div className="flex gap-12">
      {!audioBlobFileUrl && <div>Loading...</div>}

      {audioBlobFileUrl && <audio controls src={audioBlobFileUrl} />}
    </div>
  );
};

const DisplayRecording = (p: { recording: TRecording; initAudioBlob?: Blob }) => {
  const [audioBlobFileUrl, setAudioBlobFileUrl] = useState<string | undefined>();

  return (
    <div>
      <span>{p.recording.file}</span>
      <button
        onClick={async () => {
          const firstFilename = p.recording.file;
          const url = pb.files.getURL(p.recording, firstFilename);

          setAudioBlobFileUrl(url);
        }}
      >
        <CustomIcon iconName="Download" size="md" />
      </button>

      {audioBlobFileUrl && <audio controls src={audioBlobFileUrl} />}
    </div>
  );
};

const DisplayRecordingOrAudioBlob = (
  p:
    | React.ComponentProps<typeof DisplayRecording>
    | React.ComponentProps<typeof DisplayAndCreateRecordForAudioBlob>,
) => {
  return "initId" in p ? (
    <DisplayAndCreateRecordForAudioBlob {...p} />
  ) : (
    <DisplayRecording {...p} />
  );
};

const IndexPage = () => {
  const authStore = useReactiveAuthStore();
  const navigate = useNavigate();

  const [displayRecordingsProps, setDisplayRecordingsProps] = useState<
    React.ComponentProps<typeof DisplayRecordingOrAudioBlob>[]
  >([]);
  useEffect(() => {
    const unsubPromise = smartSubscribeToAllRecords({
      pb,
      collectionName: recordingsCollectionName,
      itemSchema: recordingSchema,
      onChange: (newRecordingRecords) => {
        setDisplayRecordingsProps(
          newRecordingRecords.map((recordingRecords) => ({ recording: recordingRecords })),
        );
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
              // pb.collection("recordings").create({ file: audioBlob });
              // setAudioBlobs((prev) => [audioBlob, ...prev]);
              setDisplayRecordingsProps((prev) => [
                ...prev,
                {
                  initId: crypto.randomUUID(),
                  initAudioBlob: audioBlob,
                  onAudioRecordSaved: (x) => {
                    setDisplayRecordingsProps((prev) =>
                      prev.map((item) =>
                        // this should always be true
                        "initId" in item && item.initId === x.audioRecord.id
                          ? { recording: x.audioRecord, initAudioBlob: audioBlob }
                          : item,
                      ),
                    );
                  },
                },
              ]);
            }}
          />
          <br />
          <div className="flex flex-col gap-4 ">
            {displayRecordingsProps.map((props, j) => (
              <div key={j} className="flex gap-4">
                <span>{j}:</span>
                <DisplayRecordingOrAudioBlob {...props} />
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

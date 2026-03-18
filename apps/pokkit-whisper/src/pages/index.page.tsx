import { pb } from "@/config/pocketbaseConfig";
import { AudioRecorder } from "@/modules/audioRecordings/AudioRecorder";
import {
  createAudioRecordingRecord,
  smartSubscribeToAllAudioRecordingRecords,
  TAudioRecordingRecord,
} from "@/modules/audioRecordings/audioRecordingDbUtils";
import { DisplayAudioBlob } from "@/modules/audioRecordings/DisplayAudioBlob";
import { DisplayAudioRecordingRecord } from "@/modules/audioRecordings/DisplayAudioRecordingRecord";
import {
  smartSubscribeToAllAudioTranscriptionRecords,
  TAudioTranscriptionRecord,
} from "@/modules/audioTranscriptions/audioTranscriptionDbUtils";
import { SignedInRouteProtector, SignedOutRouteProtector } from "@repo/pokkit-auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// function AudioRecorderMock() {
//   const [isRecording, setIsRecording] = useState(false);
//   const [duration, setDuration] = useState(0);

//   useEffect(() => {
//     let interval = 0;

//     if (isRecording) {
//       interval = setInterval(() => {
//         setDuration((d) => d + 1);
//       }, 200);
//     } else {
//       if (interval) clearInterval(interval);
//     }
//     return () => clearInterval(interval);
//   }, [isRecording]);

//   const formatTime = (s: number) => {
//     const mins = String(Math.floor(s / 60)).padStart(2, "0");
//     const secs = String(s % 60).padStart(2, "0");
//     return `${mins}:${secs}`;
//   };

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-muted/40 p-6">
//       <div className="w-full max-w-md rounded-2xl bg-background shadow-lg border p-6 flex flex-col gap-6">
//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <h2 className="text-lg font-semibold tracking-tight">Audio Recorder</h2>
//           <span
//             className={`text-xs font-medium px-2 py-1 rounded-full ${
//               isRecording ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
//             }`}
//           >
//             {isRecording ? "Recording" : "Idle"}
//           </span>
//         </div>

//         {/* Wave animation */}
//         <div className="flex items-center justify-center h-20">
//           <WaveAnimation isAnimating={true} minMaxDiff={50} interval={250} />
//         </div>

//         {/* Timer */}
//         <div className="text-center text-2xl font-mono tracking-widest">{formatTime(duration)}</div>

//         {/* Controls */}
//         <div className="flex items-center justify-center gap-4">
//           {!isRecording ? (
//             <button
//               onClick={() => {
//                 setDuration(0);
//                 setIsRecording(true);
//               }}
//               className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition"
//             >
//               <CustomIcon iconName="Mic" size="md" />
//             </button>
//           ) : (
//             <button
//               onClick={() => setIsRecording(false)}
//               className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500 text-white shadow-md hover:scale-105 active:scale-95 transition"
//             >
//               <CustomIcon iconName="Square" size="md" />
//             </button>
//           )}
//         </div>

//         {/* Footer hint */}
//         <p className="text-center text-xs text-muted-foreground">
//           This is a simulated recording UI
//         </p>
//       </div>
//     </div>
//   );
// }

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
    <div className="p-6">
      <h1 className="text-xl">Pokkit Whisper</h1>

      {/* <AudioRecorderMock /> */}
      <br />

      <SignedInRouteProtector ifUserIsUnverified={() => navigate("/auth/verification-request")}>
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
            .map((audioRecord) => {
              const blobItem = audioBlobAndIdsList.find((x) => x.audioRecordId === audioRecord.id);
              const transcriptionRecord = audioTranscriptionRecords.find(
                (x) => x.id === audioRecord.id,
              );

              return (
                <div key={audioRecord.id} className="flex gap-4">
                  <DisplayAudioRecordingRecord
                    pb={pb}
                    onAudioBlobDownload={(x) => {
                      setAudioBlobsAndIds((prev) => [
                        ...prev,
                        { audioBlob: x.audioBlob, audioRecordId: x.audioRecordingRecord.id },
                      ]);
                    }}
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
    </div>
  );
};

export default IndexPage;

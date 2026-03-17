import { CustomIcon } from "@repo/pokkit-components";
import PocketBase from "pocketbase";
import { useEffect, useState } from "react";
import { TAudioTranscriptionRecord } from "../audioTranscriptions/audioTranscriptionDbUtils";
import {
  getAudioBlobFromAudioRecordingRecord,
  TAudioRecordingRecord,
} from "./audioRecordingDbUtils";

export const DisplayAudioRecordingRecord = (p: {
  pb: PocketBase;
  audioRecordingRecord: TAudioRecordingRecord;
  audioBlob?: Blob;
  transcriptionRecord?: TAudioTranscriptionRecord;
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

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
    <div className="flex flex-col gap-4">
      <div className="flex gap-6">
        <span>{p.audioRecordingRecord.fileName}</span>
        {audioBlobFileUrl ? (
          <audio controls src={audioBlobFileUrl} />
        ) : (
          <button
            onClick={async () => {
              if (isDownloading) return;
              setIsDownloading(true);

              const newAudioBlob = await getAudioBlobFromAudioRecordingRecord({
                pb: p.pb,
                record: p.audioRecordingRecord,
              });
              setAudioBlob(newAudioBlob);

              setIsDownloading(false);
            }}
          >
            <CustomIcon iconName="Download" size="md" />
          </button>
        )}
      </div>
      {p.transcriptionRecord && <span>{p.transcriptionRecord.text}</span>}
    </div>
  );
};

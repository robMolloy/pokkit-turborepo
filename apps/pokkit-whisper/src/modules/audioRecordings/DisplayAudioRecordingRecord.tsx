import { Card, CardContent } from "@/components/ui/card";
import { CustomIcon } from "@repo/pokkit-components";
import { Button, cn } from "@repo/pokkit-shadcn";
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
  onAudioBlobDownload: (x: {
    audioBlob: Blob;
    audioRecordingRecord: TAudioRecordingRecord;
  }) => void;
  transcriptionRecord?: TAudioTranscriptionRecord;
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [audioBlobFileUrl, setAudioBlobFileUrl] = useState<string | undefined>(
    p.audioBlob ? URL.createObjectURL(p.audioBlob) : undefined,
  );

  useEffect(() => {
    setAudioBlobFileUrl(p.audioBlob ? URL.createObjectURL(p.audioBlob) : undefined);

    return () => {
      if (audioBlobFileUrl) URL.revokeObjectURL(audioBlobFileUrl);
    };
  }, [p.audioBlob]);

  const handleDownloadAudioBlob = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const audioBlob = await getAudioBlobFromAudioRecordingRecord({
      pb: p.pb,
      record: p.audioRecordingRecord,
    });
    p.onAudioBlobDownload({ audioBlob, audioRecordingRecord: p.audioRecordingRecord });

    setIsDownloading(false);
  };

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-4 items-baseline">
            <span className="flex items-center gap-4">
              {p.transcriptionRecord && (
                <Button
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(p.transcriptionRecord!.text)}
                >
                  <CustomIcon iconName="Clipboard" size="sm" />
                </Button>
              )}
              {p.transcriptionRecord?.text && (
                <CustomIcon iconName="Pencil" size="sm" className="text-muted-foreground" />
              )}
              {p.audioBlob && (
                <CustomIcon iconName="Volume2" size="sm" className="text-muted-foreground" />
              )}
            </span>
            <span></span>
          </div>
          <div className="flex gap-4">
            <span className="flex-1">
              <div className="rounded-lg p-4 border">
                <p
                  className={cn("text-sm leading-relaxed w-full", {
                    "animate-caret-blink": !p.transcriptionRecord,
                  })}
                >
                  {p.transcriptionRecord ? p.transcriptionRecord?.text : "..."}
                </p>
              </div>
            </span>
            <span>
              <Button onClick={() => setShowDetails((prev) => !prev)}>
                <CustomIcon iconName={showDetails ? "Minus" : "Plus"} size="sm" />
              </Button>
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="flex justify-between">
            <span className="flex flex-col gap-2">
              <div className="flex gap-6 text-sm">
                <span className={cn("flex items-center gap-2 text-muted-foreground")}>
                  <CustomIcon size="sm" iconName="Volume2" />
                  Audio
                </span>
                {p.transcriptionRecord && (
                  <span className="flex gap-2 items-center text-muted-foreground">
                    <CustomIcon size="sm" iconName="Pencil" />
                    Transcribed
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-sm leading-tight truncate">
                {p.audioRecordingRecord.fileName}
              </h3>
            </span>
            <span className="flex gap-4">
              {!p.audioBlob && (
                <button onClick={handleDownloadAudioBlob}>
                  <CustomIcon
                    iconName={isDownloading ? "Loader" : "Download"}
                    size="md"
                    className={cn({ "animate-spin": isDownloading })}
                  />
                </button>
              )}
              <div className="relative">
                <audio controls src={audioBlobFileUrl} />
                <div
                  className="absolute top-0 bottom-0 right-0 left-0 cursor-pointer"
                  onClick={() => {
                    if (!p.audioBlob) handleDownloadAudioBlob();
                  }}
                />
              </div>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

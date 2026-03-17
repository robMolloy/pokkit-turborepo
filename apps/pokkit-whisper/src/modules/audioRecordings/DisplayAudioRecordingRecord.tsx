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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {p.transcriptionRecord && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
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
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setShowDetails((prev) => !prev)}
            >
              <CustomIcon iconName={showDetails ? "Minus" : "Plus"} size="sm" />
            </Button>
          </div>
          <div className="relative rounded border p-4">
            <p
              className={cn("text-sm leading-relaxed", {
                "animate-caret-blink text-muted-foreground": !p.transcriptionRecord,
              })}
            >
              {p.transcriptionRecord ? p.transcriptionRecord.text : "Transcribing..."}
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CustomIcon size="sm" iconName="Volume2" />
                  Audio
                </span>

                {p.transcriptionRecord && (
                  <span className="flex items-center gap-1.5">
                    <CustomIcon size="sm" iconName="Pencil" />
                    Transcribed
                  </span>
                )}
              </div>

              <h3 className="text-sm font-medium truncate">{p.audioRecordingRecord.fileName}</h3>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              {!p.audioBlob && (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                  onClick={handleDownloadAudioBlob}
                >
                  <CustomIcon
                    iconName={isDownloading ? "Loader" : "Download"}
                    size="sm"
                    className={cn({ "animate-spin": isDownloading })}
                  />
                </Button>
              )}

              <div className="relative">
                <audio controls src={audioBlobFileUrl} className="h-9" />
                <div
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => {
                    if (!p.audioBlob) handleDownloadAudioBlob();
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

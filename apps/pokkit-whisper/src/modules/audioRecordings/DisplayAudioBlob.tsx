import { useState, useEffect } from "react";

export const DisplayAudioBlob = (p: { initId: string; audioBlob: Blob }) => {
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

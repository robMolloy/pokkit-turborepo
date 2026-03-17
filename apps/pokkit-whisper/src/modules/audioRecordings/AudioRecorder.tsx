import { Button } from "@repo/pokkit-shadcn";
import { useRef, useState } from "react";

function encodeWav(buffers: Float32Array[], sampleRate: number) {
  const merged = mergeBuffers(buffers);
  const pcm = floatTo16BitPCM(merged);

  const wavBuffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(wavBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  writeString(view, 36, "data");
  view.setUint32(40, pcm.length * 2, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i++, offset += 2) {
    view.setInt16(offset, pcm[i], true);
  }

  return new Blob([view], { type: "audio/wav" });
}

function mergeBuffers(buffers: Float32Array[]) {
  let length = buffers.reduce((a, b) => a + b.length, 0);
  const result = new Float32Array(length);

  let offset = 0;
  for (const buffer of buffers) {
    result.set(buffer, offset);
    offset += buffer.length;
  }

  return result;
}

function floatTo16BitPCM(float32: Float32Array) {
  const output = new Int16Array(float32.length);

  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return output;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

const AudioRecorderInner = (p: { onRecordingComplete: (blob: Blob) => void }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const buffersRef = useRef<Float32Array[]>([]);
  const [recording, setRecording] = useState(false);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    await audioContext.audioWorklet.addModule("/audio/recorderProcessor.js");

    const source = audioContext.createMediaStreamSource(stream);

    const worklet = new AudioWorkletNode(audioContext, "recorder-processor");
    workletRef.current = worklet;

    buffersRef.current = [];

    worklet.port.onmessage = (e) => {
      buffersRef.current.push(new Float32Array(e.data));
    };

    source.connect(worklet);

    setRecording(true);
  }

  function stopRecording() {
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const sampleRate = audioContextRef.current!.sampleRate;
    const wavBlob = encodeWav(buffersRef.current, sampleRate);

    p.onRecordingComplete(wavBlob);

    setRecording(false);
  }

  return (
    <div className="flex flex-col items-start gap-4">
      {!recording ? (
        <Button onClick={startRecording}>Start Recording</Button>
      ) : (
        <Button variant="destructive" onClick={stopRecording}>
          Stop Recording
        </Button>
      )}
    </div>
  );
};

export const AudioRecorder = (p: React.ComponentProps<typeof AudioRecorderInner>) => {
  const [key, setKey] = useState(0);
  return (
    <AudioRecorderInner
      key={key}
      onRecordingComplete={(x) => {
        p.onRecordingComplete(x);
        setKey((prev) => prev + 1);
      }}
    />
  );
};

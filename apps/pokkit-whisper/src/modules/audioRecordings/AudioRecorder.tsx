import { CustomIcon } from "@repo/pokkit-components";
import { Button } from "@repo/pokkit-shadcn";
import { useEffect, useRef, useState } from "react";

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

const stationaryWaveHeights = [...Array(20)].map(() => 35);
const createAnimatedWaveHeights = (minMaxDiff: number) =>
  [...Array(20)].map(() => 100 - minMaxDiff + Math.random() * minMaxDiff);

const WaveAnimation = (p: { isAnimating: boolean; minMaxDiff: number; interval: number }) => {
  const [waveHeights, setWaveHeights] = useState<number[]>(stationaryWaveHeights);

  useEffect(() => {
    const interval = (() => {
      if (p.isAnimating)
        return setInterval(
          () => setWaveHeights(createAnimatedWaveHeights(p.minMaxDiff)),
          p.interval,
        );
    })();

    return () => {
      clearInterval(interval);
      setWaveHeights(stationaryWaveHeights);
    };
  }, [p.isAnimating]);

  return (
    <div className="flex items-end gap-1 h-full">
      {waveHeights.map((val, i) => (
        <div
          key={i}
          className={`w-1 rounded-full bg-primary transition-all duration-300 ${
            p.isAnimating ? "animate-pulse" : "opacity-30"
          }`}
          style={{
            height: `${val}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const mins = String(Math.floor(s / 60)).padStart(2, "0");
  const secs = String(s % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};
const Timer = (p: { isCounting: boolean }) => {
  const startDate = useRef(new Date());
  const [elapsedTimeInMs, setElapsedTimeInMs] = useState<number>(0);

  useEffect(() => {
    const interval = (() => {
      if (!p.isCounting) return;

      startDate.current = new Date();
      return setInterval(() => {
        setElapsedTimeInMs(new Date().getTime() - startDate.current.getTime());
      }, 200);
    })();

    return () => {
      if (interval) clearInterval(interval);
      setElapsedTimeInMs(0);
    };
  }, [p.isCounting]);

  return <div className="text-2xl font-mono tracking-widest">{formatTime(elapsedTimeInMs)}</div>;
};

// export const AudioRecorder2 = (p: { onRecordingComplete: (x: Blob) => void }) => {
//   const [isRecording, setIsRecording] = useState(false);

//   return (
//     <div className="flex flex-col items-center gap-6">
//       <div className="h-32">
//         <WaveAnimation isAnimating={isRecording} minMaxDiff={50} interval={300} />
//       </div>
//       <Timer isCounting={isRecording} />
//       <div className="flex gap-1 w-42">
//         {!isRecording ? (
//           <Button onClick={() => setIsRecording(true)} className="flex-1 gap-2">
//             <CustomIcon iconName="Mic" size="md" />
//             Start Recording
//           </Button>
//         ) : (
//           <>
//             <Button
//               variant="secondary"
//               onClick={() => {
//                 setIsRecording(false);
//                 p.onRecordingComplete(new Blob([]));
//               }}
//               className="flex flex-1 gap-2"
//             >
//               Send
//               <CustomIcon iconName="Upload" size="md" />
//             </Button>
//             <Button variant="destructive" onClick={() => setIsRecording(false)}>
//               <CustomIcon iconName="Trash2" size="md" />
//             </Button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

const AudioRecorderInner = (p: { onRecordingComplete: (blob: Blob) => void }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const buffersRef = useRef<Float32Array[]>([]);
  const [isRecording, setIsRecording] = useState(false);

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

    setIsRecording(true);
  }

  function stopRecording() {
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const sampleRate = audioContextRef.current!.sampleRate;
    const wavBlob = encodeWav(buffersRef.current, sampleRate);

    p.onRecordingComplete(wavBlob);

    setIsRecording(false);
  }
  function discardRecording() {
    streamRef.current?.getTracks().forEach((t) => t.stop());

    setIsRecording(false);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="h-16">
        <WaveAnimation isAnimating={isRecording} minMaxDiff={40} interval={300} />
      </div>
      <Timer isCounting={isRecording} />
      <div className="flex gap-1 w-42">
        {!isRecording ? (
          <Button onClick={startRecording} className="flex-1 gap-2">
            <CustomIcon iconName="Mic" size="md" />
            Start Recording
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={stopRecording} className="flex flex-1 gap-2">
              Send
              <CustomIcon iconName="Upload" size="md" />
            </Button>
            <Button variant="destructive" onClick={discardRecording}>
              <CustomIcon iconName="Trash2" size="md" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
const AudioRecorderInner2 = (p: { onRecordingComplete: (blob: Blob) => void }) => {
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

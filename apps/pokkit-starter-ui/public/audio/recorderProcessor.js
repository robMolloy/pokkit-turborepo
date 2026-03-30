// consider using Vite-native pattern that avoids /public and lets Vite bundle the worklet with the app using:
// new URL("./recorderProcessor.js", import.meta.url)

class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];

    if (input.length > 0) {
      const channelData = input[0];
      this.port.postMessage(channelData.slice(0));
    }

    return true;
  }
}

registerProcessor("recorder-processor", RecorderProcessor);

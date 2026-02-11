/**
 * WAV Encoder Utility
 *
 * Converts Float32 audio chunks (from AudioContext) to WAV format blob.
 * Used for sending recorded audio to the stress detection backend.
 */

/**
 * Encode Float32 audio samples to WAV format
 * @param samples - Float32Array of audio samples
 * @param sampleRate - Sample rate in Hz (default: 16000)
 * @returns WAV file as Blob
 */
export function encodeWAV(samples: Float32Array, sampleRate: number = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true); // Subchunk2Size

  // Convert Float32 samples to Int16 PCM
  floatTo16BitPCM(view, 44, samples);

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Write a string to DataView at specified offset
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Convert Float32 samples to 16-bit PCM and write to DataView
 */
function floatTo16BitPCM(view: DataView, offset: number, samples: Float32Array): void {
  for (let i = 0; i < samples.length; i++) {
    // Clamp the value to [-1, 1] range
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Convert to 16-bit integer
    view.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

/**
 * Concatenate multiple ArrayBuffers containing Float32 audio data into a single Float32Array
 * @param chunks - Array of ArrayBuffers containing Float32 audio data
 * @returns Combined Float32Array
 */
export function concatenateAudioChunks(chunks: ArrayBuffer[]): Float32Array {
  // Calculate total length
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength / 4, 0);
  const result = new Float32Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    const float32View = new Float32Array(chunk);
    result.set(float32View, offset);
    offset += float32View.length;
  }

  return result;
}

/**
 * Convert accumulated audio chunks to a WAV blob ready for upload
 * @param chunks - Array of ArrayBuffers containing Float32 audio data
 * @param sampleRate - Sample rate in Hz (default: 16000)
 * @returns WAV file as Blob
 */
export function chunksToWavBlob(chunks: ArrayBuffer[], sampleRate: number = 16000): Blob {
  const samples = concatenateAudioChunks(chunks);
  
  // Debug: log audio stats
  const duration = samples.length / sampleRate;
  const maxVal = Math.max(...Array.from(samples).map(Math.abs));
  const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
  console.log(`[WAV] Creating WAV: ${samples.length} samples, ${sampleRate}Hz, ${duration.toFixed(2)}s, max=${maxVal.toFixed(3)}, rms=${rms.toFixed(4)}`);
  
  return encodeWAV(samples, sampleRate);
}


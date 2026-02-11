/**
 * useRecorder - React hook for audio recording
 *
 * Handles microphone access, audio recording, and volume metering.
 * Adapted to use AudioContext and ScriptProcessor for 16kHz raw float audio.
 */

import { useRef, useState, useEffect, useCallback } from "react";

export interface UseRecorderReturn {
  /** Whether currently recording */
  isRecording: boolean;
  /** Start recording from microphone */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => void;
  /** Reference to the MediaRecorder instance (Unused in this implementation but kept for interface compatibility) */
  mediaRecorderRef: React.RefObject<MediaRecorder | null>;
  /** Current volume level (0-1) */
  volume: number;
  /** Actual sample rate being used (browsers may ignore requested rate) */
  sampleRate: number;
}

export function useRecorder(
  onAudioData: (buffer: ArrayBuffer) => void,
): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [sampleRate, setSampleRate] = useState(16000);

  // Refs for AudioContext and nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Unused ref kept for interface compatibility if needed elsewhere
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Store callback in ref to avoid stale closures
  const onAudioDataRef = useRef(onAudioData);
  useEffect(() => {
    onAudioDataRef.current = onAudioData;
  }, [onAudioData]);

  const startRecording = useCallback(async () => {
    try {
      console.log("Starting recording...");

      // Force 16kHz Sample Rate
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      const audioContext = new AudioContextClass({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      // Get actual sample rate (browser may ignore our request)
      const actualSampleRate = audioContext.sampleRate;
      setSampleRate(actualSampleRate);
      console.log(`AudioContext created. Requested: 16000Hz, Actual: ${actualSampleRate}Hz`);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log("Got user media stream:", stream);

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Buffer Size 4096 = approx 0.25s latency chunk
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Setup analyser for volume
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      source.connect(analyser);

      processor.onaudioprocess = (e) => {
        // Get raw Float32 data and send immediately
        const inputData = e.inputBuffer.getChannelData(0);
        // IMPORTANT: inputData is a VIEW into a larger buffer - must copy just the data we need
        const copy = new Float32Array(inputData.length);
        copy.set(inputData);
        onAudioDataRef.current(copy.buffer);

        // Volume calculation
        if (analyserRef.current) {
          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount,
          );
          analyserRef.current.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          setVolume(rms);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setVolume(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    mediaRecorderRef, // Kept for API compatibility, but null
    volume,
    sampleRate,
  };
}

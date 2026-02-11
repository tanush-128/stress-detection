/**
 * Audio Features Module
 *
 * Provides speech-to-text, text-to-speech, audio playback, and recording functionality.
 *
 * @example
 * ```tsx
 * import { useSTT, useTTS, useAudioPlayer, useRecorder } from '@/features/audio';
 *
 * // In your component
 * const { isConnected: isSttConnected, sendAudio } = useSTT({
 *   onTranscript: (text, isFinal) => console.log(text, isFinal),
 * });
 *
 * const { isConnected: isTtsConnected, sendText } = useTTS({
 *   onAudioChunk: (audio) => queueAudioChunk(audio),
 * });
 *
 * const { queueAudioChunk, stopBotSpeaking, isBotSpeaking } = useAudioPlayer({
 *   onAudioDone: () => console.log('Done speaking'),
 * });
 *
 * const { isRecording, startRecording, stopRecording, volume } = useRecorder(sendAudio);
 * ```
 */

// STT (Speech-to-Text)
export { STTService, useSTT, DEFAULT_STT_CONFIG } from "./stt";
export type { UseSTTOptions, UseSTTReturn, STTConfig } from "./stt";

// TTS (Text-to-Speech)
export { TTSService, useTTS, DEFAULT_TTS_CONFIG } from "./tts";
export type { UseTTSOptions, UseTTSReturn, TTSConfig } from "./tts";

// Audio Player
export { useAudioPlayer } from "./player";
export type { UseAudioPlayerOptions, UseAudioPlayerReturn } from "./player";

// Recorder
export { useRecorder } from "./recorder";
export type { UseRecorderReturn } from "./recorder";

// Utils
export { encodeWAV, concatenateAudioChunks, chunksToWavBlob } from "./utils";

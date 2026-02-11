/**
 * Shared types for audio features
 */

// Re-export types from submodules for convenience
export type { STTConfig, STTTranscript, STTError, STTMessage } from "./stt";
export type {
  TTSConfig,
  TTSAudioChunk,
  TTSAudioDone,
  TTSError,
  TTSMessage,
} from "./tts";

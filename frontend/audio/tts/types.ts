/**
 * TTS (Text-to-Speech) Types
 */

import { TTS_BASE_URL } from "@/app/config";

export interface TTSConfig {
  /** WebSocket URL for TTS service */
  url: string;
  /** Reconnect timeout in milliseconds */
  reconnectTimeout: number;
}

export interface TTSAudioChunk {
  type: "tts_audio_chunk";
  audio: string; // Base64 encoded audio
  index: number;
  is_last: boolean;
}

export interface TTSAudioDone {
  type: "tts_audio_done";
}

export interface TTSError {
  type: "error";
  message: string;
}

export type TTSMessage = TTSAudioChunk | TTSAudioDone | TTSError;

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  url: `${TTS_BASE_URL}/ws`,
  reconnectTimeout: 3000,
};

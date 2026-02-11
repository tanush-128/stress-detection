/**
 * STT (Speech-to-Text) Types
 */

import { STT_BASE_URL } from "@/app/config";



export interface STTConfig {
  /** WebSocket URL for STT service */
  url: string;
  /** Reconnect timeout in milliseconds */
  reconnectTimeout: number;
}

export interface STTTranscript {
  transcript: string;
  isFinal: boolean;
}

export interface STTError {
  type: "error";
  message: string;
}

export type STTMessage = STTTranscript | STTError;

export const DEFAULT_STT_CONFIG: STTConfig = {
  url: `${STT_BASE_URL}/ws`,
  reconnectTimeout: 3000,
};

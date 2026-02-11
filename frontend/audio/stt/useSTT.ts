/**
 * useSTT - React hook for Speech-to-Text
 *
 * Thin wrapper around STTService that provides React state management.
 * Includes silence timeout to auto-finalize transcripts when no new text arrives.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { STTService } from "./STTService";
import { STTConfig } from "./types";

/** Default silence timeout in milliseconds before auto-finalizing */
const DEFAULT_SILENCE_TIMEOUT_MS = 1500;

export interface UseSTTOptions extends Partial<STTConfig> {
  /** Callback when a transcript is received */
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Silence timeout in ms before auto-finalizing (default: 1500ms) */
  silenceTimeoutMs?: number;
}

export interface UseSTTReturn {
  /** Whether the STT WebSocket is connected */
  isConnected: boolean;
  /** Send audio buffer for transcription */
  sendAudio: (buffer: ArrayBuffer) => void;
  /** Manually reconnect to the STT server */
  reconnect: () => void;
  /** Manually disconnect from the STT server */
  disconnect: () => void;
}

export function useSTT(options: UseSTTOptions = {}): UseSTTReturn {
  const { onTranscript, onError, silenceTimeoutMs = DEFAULT_SILENCE_TIMEOUT_MS, ...config } = options;
  const [isConnected, setIsConnected] = useState(false);
  const serviceRef = useRef<STTService | null>(null);

  // Store callbacks in refs to avoid recreating service on callback changes
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  // Silence timeout refs
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const hasBeenFinalizedRef = useRef<boolean>(true);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Cleanup silence timer on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const service = new STTService(config);

    service.onConnectionChange = (connected) => {
      setIsConnected(connected);
    };

    service.onTranscript = (transcript, isFinal) => {
      // Clear any existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (isFinal) {
        // Server finalized the transcript
        lastTranscriptRef.current = "";
        hasBeenFinalizedRef.current = true;
        onTranscriptRef.current?.(transcript, true);
      } else {
        // Non-final transcript - store it and start silence timer
        lastTranscriptRef.current = transcript;
        hasBeenFinalizedRef.current = false;
        onTranscriptRef.current?.(transcript, false);

        // Start silence timer to auto-finalize if no new text comes
        if (transcript.trim()) {
          silenceTimerRef.current = setTimeout(() => {
            if (!hasBeenFinalizedRef.current && lastTranscriptRef.current.trim()) {
              // Auto-finalize due to silence timeout
              onTranscriptRef.current?.(lastTranscriptRef.current, true);
              lastTranscriptRef.current = "";
              hasBeenFinalizedRef.current = true;
            }
          }, silenceTimeoutMs);
        }
      }
    };

    service.onError = (error) => {
      onErrorRef.current?.(error);
    };

    service.connect();
    serviceRef.current = service;

    return () => {
      service.disconnect();
      serviceRef.current = null;
      // Clear timer on cleanup
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
    // Only recreate service if config changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.url, config.reconnectTimeout, silenceTimeoutMs]);

  const sendAudio = useCallback((buffer: ArrayBuffer) => {
    serviceRef.current?.sendAudio(buffer);
  }, []);

  const reconnect = useCallback(() => {
    serviceRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
  }, []);

  return {
    isConnected,
    sendAudio,
    reconnect,
    disconnect,
  };
}

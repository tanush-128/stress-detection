/**
 * useTTS - React hook for Text-to-Speech
 *
 * Thin wrapper around TTSService that provides React state management.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioChunk, TTSService } from "./TTSService";
import { TTSConfig } from "./types";

export interface UseTTSOptions extends Partial<TTSConfig> {
  /** Callback when an audio chunk is received */
  onAudioChunk?: (audioChunk: AudioChunk) => void;
  /** Callback when audio is done */
  onAudioDone?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

export interface UseTTSReturn {
  /** Whether the TTS WebSocket is connected */
  isConnected: boolean;
  /** Send text for speech synthesis */
  getAudio: (text: string, messageId: string) => void;
  /** Manually reconnect to the TTS server */
  reconnect: () => void;
  /** Manually disconnect from the TTS server */
  disconnect: () => void;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { onAudioChunk, onAudioDone, onError, ...restOptions } = options;
  const [isConnected, setIsConnected] = useState(false);
  const serviceRef = useRef<TTSService | null>(null);

  // Memoize config to prevent unnecessary service recreation
  const config = useMemo<TTSConfig>(
    () => ({
      url: restOptions.url ?? "ws://localhost:8002/ws",
      reconnectTimeout: restOptions.reconnectTimeout ?? 3000,
    }),
    [restOptions.url, restOptions.reconnectTimeout],
  );

  // Store callbacks in refs to avoid recreating service on callback changes
  const onAudioChunkRef = useRef(onAudioChunk);
  const onAudioDoneRef = useRef(onAudioDone);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk;
  }, [onAudioChunk]);

  useEffect(() => {
    onAudioDoneRef.current = onAudioDone;
  }, [onAudioDone]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const service = new TTSService(config);

    service.onConnectionChange = (connected) => {
      setIsConnected(connected);
    };

    service.onAudioChunk = (audioChunk) => {
      onAudioChunkRef.current?.(audioChunk);
    };

    service.onAudioDone = () => {
      onAudioDoneRef.current?.();
    };

    service.onError = (error) => {
      onErrorRef.current?.(error);
    };

    service.connect();
    serviceRef.current = service;

    return () => {
      service.disconnect();
      serviceRef.current = null;
    };
  }, [config]);

  const sendText = useCallback((text: string, messageId: string) => {
    serviceRef.current?.sendText(text, messageId);
  }, []);

  const reconnect = useCallback(() => {
    serviceRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
  }, []);

  return {
    isConnected,
    getAudio: sendText,
    reconnect,
    disconnect,
  };
}

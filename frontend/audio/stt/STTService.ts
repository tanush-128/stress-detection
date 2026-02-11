/**
 * STTService - Speech-to-Text WebSocket Service
 *
 * Handles WebSocket connection to the STT server for real-time audio transcription.
 * Pure TypeScript class with no React dependencies.
 */

import { DEFAULT_STT_CONFIG, STTConfig } from "./types";

export class STTService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private config: STTConfig;
  private isConnecting = false;

  // Event callbacks
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;

  constructor(config: Partial<STTConfig> = {}) {
    this.config = { ...DEFAULT_STT_CONFIG, ...config };
  }

  /**
   * Connect to the STT WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      console.log("Attempting to connect to STT WebSocket:", this.config.url);
      this.ws = new WebSocket("wss://services.insurgeai.com/stt/ws");

      this.ws.onopen = () => {
        console.log(
          "STT WebSocket connected successfully to:",
          this.config.url,
        );
        this.isConnecting = false;
        this.onConnectionChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          // The backend sends plain text according to the snippet

          // response = { text: text, is_final: is_final };
          const response = JSON.parse(event.data);
          const text = response.text;
          const isFinal = response.is_final;

          if (typeof text === "string") {
            // The snippet just appends text, assuming it's a partial or full transcript.
            // Since the interface expects (transcript, isFinal), and the snippet
            // doesn't seem to distinguish, we'll treat it as a stream of updates.
            // However, checking the snippet: "This will trigger whenever the backend sends text"
            // and it appends new lines.
            this.onTranscript?.(text, isFinal);
          }
        } catch (err) {
          console.error("Failed to parse STT message:", err);
          this.onError?.(
            err instanceof Error ? err : new Error("Failed to parse message"),
          );
        }
      };

      this.ws.onerror = (error) => {
        console.error("STT WebSocket error:", error);
        this.isConnecting = false;
        this.onConnectionChange?.(false);
        this.onError?.(new Error("WebSocket connection error"));
      };

      this.ws.onclose = (event) => {
        console.log("STT WebSocket closed:", event.code, event.reason);
        this.isConnecting = false;
        this.onConnectionChange?.(false);
        this.scheduleReconnect();
      };
    } catch (err) {
      this.isConnecting = false;
      this.onConnectionChange?.(false);
      this.onError?.(
        err instanceof Error ? err : new Error("Failed to create WebSocket"),
      );
    }
  }

  /**
   * Disconnect from the STT WebSocket server
   */
  disconnect(): void {
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }

    this.onConnectionChange?.(false);
  }

  /**
   * Send audio buffer to the STT server for transcription
   */
  sendAudio(buffer: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(buffer);
    } else {
      // console.warn("STT WebSocket not connected, cannot send audio");
    }
  }

  /**
   * Check if the WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimeout();

    this.reconnectTimeout = setTimeout(() => {
      console.log("Attempting to reconnect STT WebSocket...");
      this.connect();
    }, this.config.reconnectTimeout);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

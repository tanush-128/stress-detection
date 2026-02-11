/**
 * TTSService - Text-to-Speech WebSocket Service
 *
 * Handles WebSocket connection to the TTS server for real-time text-to-speech.
 * Pure TypeScript class with no React dependencies.
 */

import { DEFAULT_TTS_CONFIG, TTSConfig } from "./types";
import { TTS_BASE_URL } from "@/app/config";
import { ttsChunks } from "./chunker";

export interface AudioChunk {
  audio: string;
  messageId: string;
  text: string;
  index?: number;
  isLast?: boolean;
}

export class TTSService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private config: TTSConfig;
  private isConnecting = false;
  private isIntentionallyDisconnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectBackoffMs = 1000; // Start with 1 second

  // Chunk queue management
  private chunks: string[] = [];
  private currentChunkIndex = 0;
  private isProcessing = false;
  private currentMessageId: string | null = null;

  // Event callbacks
  onAudioChunk?: (audioChunk: AudioChunk) => void;
  onAudioDone?: () => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;

  constructor(config: Partial<TTSConfig> = {}) {
    this.config = { ...DEFAULT_TTS_CONFIG, ...config };
  }

  /**
   * Connect to the TTS WebSocket server
   */
  connect(): void {
    // Don't reconnect if intentionally disconnected
    if (this.isIntentionallyDisconnected) {
      console.log("TTS WebSocket: Skipping reconnect (intentionally disconnected)");
      return;
    }

    // Don't connect if already connected or connecting
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("TTS WebSocket: Already connected");
      return;
    }

    if (this.isConnecting) {
      console.log("TTS WebSocket: Connection already in progress");
      return;
    }

    // Check if we've exceeded max reconnect attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `TTS WebSocket: Max reconnect attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection.`,
      );
      this.onError?.(new Error("Max reconnection attempts reached"));
      return;
    }

    this.isConnecting = true;

    try {
      console.log(
        `Attempting to connect to TTS WebSocket (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}):`,
        this.config.url,
      );
      this.ws = new WebSocket("wss://services.insurgeai.com/tts/ws");

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.error("TTS WebSocket: Connection timeout");
          this.ws.close();
          this.isConnecting = false;
          this.scheduleReconnect();
        }
      }, 10000); // 10 second timeout

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(
          "TTS WebSocket connected successfully to:",
          this.config.url,
        );
        this.isConnecting = false;
        this.reconnectAttempts = 0; // Reset on successful connection
        this.reconnectBackoffMs = 1000; // Reset backoff
        this.onConnectionChange?.(true);
        this.startKeepAlive();
        
        // Auto-resume processing if there are unprocessed chunks
        if (this.chunks.length > 0 && this.currentChunkIndex < this.chunks.length) {
          console.log(
            `Auto-resuming TTS processing from chunk ${this.currentChunkIndex + 1}/${this.chunks.length}`,
          );
          this.resumeProcessing();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "tts_audio_chunk") {
            console.log(
              `TTS audio chunk received (${data.index + 1}, last: ${data.is_last})`,
            );
            this.onAudioChunk?.({
              audio: data.audio,
              messageId: data.message_id,
              text: data.text,
              index: data.index,
              isLast: data.is_last,
            });
          } else if (data.type === "tts_audio_done") {
            console.log("TTS audio done for chunk");
            // Process next chunk if available
            this.currentChunkIndex++;
            if (this.currentChunkIndex < this.chunks.length) {
              // Continue with next chunk
              this.processNextChunk();
            } else {
              // All chunks processed
              this.isProcessing = false;
              this.chunks = [];
              this.currentChunkIndex = 0;
              this.currentMessageId = null;
              this.onAudioDone?.();
            }
          } else if (data.type === "error") {
            console.error("TTS WebSocket error:", data.message);
            this.onError?.(new Error(data.message));
          }
        } catch (err) {
          console.error("Failed to parse TTS message:", err);
          this.onError?.(
            err instanceof Error ? err : new Error("Failed to parse message"),
          );
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error("TTS WebSocket error:", error);
        this.isConnecting = false;
        this.onConnectionChange?.(false);
        this.onError?.(new Error("WebSocket connection error"));
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.stopKeepAlive();
        console.log(
          "TTS WebSocket closed:",
          event.code,
          event.reason || "No reason provided",
        );
        this.isConnecting = false;
        this.onConnectionChange?.(false);

        // Only reconnect if not intentionally disconnected
        // and if it's not a normal closure (1000) or going away (1001)
        if (
          !this.isIntentionallyDisconnected &&
          event.code !== 1000 && // Normal closure
          event.code !== 1001 // Going away (browser/tab closed)
        ) {
          this.scheduleReconnect();
        } else if (this.isIntentionallyDisconnected) {
          console.log("TTS WebSocket: Intentional disconnect, not reconnecting");
        } else {
          console.log(
            `TTS WebSocket: Normal closure (code ${event.code}), not reconnecting`,
          );
        }
      };
    } catch (err) {
      this.isConnecting = false;
      this.onConnectionChange?.(false);
      this.onError?.(
        err instanceof Error ? err : new Error("Failed to create WebSocket"),
      );
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the TTS WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyDisconnected = true;
    this.clearReconnectTimeout();
    this.stopKeepAlive();

    if (this.ws) {
      // Temporarily set onclose to null to prevent reconnect
      const originalOnClose = this.ws.onclose;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.reconnectBackoffMs = 1000;
    // Don't clear chunks on disconnect - allow resume on reconnect
    this.onConnectionChange?.(false);
  }

  /**
   * Send text to the TTS server for speech synthesis
   * Text is chunked on the frontend and sent sequentially
   */
  sendText(text: string, messageId: string): void {
    // Clean the text - remove links
    let cleanedText = text.replace(/https?:\/\/[^\s',\.]+/g, "");

    // Remove all # and * (including unicode asterisk '∗' just in case)
    // This removes both standard '*' and unicode '∗'
    cleanedText = cleanedText.replace(/#|\*|∗/g, "");

    // For debugging, log the cleaned text to confirm * is removed
    if (text.includes("*")) {
      console.log(
        '[TTSService] After cleaning, "*" should be removed. Cleaned text:',
        cleanedText
      );
    }

    // Chunk the text
    const textChunks = ttsChunks(cleanedText);

    if (textChunks.length === 0) {
      console.warn("No chunks generated from text");
      return;
    }

    // Store chunks and reset state
    this.chunks = textChunks;
    this.currentChunkIndex = 0;
    this.currentMessageId = messageId;
    this.isProcessing = true;

    console.log(
      `Chunked text into ${textChunks.length} chunks for message ${messageId}`,
    );

    // Check connection before processing
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "TTS WebSocket not connected, will process chunks when connected. State:",
        this.ws?.readyState,
      );
      // Try to reconnect if not already connecting
      if (!this.isConnecting && this.ws?.readyState === WebSocket.CLOSED) {
        console.log("Attempting to reconnect TTS WebSocket...");
        // Reset intentional disconnect flag to allow reconnection
        this.isIntentionallyDisconnected = false;
        this.connect();
      }
      return;
    }

    // Start processing first chunk
    this.processNextChunk();
  }

  /**
   * Process the next chunk in the queue
   */
  private processNextChunk(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("Cannot process chunk: WebSocket not connected");
      return;
    }

    if (this.currentChunkIndex >= this.chunks.length) {
      console.log("All chunks processed");
      this.isProcessing = false;
      return;
    }

    const chunk = this.chunks[this.currentChunkIndex];
    const totalChunks = this.chunks.length;

    try {
      const message = {
        type: "text",
        text: chunk,
        message_id: this.currentMessageId,
        chunk_index: this.currentChunkIndex,
        total_chunks: totalChunks,
      };

      this.ws.send(JSON.stringify(message));
      console.log(
        `Sending chunk ${this.currentChunkIndex + 1}/${totalChunks} to TTS:`,
        chunk.substring(0, 50) + (chunk.length > 50 ? "..." : ""),
      );
    } catch (error) {
      console.error("Error sending chunk to TTS:", error);
      this.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      // Mark processing as failed, will retry on reconnect
      this.isProcessing = false;
    }
  }

  /**
   * Resume processing from the current chunk index
   * Called automatically on reconnection if there are unprocessed chunks
   */
  resumeProcessing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("Cannot resume: WebSocket not connected");
      return;
    }

    if (this.chunks.length === 0) {
      console.log("No chunks to resume");
      return;
    }

    if (this.currentChunkIndex >= this.chunks.length) {
      console.log("All chunks already processed");
      this.isProcessing = false;
      this.chunks = [];
      this.currentChunkIndex = 0;
      this.currentMessageId = null;
      return;
    }

    console.log(
      `Resuming TTS processing from chunk ${this.currentChunkIndex + 1}/${this.chunks.length}`,
    );
    this.isProcessing = true;
    this.processNextChunk();
  }

  /**
   * Check if the WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimeout();

    // Don't reconnect if intentionally disconnected
    if (this.isIntentionallyDisconnected) {
      return;
    }

    // Don't reconnect if already at max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("TTS WebSocket: Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const backoffTime = Math.min(
      this.reconnectBackoffMs * Math.pow(2, this.reconnectAttempts - 1),
      30000, // Max 30 seconds
    );

    console.log(
      `Scheduling TTS WebSocket reconnect in ${backoffTime}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, backoffTime);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Start keep-alive ping to prevent connection timeout
   */
  private startKeepAlive(): void {
    this.stopKeepAlive(); // Clear any existing interval

    // Send a ping every 30 seconds to keep connection alive
    this.keepAliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          // Send a lightweight ping message
          this.ws.send(JSON.stringify({ type: "ping" }));
        } catch (error) {
          console.error("TTS WebSocket: Keep-alive ping failed", error);
          this.stopKeepAlive();
        }
      } else {
        this.stopKeepAlive();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop keep-alive ping
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Manually reconnect (resets intentional disconnect flag)
   */
  reconnect(): void {
    this.isIntentionallyDisconnected = false;
    this.reconnectAttempts = 0;
    this.reconnectBackoffMs = 1000;
    this.disconnect();
    setTimeout(() => this.connect(), 100);
  }
}

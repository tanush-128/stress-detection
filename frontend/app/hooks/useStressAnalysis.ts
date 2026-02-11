"use client";

/**
 * useStressAnalysis - Hook for sending voice audio to stress detection backend
 *
 * Handles sending accumulated audio chunks to the backend for stress analysis.
 * Results are stored silently in the session on the backend.
 * 
 * FIXED: Now uses a queue to prevent dropping audio when analysis is slow.
 */

import { useCallback, useRef, useEffect } from "react";
import { chunksToWavBlob } from "@/audio";
import { AGENT_BASE_URL } from "../config";

interface QueuedAnalysis {
  sessionId: string;
  chunks: ArrayBuffer[];
  sampleRate: number;
}

export interface UseStressAnalysisReturn {
  /** Send accumulated audio for stress analysis */
  sendAudioForAnalysis: (sessionId: string, chunks: ArrayBuffer[], sampleRate: number) => void;
  /** Whether analysis is currently in progress */
  isAnalyzing: boolean;
  /** Number of analyses in queue */
  queueLength: number;
}

export function useStressAnalysis(): UseStressAnalysisReturn {
  const isAnalyzingRef = useRef(false);
  const queueRef = useRef<QueuedAnalysis[]>([]);
  const processingRef = useRef(false);

  // Process the queue
  const processQueue = useCallback(async () => {
    // Prevent concurrent processing
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    isAnalyzingRef.current = true;

    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift()!;
      
      try {
        console.log(`[StressQueue] Processing analysis (${queueRef.current.length} remaining in queue)`);
        
        // Convert chunks to WAV blob with actual sample rate
        const wavBlob = chunksToWavBlob(item.chunks, item.sampleRate);

        // Create form data for multipart upload
        const formData = new FormData();
        formData.append("session_id", item.sessionId);
        formData.append("audio", wavBlob, "recording.wav");

        // Send to backend
        const response = await fetch(`${AGENT_BASE_URL}/api/analyze-stress`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          console.warn("[StressQueue] Analysis failed:", response.status);
        } else {
          const result = await response.json();
          console.log("[StressQueue] Analysis result:", result);
        }
      } catch (error) {
        console.warn("[StressQueue] Error:", error);
      }
    }

    processingRef.current = false;
    isAnalyzingRef.current = false;
  }, []);

  // Add to queue and start processing
  const sendAudioForAnalysis = useCallback(
    (sessionId: string, chunks: ArrayBuffer[], sampleRate: number): void => {
      if (chunks.length === 0) {
        console.log("[StressQueue] Skipping empty chunks");
        return;
      }

      // Add to queue
      queueRef.current.push({ sessionId, chunks, sampleRate });
      console.log(`[StressQueue] Added to queue (total: ${queueRef.current.length})`);

      // Start processing if not already running
      processQueue();
    },
    [processQueue]
  );

  // Cleanup: process remaining queue on unmount
  useEffect(() => {
    return () => {
      if (queueRef.current.length > 0) {
        console.log(`[StressQueue] Component unmounting with ${queueRef.current.length} items in queue`);
      }
    };
  }, []);

  return {
    sendAudioForAnalysis,
    get isAnalyzing() {
      return isAnalyzingRef.current;
    },
    get queueLength() {
      return queueRef.current.length;
    },
  };
}

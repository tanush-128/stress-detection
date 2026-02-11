"use client";

/**
 * useComprehensiveReport - Hook for fetching comprehensive stress analysis results
 */

import { useState, useEffect, useCallback } from "react";
import { AGENT_BASE_URL } from "../config";

export interface StressReading {
  timestamp: string;
  question_number: number;
  stress_score: number;
  confidence: number;
  label: string;
}

export interface VoiceAnalysis {
  readings: StressReading[];
  average_score: number | null;
  trend: "stable" | "increasing" | "decreasing";
}

export interface LLMAnalysis {
  stress_score: number; // 1-100
  stress_level: string;
  key_indicators: string[];
  positive_factors: string[];
  recommendations: string[];
  summary: string;
}

export interface ConversationAnalysis {
  questions: string[];
  answers: string[];
  llm_analysis: LLMAnalysis | null;
}

export interface EnsembleResult {
  overall_stress_level: "Low" | "Moderate" | "High" | "Very High";
  ensemble_score: number; // 1-100 combined
  voice_stress_score: number | null; // 1-100
  text_stress_score: number | null; // 1-100
  confidence: number;
  key_indicators: string[];
}

export interface ComprehensiveReport {
  session_id: string;
  user_name: string;
  voice_analysis: VoiceAnalysis;
  conversation_analysis: ConversationAnalysis;
  ensemble_result: EnsembleResult;
}

export interface UseComprehensiveReportReturn {
  report: ComprehensiveReport | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useComprehensiveReport(sessionId: string | null): UseComprehensiveReportReturn {
  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!sessionId) {
      setError("No session ID provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${AGENT_BASE_URL}/api/session/${sessionId}/comprehensive-report`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Session not found");
        }
        throw new Error("Failed to fetch report");
      }

      const data: ComprehensiveReport = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchReport();
    }
  }, [sessionId, fetchReport]);

  return {
    report,
    isLoading,
    error,
    refetch: fetchReport,
  };
}


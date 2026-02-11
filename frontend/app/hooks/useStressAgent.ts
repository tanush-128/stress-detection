"use client";

import { useState, useCallback, useRef } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

export interface UseStressAgentReturn {
  messages: Message[];
  isLoading: boolean;
  isComplete: boolean;
  questionNumber: number;
  totalQuestions: number;
  sessionId: string | null;
  error: string | null;
  startSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  resetSession: () => void;
}

export function useStressAgent(): UseStressAgentReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messageIdCounter = useRef(0);

  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  };

  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setMessages([]);
    setIsComplete(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to start session");
      }

      const data = await response.json();

      setSessionId(data.session_id);
      setQuestionNumber(data.question_number);
      setTotalQuestions(data.total_questions);

      // Add assistant message
      setMessages([
        {
          id: generateMessageId(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!sessionId || isLoading) return;

      setIsLoading(true);
      setError(null);

      // Add user message immediately
      const userMessage: Message = {
        id: generateMessageId(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch(`${API_BASE_URL}/api/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            message: message,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();

        setQuestionNumber(data.question_number);
        setIsComplete(data.is_complete);

        // Add assistant response
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        // Remove the user message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading]
  );

  const resetSession = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    setIsComplete(false);
    setQuestionNumber(0);
    setSessionId(null);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    isComplete,
    questionNumber,
    totalQuestions,
    sessionId,
    error,
    startSession,
    sendMessage,
    resetSession,
  };
}


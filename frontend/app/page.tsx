"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStressAgent, Message } from "./hooks/useStressAgent";
import { useStressAnalysis } from "./hooks/useStressAnalysis";
import { useSTT, useTTS, useAudioPlayer, useRecorder } from "@/audio";
import { STT_BASE_URL, TTS_BASE_URL } from "./config";
import { DecorativeContainer, CalmingOrb, BlobShape } from "./components/decorative";

// ============================================================================
// Icons - Ocean themed
// ============================================================================

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12c1.5-2 3-3 4.5-3s3 2 4.5 3 3 3 4.5 3 3-1 4.5-3" />
      <path d="M2 6c1.5-2 3-3 4.5-3s3 2 4.5 3 3 3 4.5 3 3-1 4.5-3" />
      <path d="M2 18c1.5-2 3-3 4.5-3s3 2 4.5 3 3 3 4.5 3 3-1 4.5-3" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" />
    </svg>
  );
}

// ============================================================================
// Components
// ============================================================================

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="typing-dot w-2 h-2 bg-teal-400 rounded-full" />
      <div className="typing-dot w-2 h-2 bg-teal-400 rounded-full" />
      <div className="typing-dot w-2 h-2 bg-teal-400 rounded-full" />
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-sky-200/60 mb-2">
        <span>Question {current} of {total}</span>
        <span>{Math.round(percentage)}% complete</span>
      </div>
      <div className="h-2 bg-ocean-wave/50 rounded-full overflow-hidden">
        <div 
          className="progress-fill h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function VolumeIndicator({ volume, isRecording }: { volume: number; isRecording: boolean }) {
  const bars = 5;
  const normalizedVolume = Math.min(volume * 3, 1);
  
  return (
    <div className="flex items-center gap-1 h-6">
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i + 1) / bars;
        const isActive = isRecording && normalizedVolume >= threshold * 0.5;
        const height = isActive ? 6 + normalizedVolume * 14 * ((i + 1) / bars) : 6;
        
        return (
          <div
            key={i}
            className="w-1 rounded-full transition-all duration-100"
            style={{
              height: `${height}px`,
              backgroundColor: isActive 
                ? `rgba(100, 255, 218, ${0.5 + (i / bars) * 0.5})` 
                : "rgba(100, 255, 218, 0.2)",
            }}
          />
        );
      })}
    </div>
  );
}

function MessageBubble({ message, isLatest }: { message: Message; isLatest: boolean }) {
  const isAssistant = message.role === "assistant";
  
  return (
    <div
      className={`flex ${isAssistant ? "justify-start" : "justify-end"} ${isLatest ? "message-enter" : ""}`}
    >
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 ${
          isAssistant
            ? "glass-light text-foam-white"
            : "bg-gradient-to-br from-teal-500/90 to-cyan-600/90 text-white shadow-lg shadow-teal-500/20"
        }`}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function WelcomeScreen({ onStart, isLoading }: { onStart: () => void; isLoading: boolean }) {
  return (
    <DecorativeContainer showBlobs={true} showBubbles={true} showWaves={true}>
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Calming orb with leaf icon */}
        <CalmingOrb 
          size="lg" 
          icon={<LeafIcon className="w-12 h-12" />}
          className="mb-10"
        />

        <h1 
          className="text-5xl md:text-6xl font-light text-gradient-ocean mb-4 tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mindful
        </h1>
        
        <p className="text-xl text-sky-200/80 max-w-md mb-4 font-light">
          Your peaceful space for understanding stress
        </p>
        
        <p className="text-sm text-sky-300/50 max-w-sm mb-12 leading-relaxed">
          Take a few calming breaths. I&apos;ll guide you through a gentle conversation 
          to help you reflect on how you&apos;re feeling.
        </p>

        <button
          onClick={onStart}
          disabled={isLoading}
          className="group relative px-10 py-4 btn-ocean text-ocean-deep font-semibold rounded-full transition-all duration-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="flex items-center gap-3">
            <WaveIcon className="w-5 h-5" />
            {isLoading ? "Preparing..." : "Begin Your Journey"}
          </span>
        </button>

        <p className="text-xs text-sky-300/40 mt-12 max-w-xs">
          This takes about 5-10 minutes. Your space is private and secure.
        </p>
      </div>
    </DecorativeContainer>
  );
}

function ChatInterface({
  messages,
  isLoading,
  isComplete,
  questionNumber,
  totalQuestions,
  sessionId,
  onSendMessage,
  onReset,
}: {
  messages: Message[];
  isLoading: boolean;
  isComplete: boolean;
  questionNumber: number;
  totalQuestions: number;
  sessionId: string;
  onSendMessage: (message: string) => void;
  onReset: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [transcript, setTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Audio chunk accumulation for stress analysis
  const audioChunksRef = useRef<ArrayBuffer[]>([]);
  const sampleRateRef = useRef(16000);
  const { sendAudioForAnalysis } = useStressAnalysis();

  // Audio hooks
  const { queueAudioChunk, audioRef, isBotSpeaking, stopBotSpeaking } = useAudioPlayer({
    onAudioDone: () => {},
    onChunkPlayed: () => {},
  });

  const { isConnected: isTtsConnected, getAudio } = useTTS({
    url: `${TTS_BASE_URL}/ws`,
    onAudioChunk: (chunk) => {
      queueAudioChunk(chunk);
    },
  });

  const handleFinalTranscript = useCallback(
    (text: string) => {
      setInputValue((prev) => {
        const trimmedPrev = prev.trim();
        const trimmedText = text.trim();
        if (!trimmedPrev) return trimmedText;
        return `${trimmedPrev} ${trimmedText}`;
      });
      setTranscript("");

      if (audioChunksRef.current.length > 0 && sessionId) {
        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        sendAudioForAnalysis(sessionId, chunks, sampleRateRef.current);
      }
    },
    [sessionId, sendAudioForAnalysis]
  );

  const { isConnected: isSttConnected, sendAudio } = useSTT({
    url: `${STT_BASE_URL}/ws`,
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        handleFinalTranscript(text);
      } else {
        setTranscript(text);
      }
    },
  });

  const handleAudioData = useCallback(
    (buffer: ArrayBuffer) => {
      audioChunksRef.current.push(buffer);
      sendAudio(buffer);
    },
    [sendAudio]
  );

  const { isRecording, startRecording, stopRecording, volume, sampleRate } = useRecorder(handleAudioData);
  
  useEffect(() => {
    sampleRateRef.current = sampleRate;
  }, [sampleRate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage.role === "assistant" &&
      lastMessage.id !== lastMessageIdRef.current &&
      isTtsConnected
    ) {
      lastMessageIdRef.current = lastMessage.id;
      setTimeout(() => {
        getAudio(lastMessage.content, lastMessage.id);
      }, 300);
    }
  }, [messages, isTtsConnected, getAudio]);

  const handleSubmit = () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    if (isBotSpeaking) {
      stopBotSpeaking();
    }

    onSendMessage(message);
    setInputValue("");
    setTranscript("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (isBotSpeaking) {
        stopBotSpeaking();
      }
      audioChunksRef.current = [];
      await startRecording();
    }
  };

  return (
    <div className="relative flex flex-col h-screen max-h-screen">
      {/* Background gradient */}
      <div className="gradient-bg" />
      
      {/* Subtle decorative blobs */}
      <BlobShape 
        variant={1} 
        color="teal"
        className="fixed top-[-5%] right-[-10%] w-[35vw] h-[35vw] float-slow opacity-40 pointer-events-none z-0"
      />
      <BlobShape 
        variant={3} 
        color="sky"
        className="fixed bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] float-medium opacity-30 pointer-events-none z-0"
      />

      {/* Header */}
      <header className="glass sticky top-0 z-20 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <LeafIcon className="w-5 h-5 text-ocean-deep" />
            </div>
            <div>
              <h1 className="font-medium text-foam-white" style={{ fontFamily: "var(--font-display)" }}>
                Mindful
              </h1>
              <p className="text-xs text-sky-300/60">
                {isComplete ? "Assessment Complete" : "Stress Assessment"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${isSttConnected ? "bg-teal-400" : "bg-coral-soft"}`} />
              <span className="text-sky-300/50">Voice</span>
            </div>

            {!isComplete && (
              <button
                onClick={onReset}
                className="text-sm text-sky-300/60 hover:text-teal-300 transition-colors"
              >
                Start Over
              </button>
            )}
          </div>
        </div>

        {!isComplete && (
          <div className="max-w-3xl mx-auto mt-4">
            <ProgressBar current={questionNumber} total={totalQuestions} />
          </div>
        )}
      </header>

      {/* Messages */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLatest={index === messages.length - 1}
            />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="glass-light rounded-2xl">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      {!isComplete ? (
        <footer className="glass sticky bottom-0 z-20 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            {transcript && (
              <div className="mb-3 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                <p className="text-sm text-teal-300 italic">{transcript}</p>
              </div>
            )}

            <div className="flex items-end gap-3">
              {/* Voice button */}
              <button
                onClick={toggleRecording}
                disabled={!isSttConnected}
                className={`relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? "bg-coral-soft text-ocean-deep"
                    : "bg-ocean-wave border border-teal-500/20 text-teal-300 hover:text-teal-200 hover:border-teal-500/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRecording && (
                  <span className="absolute inset-0 rounded-full bg-coral-soft pulse-ring" />
                )}
                {isRecording ? (
                  <StopIcon className="w-5 h-5 relative z-10" />
                ) : (
                  <MicIcon className="w-5 h-5" />
                )}
              </button>

              {isRecording && (
                <div className="shrink-0">
                  <VolumeIndicator volume={volume} isRecording={isRecording} />
                </div>
              )}

              {/* Text input */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Share your thoughts..."
                  rows={1}
                  className="w-full px-4 py-3 bg-ocean-wave/80 border border-teal-500/20 rounded-2xl text-foam-white placeholder-sky-300/40 resize-none focus:outline-none focus:border-teal-500/50 transition-colors"
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading}
                className="shrink-0 w-12 h-12 rounded-full btn-ocean text-ocean-deep flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>

            {isBotSpeaking && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-teal-300">
                <div className="flex items-center gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-teal-400 rounded-full"
                      style={{
                        height: "12px",
                        animation: `wave 0.6s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
                <span>Speaking...</span>
                <button
                  onClick={stopBotSpeaking}
                  className="ml-2 text-xs text-sky-300/50 hover:text-teal-300"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        </footer>
      ) : (
        <footer className="glass sticky bottom-0 z-20 px-4 py-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sky-200/70 mb-4">
              Thank you for sharing. Your results are ready.
            </p>
            <button
              onClick={onReset}
              className="px-8 py-3 btn-ocean text-ocean-deep font-medium rounded-full"
            >
              Start New Journey
            </button>
          </div>
        </footer>
      )}

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function Home() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  
  const {
    messages,
    isLoading,
    isComplete,
    questionNumber,
    totalQuestions,
    sessionId,
    startSession,
    sendMessage,
    resetSession,
  } = useStressAgent();

  const hasStarted = sessionId !== null;

  useEffect(() => {
    if (isComplete && sessionId && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const timer = setTimeout(() => {
        router.push(`/results?session=${sessionId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, sessionId, router]);

  useEffect(() => {
    if (!sessionId) {
      hasRedirectedRef.current = false;
    }
  }, [sessionId]);

  return (
    <>
      {!hasStarted ? (
        <WelcomeScreen onStart={startSession} isLoading={isLoading} />
      ) : (
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          isComplete={isComplete}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
          sessionId={sessionId!}
          onSendMessage={sendMessage}
          onReset={resetSession}
        />
      )}
    </>
  );
}

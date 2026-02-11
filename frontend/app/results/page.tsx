"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  useComprehensiveReport,
  StressReading,
} from "../hooks/useComprehensiveReport";
import { DecorativeContainer, BlobShape, SectionDivider, CalmingOrb } from "../components/decorative";

// ============================================================================
// Icons - Ocean themed
// ============================================================================

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12c1.5-2 3-3 4.5-3s3 2 4.5 3 3 3 4.5 3 3-1 4.5-3" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function TrendDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

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

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

// ============================================================================
// Components
// ============================================================================

function LoadingSpinner() {
  return (
    <DecorativeContainer showBlobs={true} showBubbles={true} showWaves={false}>
      <div className="flex flex-col items-center justify-center min-h-screen">
        <CalmingOrb 
          size="lg" 
          icon={<WaveIcon className="w-10 h-10" />}
          className="mb-6"
        />
        <p className="text-sky-200/60 text-sm animate-pulse">Preparing your insights...</p>
      </div>
    </DecorativeContainer>
  );
}

function StressGauge({ score, label }: { score: number; label: string }) {
  const normalized = score / 100;
  const rotation = (normalized * 180) - 90;
  
  // Ocean-inspired color scale: teal (calm) to coral (stressed)
  const getColor = () => {
    if (score <= 25) return { main: "#64ffda", glow: "rgba(100, 255, 218, 0.4)" }; // teal-calm
    if (score <= 50) return { main: "#a8edea", glow: "rgba(168, 237, 234, 0.4)" }; // sky-light
    if (score <= 75) return { main: "#ffd6e0", glow: "rgba(255, 214, 224, 0.4)" }; // coral-soft
    return { main: "#ff9eb5", glow: "rgba(255, 158, 181, 0.4)" }; // coral-warm
  };
  
  const colors = getColor();

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-52 h-26 overflow-hidden">
        {/* Background arc */}
        <div 
          className="absolute inset-0 rounded-t-full border-8 border-b-0"
          style={{ borderColor: "rgba(100, 255, 218, 0.1)" }}
        />
        {/* Colored arc */}
        <div 
          className="absolute inset-0 rounded-t-full border-8 border-b-0 transition-all duration-1500"
          style={{ 
            borderColor: colors.main,
            clipPath: `polygon(0 100%, 0 0, ${50 + normalized * 50}% 0, ${50 + normalized * 50}% 100%)`,
            filter: `drop-shadow(0 0 8px ${colors.glow})`
          }}
        />
        {/* Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-1 h-20 origin-bottom transition-transform duration-1500"
          style={{ 
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            background: `linear-gradient(to top, ${colors.main}, transparent)`
          }}
        />
        {/* Center dot */}
        <div 
          className="absolute bottom-0 left-1/2 w-5 h-5 rounded-full -translate-x-1/2 translate-y-1/2"
          style={{ 
            backgroundColor: colors.main,
            boxShadow: `0 0 15px ${colors.glow}`
          }}
        />
      </div>
      <div className="mt-6 text-center">
        <div 
          className="text-5xl font-light tracking-wide"
          style={{ color: colors.main, fontFamily: "var(--font-display)" }}
        >
          {score}
        </div>
        <div className="text-sm text-sky-200/60 mt-2">{label}</div>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, maxScore = 100 }: { label: string; score: number | null; maxScore?: number }) {
  if (score === null) return null;
  
  const percentage = (score / maxScore) * 100;
  const getGradient = () => {
    if (score <= 25) return "from-teal-400 to-cyan-400";
    if (score <= 50) return "from-sky-300 to-teal-300";
    if (score <= 75) return "from-coral-soft to-pink-300";
    return "from-coral-warm to-red-400";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-sky-200/60">{label}</span>
        <span className="text-foam-white font-medium">{score}/100</span>
      </div>
      <div className="h-3 bg-ocean-wave/50 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${getGradient()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StressLevelBadge({ level }: { level: string }) {
  const getStyles = () => {
    switch (level) {
      case "Low":
        return "bg-teal-500/20 text-teal-300 border-teal-500/30";
      case "Moderate":
        return "bg-sky-400/20 text-sky-300 border-sky-400/30";
      case "High":
        return "bg-pink-400/20 text-pink-300 border-pink-400/30";
      case "Very High":
        return "bg-coral-warm/20 text-coral-warm border-coral-warm/30";
      default:
        return "bg-sky-400/20 text-sky-300 border-sky-400/30";
    }
  };

  return (
    <span className={`px-5 py-2 rounded-full text-sm font-medium border ${getStyles()}`}>
      {level}
    </span>
  );
}

function VoiceStressChart({ readings }: { readings: StressReading[] }) {
  if (readings.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sky-300/50">
        <WaveIcon className="w-6 h-6 mr-2 opacity-50" />
        No voice readings recorded
      </div>
    );
  }

  const scores = readings.map(r => Math.round(r.stress_score * 100));
  const maxScore = Math.max(...scores, 100);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 h-44 px-2">
        {readings.map((reading, index) => {
          const score = Math.round(reading.stress_score * 100);
          const height = (score / maxScore) * 100;
          const getBarGradient = () => {
            if (score <= 25) return "from-teal-400 to-cyan-500";
            if (score <= 50) return "from-sky-300 to-teal-400";
            if (score <= 75) return "from-pink-300 to-coral-soft";
            return "from-coral-warm to-red-400";
          };

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs text-sky-200/60">
                {score}
              </span>
              <div className="w-full relative">
                <div
                  className={`w-full rounded-t-xl bg-gradient-to-t ${getBarGradient()} transition-all duration-700 relative`}
                  style={{ 
                    height: `${Math.max(height, 12)}px`,
                    boxShadow: score > 50 ? "0 0 10px rgba(255, 214, 224, 0.3)" : "0 0 10px rgba(100, 255, 218, 0.2)"
                  }}
                >
                  {/* Wave pattern overlay */}
                  <div className="absolute inset-0 opacity-30 rounded-t-xl overflow-hidden">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <pattern id={`wave-${index}`} x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
                        <path d="M0,5 Q5,0 10,5 T20,5" fill="none" stroke="white" strokeWidth="1" />
                      </pattern>
                      <rect width="100%" height="100%" fill={`url(#wave-${index})`} />
                    </svg>
                  </div>
                </div>
              </div>
              <span className="text-xs text-sky-300/50">Q{reading.question_number}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: string }) {
  const getTrendIcon = () => {
    switch (trend) {
      case "increasing":
        return <TrendUpIcon className="w-5 h-5 text-coral-soft" />;
      case "decreasing":
        return <TrendDownIcon className="w-5 h-5 text-teal-400" />;
      default:
        return <MinusIcon className="w-5 h-5 text-sky-300" />;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case "increasing":
        return "Stress increased during session";
      case "decreasing":
        return "Stress decreased during session";
      default:
        return "Stress remained stable";
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {getTrendIcon()}
      <span className="text-sky-200/70">{getTrendText()}</span>
    </div>
  );
}

function QACard({ question, answer, index }: { question: string; answer: string; index: number }) {
  return (
    <div className="glass-light rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-500/20 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-teal-300">{index + 1}</span>
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm text-sky-200/60">{question}</p>
          <p className="text-foam-white leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

function KeyIndicatorsList({ indicators }: { indicators: string[] }) {
  return (
    <div className="space-y-3">
      {indicators.map((indicator, index) => (
        <div
          key={index}
          className="flex items-center gap-3 px-4 py-3 glass-light rounded-xl"
        >
          <div className="w-2 h-2 rounded-full bg-teal-400" />
          <span className="text-sky-100">{indicator}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Results Content
// ============================================================================

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");

  const { report, isLoading, error } = useComprehensiveReport(sessionId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !report) {
    return (
      <DecorativeContainer showBlobs={true} showBubbles={false} showWaves={true}>
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-coral-soft/20 flex items-center justify-center mb-6">
            <WaveIcon className="w-10 h-10 text-coral-soft" />
          </div>
          <h1 className="text-2xl font-light text-foam-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Unable to Load Results
          </h1>
          <p className="text-sky-200/60 mb-8">{error || "Session not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 btn-ocean text-ocean-deep font-medium rounded-full"
          >
            Start New Journey
          </button>
        </div>
      </DecorativeContainer>
    );
  }

  const { voice_analysis, conversation_analysis, ensemble_result, user_name } = report;

  return (
    <DecorativeContainer showBlobs={true} showBubbles={true} showWaves={false}>
      <div className="min-h-screen pb-16">
        {/* Header */}
        <header className="glass sticky top-0 z-20 px-6 py-4 mb-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <LeafIcon className="w-5 h-5 text-ocean-deep" />
              </div>
              <div>
                <h1 className="font-medium text-foam-white" style={{ fontFamily: "var(--font-display)" }}>
                  Mindful
                </h1>
                <p className="text-xs text-sky-300/60">Your Results</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-sky-300/60 hover:text-teal-300 transition-colors"
            >
              New Journey
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 space-y-8">
          {/* Welcome Banner */}
          <div className="text-center mb-10">
            <h2 
              className="text-4xl font-light text-gradient-ocean mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {user_name ? `${user_name}'s` : "Your"} Wellness Insights
            </h2>
            <p className="text-sky-200/60">
              A gentle reflection on your assessment journey
            </p>
          </div>

          {/* Overall Result Card */}
          <div className="card-ocean p-8">
            <div className="flex flex-col lg:flex-row items-center gap-10">
              {/* Stress Gauge */}
              <div className="shrink-0">
                <StressGauge
                  score={ensemble_result.ensemble_score}
                  label="Combined Wellness Score"
                />
              </div>

              {/* Summary */}
              <div className="flex-1 text-center lg:text-left space-y-5">
                <div>
                  <p className="text-sm text-sky-200/50 mb-2">Overall Assessment</p>
                  <StressLevelBadge level={ensemble_result.overall_stress_level} />
                </div>
                
                {/* Score breakdown */}
                <div className="space-y-4 w-full max-w-sm mx-auto lg:mx-0">
                  <ScoreBar label="Voice Analysis" score={ensemble_result.voice_stress_score} />
                  <ScoreBar label="Text Analysis" score={ensemble_result.text_stress_score} />
                </div>
                
                <div className="flex flex-wrap gap-6 justify-center lg:justify-start pt-2">
                  <div className="text-center">
                    <p className="text-3xl font-light text-foam-white" style={{ fontFamily: "var(--font-display)" }}>
                      {Math.round(ensemble_result.confidence * 100)}%
                    </p>
                    <p className="text-xs text-sky-300/50">Confidence</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-light text-foam-white" style={{ fontFamily: "var(--font-display)" }}>
                      {voice_analysis.readings.length}
                    </p>
                    <p className="text-xs text-sky-300/50">Voice Samples</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-light text-foam-white" style={{ fontFamily: "var(--font-display)" }}>
                      {conversation_analysis.answers.length}
                    </p>
                    <p className="text-xs text-sky-300/50">Questions</p>
                  </div>
                </div>

                <TrendIndicator trend={voice_analysis.trend} />
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* Voice Analysis Section */}
          <div className="card-ocean p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-400/30 to-teal-500/20 flex items-center justify-center">
                <MicIcon className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foam-white" style={{ fontFamily: "var(--font-display)" }}>
                  Voice Patterns
                </h3>
                <p className="text-sm text-sky-200/50">Stress levels detected from your voice</p>
              </div>
            </div>

            <VoiceStressChart readings={voice_analysis.readings} />

            {voice_analysis.average_score !== null && (
              <div className="mt-6 pt-6 border-t border-teal-500/10 flex items-center justify-between">
                <span className="text-sky-200/60">Average Voice Stress</span>
                <span className="text-2xl font-light text-teal-300" style={{ fontFamily: "var(--font-display)" }}>
                  {Math.round(voice_analysis.average_score * 100)}/100
                </span>
              </div>
            )}
          </div>

          {/* Key Indicators */}
          <div className="card-ocean p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400/30 to-cyan-500/20 flex items-center justify-center">
                <SparkleIcon className="w-5 h-5 text-sky-300" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foam-white" style={{ fontFamily: "var(--font-display)" }}>
                  Key Insights
                </h3>
                <p className="text-sm text-sky-200/50">Notable patterns from your assessment</p>
              </div>
            </div>

            <KeyIndicatorsList indicators={ensemble_result.key_indicators} />
          </div>

          {/* Conversation Analysis */}
          <div className="card-ocean p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-500/20 flex items-center justify-center">
                <ChatIcon className="w-5 h-5 text-teal-300" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foam-white" style={{ fontFamily: "var(--font-display)" }}>
                  Your Reflections
                </h3>
                <p className="text-sm text-sky-200/50">Responses shared during the journey</p>
              </div>
            </div>

            <div className="space-y-4">
              {conversation_analysis.questions.map((question, index) => (
                <QACard
                  key={index}
                  question={question}
                  answer={conversation_analysis.answers[index] || "No response"}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* AI Assessment */}
          {conversation_analysis.llm_analysis && (
            <div className="card-ocean p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400/30 to-emerald-500/20 flex items-center justify-center">
                  <SunIcon className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foam-white" style={{ fontFamily: "var(--font-display)" }}>
                    Personalized Insights
                  </h3>
                  <p className="text-sm text-sky-200/50">AI-generated wellness guidance</p>
                </div>
              </div>

              {/* Summary */}
              <p className="text-sky-100 leading-relaxed mb-6 text-lg">
                {conversation_analysis.llm_analysis.summary}
              </p>

              {/* Positive Factors */}
              {conversation_analysis.llm_analysis.positive_factors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-teal-300 mb-3 flex items-center gap-2">
                    <LeafIcon className="w-4 h-4" />
                    Positive Factors
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {conversation_analysis.llm_analysis.positive_factors.map((factor, i) => (
                      <span 
                        key={i} 
                        className="px-4 py-2 bg-teal-500/10 text-teal-300 text-sm rounded-full border border-teal-500/20"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {conversation_analysis.llm_analysis.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-sky-300 mb-3 flex items-center gap-2">
                    <SparkleIcon className="w-4 h-4" />
                    Gentle Recommendations
                  </h4>
                  <ul className="space-y-3">
                    {conversation_analysis.llm_analysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 text-sky-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="text-center pt-8">
            <button
              onClick={() => router.push("/")}
              className="px-10 py-4 btn-ocean text-ocean-deep font-semibold rounded-full transition-all duration-500 hover:scale-105"
            >
              Begin Another Journey
            </button>
            <p className="text-xs text-sky-300/40 mt-6 max-w-md mx-auto leading-relaxed">
              Remember: This reflection is not a medical diagnosis. 
              If you&apos;re experiencing significant stress, please reach out to a healthcare professional.
            </p>
          </div>
        </main>
      </div>
    </DecorativeContainer>
  );
}

// ============================================================================
// Page Export with Suspense
// ============================================================================

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResultsContent />
    </Suspense>
  );
}

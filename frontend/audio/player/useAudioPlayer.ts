/**
 * useAudioPlayer - React hook for audio playback
 *
 * Handles audio queue management and playback with autoplay permission handling.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { AudioChunk } from "../tts/TTSService";

export interface UseAudioPlayerOptions {
  /** Callback when all audio in queue is done playing */
  onAudioDone: (messageId: string) => void;
  onChunkPlayed: (chunk: AudioChunk) => void;
}

export interface UseAudioPlayerReturn {
  /** Ref to attach to an audio element */
  audioRef: React.RefObject<HTMLAudioElement>;
  /** Whether the bot is currently speaking */
  isBotSpeaking: boolean;
  /** Stop the bot from speaking and clear the queue */
  stopBotSpeaking: () => void;
  /** Queue an audio chunk for playback */
  queueAudioChunk: (audioChunk: AudioChunk) => void;
  /** Whether to show the audio permission prompt */
  showAudioPermissionPrompt: boolean;
  /** Set whether to show the audio permission prompt */
  setShowAudioPermissionPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  /** Enable audio playback (call after user interaction) */
  enableAudio: () => void;
  /** Whether audio is enabled */
  isAudioEnabled: boolean;
}

export function useAudioPlayer({
  onAudioDone,
  onChunkPlayed,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement>(null!);
  const audioQueueRef = useRef<AudioChunk[]>([]);
  const isAudioQueuePlayingRef = useRef(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);

  // Enable audio immediately - try to play without waiting for interaction
  const hasUserInteractedRef = useRef(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Show permission prompt only if autoplay is blocked
  const [showAudioPermissionPrompt, setShowAudioPermissionPrompt] =
    useState(false);
  const autoplayBlockedRef = useRef(false);

  const playNextAudioChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isAudioQueuePlayingRef.current = false;
      setIsBotSpeaking(false);
      return;
    }

    if (audioRef.current) {
      const nextAudio = audioQueueRef.current.shift();
      if (nextAudio) {
        onChunkPlayed(nextAudio);
        audioRef.current.src = `data:audio/mp3;base64,${nextAudio.audio}`;

        console.log("Playing audio chunk for:", nextAudio.text);

        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Playback started successfully
              setIsBotSpeaking(true);
              isAudioQueuePlayingRef.current = true;
            })
            .catch((error) => {
              console.warn("Audio playback failed (autoplay blocked):", error);
              // If autoplay is blocked, show permission prompt
              hasUserInteractedRef.current = false;
              autoplayBlockedRef.current = true;
              setIsBotSpeaking(false);
              isAudioQueuePlayingRef.current = false;

              // Put the audio back in the queue
              audioQueueRef.current.unshift(nextAudio);

              // Show permission prompt to user
              setShowAudioPermissionPrompt(true);
            });
        }

        audioRef.current.onended = () => {
          if (audioQueueRef.current.length > 0) {
            playNextAudioChunk();
          } else {
            isAudioQueuePlayingRef.current = false;
            onAudioDone(nextAudio.messageId);
            setIsBotSpeaking(false);
          }
        };

        // Handle audio errors
        audioRef.current.onerror = () => {
          console.warn("Audio element error, trying next chunk");
          if (audioQueueRef.current.length > 0) {
            playNextAudioChunk();
          } else {
            isAudioQueuePlayingRef.current = false;
            onAudioDone(nextAudio.messageId);
            setIsBotSpeaking(false);
          }
        };
      }
    }
  }, [onAudioDone]);

  // Track user interaction as a fallback for browsers that block autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!hasUserInteractedRef.current) {
        hasUserInteractedRef.current = true;
        setIsAudioEnabled(true);
        setShowAudioPermissionPrompt(false);

        // Try to play queued audio after user interaction
        if (
          audioQueueRef.current.length > 0 &&
          !isAudioQueuePlayingRef.current
        ) {
          playNextAudioChunk();
        }
      }
      // Remove event listeners after first interaction
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [playNextAudioChunk]);

  const stopBotSpeaking = useCallback(() => {
    // Always clear the audio queue, regardless of whether an audioRef exists
    audioQueueRef.current = [];

    if (audioRef.current) {
      console.log(
        "Stopping bot speaking, clearing audio queue and audio element",
      );
      //pause the audio
      audioRef.current.pause();
      //reset the audio current time to 0
      audioRef.current.currentTime = 0;
      //clear the audio src
      audioRef.current.src = "";
    }
    //set the bot speaking state to false
    setIsBotSpeaking(false);
    //set the audio queue playing state to false
    isAudioQueuePlayingRef.current = false;
  }, []);

  const queueAudioChunk = useCallback(
    (audioChunk: AudioChunk) => {
      audioQueueRef.current.push(audioChunk);
      if (
        !isAudioQueuePlayingRef.current &&
        audioQueueRef.current.length === 1
      ) {
        playNextAudioChunk();
      }
    },
    [playNextAudioChunk],
  );

  const enableAudio = useCallback(() => {
    hasUserInteractedRef.current = true;
    setIsAudioEnabled(true);
    setShowAudioPermissionPrompt(false);
    // Try to play any queued audio
    if (audioQueueRef.current.length > 0 && !isAudioQueuePlayingRef.current) {
      playNextAudioChunk();
    }
  }, [playNextAudioChunk]);

  return {
    audioRef,
    isBotSpeaking,
    stopBotSpeaking,
    queueAudioChunk,
    showAudioPermissionPrompt,
    setShowAudioPermissionPrompt,
    enableAudio,
    isAudioEnabled,
  };
}

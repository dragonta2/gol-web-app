'use client';

import { useState, useCallback } from 'react';

export const SPEECH_RATES = [
  { label: '1.0x', rate: 1.0 },
  { label: '1.5x', rate: 1.5 },
  { label: '2.0x', rate: 2.0 },
] as const;

export function useSpeech(onError?: (msg: string) => void) {
  const [speakingTarget, setSpeakingTarget] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(1.0);

  const speak = useCallback((text: string, target: string) => {
    if (!('speechSynthesis' in window)) {
      onError?.('このブラウザは音声読み上げに対応していません');
      return;
    }
    if (speakingTarget === target) {
      window.speechSynthesis.cancel();
      setSpeakingTarget(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = speechRate;
    utterance.onend = () => setSpeakingTarget(null);
    utterance.onerror = () => setSpeakingTarget(null);
    setSpeakingTarget(target);
    window.speechSynthesis.speak(utterance);
  }, [speakingTarget, speechRate, onError]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeakingTarget(null);
  }, []);

  return { speakingTarget, speak, stop, speechRate, setSpeechRate };
}

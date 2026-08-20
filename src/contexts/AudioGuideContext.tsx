import { useCallback } from 'react';
import { useLanguage, type Language } from '@/contexts/LanguageContext';

// ── Live text-to-speech for dynamic in-flow guidance ──────────────────────
// Used for announcements whose content can't be pre-recorded (machine names,
// counts, etc. are configured per mill), unlike the fixed step clips.
// Speaks in whichever language is currently selected app-wide (LanguageContext) —
// there is a single language selector for the whole app, not a separate one here.
const SPEECH_LANG_TAGS: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
};

// Only one voice should ever be audible at once. The pre-recorded step clip
// (played by AudioGuideButton's <audio> element) and this live TTS are two
// independent audio channels that don't otherwise know about each other, so
// AudioGuideButton registers its element here and each side stops the other
// before it starts.
let registeredRecordedAudioEl: HTMLAudioElement | null = null;
export function registerGuideAudioElement(el: HTMLAudioElement | null) {
  registeredRecordedAudioEl = el;
}

export function speakText(text: string, lang: Language) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  registeredRecordedAudioEl?.pause(); // stop the pre-recorded clip before speaking
  window.speechSynthesis.cancel(); // don't let announcements queue/overlap each other
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANG_TAGS[lang];
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Speaks in whichever language is currently selected app-wide. Stable
 *  reference (only changes when the language does) — safe to use in effect deps. */
export const useSpeakGuide = () => {
  const { language } = useLanguage();
  const speak = useCallback((text: string) => speakText(text, language), [language]);
  return { speak, stop: stopSpeaking };
};

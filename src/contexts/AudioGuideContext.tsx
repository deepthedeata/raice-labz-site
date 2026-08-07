import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type AudioGuideLanguage = 'en' | 'hi' | 'kn' | 'ta' | 'te';

export const AUDIO_GUIDE_LANGUAGES: { code: AudioGuideLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
];

const STORAGE_KEY = 'audioGuide_language';

interface AudioGuideContextType {
  audioLang: AudioGuideLanguage;
  setAudioLang: (lang: AudioGuideLanguage) => void;
}

const AudioGuideContext = createContext<AudioGuideContextType | undefined>(undefined);

interface AudioGuideProviderProps {
  children: ReactNode;
}

export const AudioGuideProvider: React.FC<AudioGuideProviderProps> = ({ children }) => {
  const [audioLang, setAudioLangState] = useState<AudioGuideLanguage>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AudioGuideLanguage | null;
    return stored && AUDIO_GUIDE_LANGUAGES.some((l) => l.code === stored) ? stored : 'en';
  });

  const setAudioLang = (lang: AudioGuideLanguage) => {
    setAudioLangState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  return (
    <AudioGuideContext.Provider value={{ audioLang, setAudioLang }}>
      {children}
    </AudioGuideContext.Provider>
  );
};

export const useAudioGuide = (): AudioGuideContextType => {
  const context = useContext(AudioGuideContext);
  if (!context) {
    throw new Error('useAudioGuide must be used within an AudioGuideProvider');
  }
  return context;
};

// ── Live text-to-speech for dynamic in-flow guidance ──────────────────────
// Used for announcements whose content can't be pre-recorded (machine names,
// counts, etc. are configured per mill), unlike the fixed step clips above.
const SPEECH_LANG_TAGS: Record<AudioGuideLanguage, string> = {
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

export function speakText(text: string, lang: AudioGuideLanguage) {
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

/** Speaks in whichever language is currently selected for the audio guide. Stable
 *  reference (only changes when audioLang does) — safe to use in effect deps. */
export const useSpeakGuide = () => {
  const { audioLang } = useAudioGuide();
  const speak = useCallback((text: string) => speakText(text, audioLang), [audioLang]);
  return { speak, stop: stopSpeaking };
};

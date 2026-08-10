import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Pause } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { registerGuideAudioElement, stopSpeaking } from "@/contexts/AudioGuideContext";

interface AudioGuideButtonProps {
  /** Clip id without language suffix, e.g. "procurement_preparation". Omit/empty hides the button. */
  clipId?: string;
}

/** Voice guide playback control. Language comes from the single app-wide selector
 *  in PageHeader — there is no separate language picker here. */
export const AudioGuideButton = ({ clipId }: AudioGuideButtonProps) => {
  const { language } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  // If the user explicitly hits Pause, don't immediately auto-replay the same clip on the next render.
  const stoppedClipRef = useRef<string | null>(null);
  // Guards against a stale earlier play() promise resolving/rejecting after a newer
  // clip has already started loading (the root cause of one language's clip bleeding
  // into the next section instead of stopping cleanly at the section boundary).
  const requestIdRef = useRef(0);

  const playClip = (id: string, lang: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    const myRequestId = ++requestIdRef.current;
    stopSpeaking(); // mutual exclusion with the live-guidance TTS
    setStatus("loading");
    audio.pause();
    audio.src = `/audio-guide/${id}_${lang}.mp3`; // set imperatively — deterministic, not dependent on React's attribute-diff timing
    audio.currentTime = 0;
    audio.load();
    audio.play().catch(() => {
      if (requestIdRef.current === myRequestId) setStatus("idle");
    });
  };

  // Auto-speak whenever the segment (clipId) changes, or the app language is switched.
  // Tab clicks / "Continue" actions that change activeStep flow into a clipId change here.
  useEffect(() => {
    if (!clipId) return;
    const key = `${clipId}_${language}`;
    if (stoppedClipRef.current === key) return; // user just paused this exact clip — don't restart it
    playClip(clipId, language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipId, language]);

  useEffect(() => {
    registerGuideAudioElement(audioRef.current);
    return () => {
      registerGuideAudioElement(null);
      audioRef.current?.pause();
    };
  }, []);

  if (!clipId) return null;

  const handleToggle = () => {
    if (!audioRef.current) return;
    if (status === "playing" || status === "loading") {
      requestIdRef.current++; // invalidate any in-flight play() so it can't flip status back
      audioRef.current.pause();
      stoppedClipRef.current = `${clipId}_${language}`;
      setStatus("idle");
      return;
    }
    stoppedClipRef.current = null;
    playClip(clipId, language);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="gap-2"
      >
        {status === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === "playing" ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        {status === "playing" ? "Pause" : "Replay"}
      </Button>

      <audio
        ref={audioRef}
        onCanPlay={() => setStatus((s) => (s === "loading" ? "playing" : s))}
        onPlaying={() => setStatus("playing")}
        onEnded={() => setStatus("idle")}
        onError={() => setStatus("idle")}
        className="hidden"
      />
    </div>
  );
};

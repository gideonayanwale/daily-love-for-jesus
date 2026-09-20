// Web Speech API text-to-speech narration manager for Bible chapters and verses

export interface NarrationController {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPlaying: boolean;
  isPaused: boolean;
}

const LANGUAGE_VOICE_MAP: Record<string, string> = {
  English: "en-US",
  Spanish: "es-ES",
  French: "fr-FR",
  Portuguese: "pt-BR",
  German: "de-DE",
  Swahili: "sw",
  Chinese: "zh-CN",
  Russian: "ru-RU",
  Arabic: "ar-SA",
};

export class BibleAudioNarrator {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPaused = false;
  private isPlaying = false;
  private currentVerseIndex = -1;
  private versesToSpeak: string[] = [];
  private onVerseChangeCallback?: (index: number) => void;
  private onFinishedCallback?: () => void;
  private playbackRate = 1.0;
  private languageCode = "en-US";

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return !!this.synth;
  }

  public setRate(rate: number) {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setLanguageByString(langString: string) {
    for (const [key, code] of Object.entries(LANGUAGE_VOICE_MAP)) {
      if (langString.toLowerCase().includes(key.toLowerCase())) {
        this.languageCode = code;
        return;
      }
    }
    this.languageCode = "en-US";
  }

  public startNarration(
    verses: string[],
    startIndex = 0,
    onVerseChange?: (index: number) => void,
    onFinished?: () => void
  ) {
    if (!this.synth) return;
    this.stop();

    this.versesToSpeak = verses;
    this.currentVerseIndex = startIndex;
    this.onVerseChangeCallback = onVerseChange;
    this.onFinishedCallback = onFinished;
    this.isPlaying = true;
    this.isPaused = false;

    this.speakCurrent();
  }

  private speakCurrent() {
    if (!this.synth) return;
    if (this.currentVerseIndex < 0 || this.currentVerseIndex >= this.versesToSpeak.length) {
      this.stop();
      this.onFinishedCallback?.();
      return;
    }

    const text = this.versesToSpeak[this.currentVerseIndex];
    this.onVerseChangeCallback?.(this.currentVerseIndex);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.playbackRate;
    utterance.lang = this.languageCode;

    utterance.onend = () => {
      if (!this.isPlaying) return;
      this.currentVerseIndex++;
      this.speakCurrent();
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e);
      if (this.isPlaying) {
        this.currentVerseIndex++;
        this.speakCurrent();
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public pause() {
    if (!this.synth) return;
    this.synth.pause();
    this.isPaused = true;
  }

  public resume() {
    if (!this.synth) return;
    this.synth.resume();
    this.isPaused = false;
  }

  public stop() {
    if (!this.synth) return;
    this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentVerseIndex = -1;
    this.currentUtterance = null;
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentVerseIndex: this.currentVerseIndex,
    };
  }
}

export const bibleNarrator = new BibleAudioNarrator();

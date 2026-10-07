// Mobile Bible Audio Narration via expo-speech

let Speech: any = null;
try {
  Speech = require('expo-speech');
} catch {
  // Graceful fallback if expo-speech is not yet installed in dev
}

const LANGUAGE_VOICE_MAP: Record<string, string> = {
  English: 'en-US',
  Spanish: 'es-ES',
  French: 'fr-FR',
  Portuguese: 'pt-BR',
  German: 'de-DE',
  Swahili: 'sw',
  Chinese: 'zh-CN',
  Russian: 'ru-RU',
  Arabic: 'ar-SA',
};

export class MobileAudioNarrator {
  private isPlaying = false;
  private isPaused = false;
  private currentVerseIndex = -1;
  private versesToSpeak: string[] = [];
  private onVerseChangeCallback?: (index: number) => void;
  private onFinishedCallback?: () => void;
  private playbackRate = 1.0;
  private languageCode = 'en-US';

  public isSupported(): boolean {
    return !!Speech && typeof Speech.speak === 'function';
  }

  public setRate(rate: number) {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setLanguage(lang: string) {
    for (const [key, code] of Object.entries(LANGUAGE_VOICE_MAP)) {
      if (lang.toLowerCase().includes(key.toLowerCase())) {
        this.languageCode = code;
        return;
      }
    }
    this.languageCode = 'en-US';
  }

  public startNarration(
    verses: string[],
    startIndex = 0,
    onVerseChange?: (index: number) => void,
    onFinished?: () => void
  ) {
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
    if (!this.isPlaying) return;
    if (this.currentVerseIndex < 0 || this.currentVerseIndex >= this.versesToSpeak.length) {
      this.stop();
      this.onFinishedCallback?.();
      return;
    }

    const text = this.versesToSpeak[this.currentVerseIndex];
    this.onVerseChangeCallback?.(this.currentVerseIndex);

    if (Speech && typeof Speech.speak === 'function') {
      Speech.speak(text, {
        language: this.languageCode,
        rate: this.playbackRate,
        onDone: () => {
          if (!this.isPlaying || this.isPaused) return;
          this.currentVerseIndex++;
          this.speakCurrent();
        },
        onError: (err: any) => {
          console.warn('[MobileAudio] Speech error:', err);
          if (this.isPlaying) {
            this.currentVerseIndex++;
            this.speakCurrent();
          }
        },
      });
    } else {
      console.warn('[MobileAudio] expo-speech is not available');
      this.stop();
    }
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPaused = true;
    if (Speech && typeof Speech.pause === 'function') {
      Speech.pause();
    } else {
      this.stop();
    }
  }

  public resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    if (Speech && typeof Speech.resume === 'function') {
      Speech.resume();
    } else {
      this.speakCurrent();
    }
  }

  public stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentVerseIndex = -1;
    if (Speech && typeof Speech.stop === 'function') {
      Speech.stop();
    }
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentVerseIndex: this.currentVerseIndex,
    };
  }
}

export const mobileNarrator = new MobileAudioNarrator();

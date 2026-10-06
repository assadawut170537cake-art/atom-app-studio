/**
 * Audio playback and speech synthesis utility for ATOM
 */

export type VoiceEmotion = 'neutral' | 'happy' | 'serious' | 'alert';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  desc: string;
}

export const ATOM_VOICES: VoiceOption[] = [
  { id: 'Puck', name: 'Puck (หนุ่มมั่นใจ - ATOM)', gender: 'male', desc: 'เสียงหนุ่มคล่องแคล่ว ทันสมัย เป็นธรรมชาติ (แนะนำ)' },
  { id: 'Fenrir', name: 'Fenrir (ดุดัน สุขุม)', gender: 'male', desc: 'เสียงทุ้มลึก มั่นคง ทรงพลัง' },
  { id: 'Charon', name: 'Charon (ผู้ใหญ่ สุภาพ)', gender: 'male', desc: 'เสียงสุขุม นิ่ง ลุ่มลึก น่าเชื่อถือ' },
  { id: 'Kore', name: 'Kore (นุ่มนวล เป็นมิตร)', gender: 'female', desc: 'เสียงหวานใส อ่อนโยน ฟังเพลิน' },
  { id: 'Zephyr', name: 'Zephyr (สดใส กระฉับกระเฉง)', gender: 'female', desc: 'เสียงสดใส มีพลัง แอคทีฟ' },
];

class AtomAudioService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private listeners: ((speaking: boolean, audioProgress?: number) => void)[] = [];
  private progressInterval: any = null;

  public subscribe(callback: (speaking: boolean, audioProgress?: number) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(speaking: boolean, progress: number = 0) {
    this.isSpeaking = speaking;
    this.listeners.forEach((cb) => cb(speaking, progress));
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Stop any ongoing speech (audio element or browser speech synthesis)
   */
  public stop() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {
        // ignore
      }
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
      this.currentUtterance = null;
    }

    this.notify(false, 0);
  }

  /**
   * Play Gemini Neural TTS audio (WAV data URL)
   */
  public async playAudioDataUrl(audioUrl: string): Promise<boolean> {
    this.stop();

    return new Promise((resolve) => {
      try {
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;

        audio.onplay = () => {
          this.notify(true, 0);
          this.progressInterval = setInterval(() => {
            if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
              const progress = (audio.currentTime / audio.duration) * 100;
              this.notify(true, progress);
            }
          }, 100);
        };

        audio.onended = () => {
          this.stop();
          resolve(true);
        };

        audio.onerror = (err) => {
          console.warn('Audio playback error:', err);
          this.stop();
          resolve(false);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Audio autoplay was prevented or failed:', err);
            this.stop();
            resolve(false);
          });
        }
      } catch (e) {
        console.warn('Failed to initialize Audio:', e);
        this.stop();
        resolve(false);
      }
    });
  }

  /**
   * Browser SpeechSynthesis Fallback for Thai with Emotion Modulations
   */
  public playBrowserSpeech(
    text: string,
    voiceGender: 'male' | 'female' = 'male',
    emotion: VoiceEmotion = 'neutral'
  ): Promise<boolean> {
    this.stop();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      try {
        // Clean speech text
        const cleanText = text
          .replace(/```[\s\S]*?```/g, ' ตัวอย่างโค้ดแสดงบนหน้าจอครับ ')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/#{1,6}\s+/g, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/\s+/g, ' ')
          .trim();

        if (!cleanText) {
          resolve(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        this.currentUtterance = utterance;

        utterance.lang = 'th-TH';

        // Apply emotional modulation to rate & pitch
        let rate = 1.03;
        let pitch = voiceGender === 'male' ? 0.95 : 1.1;

        if (emotion === 'happy') {
          rate = 1.09;
          pitch = voiceGender === 'male' ? 1.04 : 1.18;
        } else if (emotion === 'serious') {
          rate = 0.98;
          pitch = voiceGender === 'male' ? 0.90 : 1.02;
        } else if (emotion === 'alert') {
          rate = 1.15;
          pitch = voiceGender === 'male' ? 1.03 : 1.15;
        }

        utterance.rate = rate;
        utterance.pitch = pitch;

        // Try to find the best Thai voice
        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find((v) => v.lang.includes('th') || v.lang.includes('TH'));
        if (thaiVoice) {
          utterance.voice = thaiVoice;
        }

        utterance.onstart = () => {
          this.notify(true, 50);
        };

        utterance.onend = () => {
          this.stop();
          resolve(true);
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          this.stop();
          resolve(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis invocation failed:', err);
        this.stop();
        resolve(false);
      }
    });
  }

  /**
   * Play high-tech UI audio effects (beeps / alerts / wake chimes / titan transitions) via Web Audio API
   */
  public playSoundEffect(type: 'beep' | 'start-listen' | 'stop-listen' | 'response' | 'error' | 'alert' | 'wake' | 'titan-atom' | 'titan-friday' | 'titan-ultron' | 'handoff') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'titan-atom') {
        // Bright cyan cyber chime (A.T.O.M. Dynamic Front)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.16); // D6
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'titan-friday') {
        // Velvety emerald harmonic chord (F.R.I.D.A.Y. Tactical Architect)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'titan-ultron') {
        // Aggressive crimson cyber pulse (U.L.T.R.O.N. Heavy Coder)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220.00, now); // A3
        osc.frequency.exponentialRampToValueAtTime(440.00, now + 0.08); // A4
        osc.frequency.exponentialRampToValueAtTime(165.00, now + 0.22); // E3
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'handoff') {
        // Swift warp tone for Handoff Protocol
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'wake') {
        // High-tech ascending wake chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.07);
        osc.frequency.setValueAtTime(783.99, now + 0.14);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'start-listen') {
        // High-tech ascending chirp (ATOM listening)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'stop-listen') {
        // High-tech descending tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'response') {
        // Subtle futuristic dual chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'alert' || type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      // AudioContext may be restricted by browser gesture
    }
  }
}

export const atomAudio = new AtomAudioService();
// Legacy alias for backward compat
export const jarvisAudio = atomAudio;
export const JARVIS_VOICES = ATOM_VOICES;

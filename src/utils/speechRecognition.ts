/**
 * Speech Recognition Service with live Thai STT and audio recording fallback
 */

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export class JarvisSpeechService {
  private recognition: any = null;
  private wakeWordRecognition: any = null;
  private isWakeWordActive = false;
  private isListening = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false; // single phrase or till silence
        this.recognition.interimResults = true;
        this.recognition.lang = 'th-TH'; // Thai language
        this.recognition.maxAlternatives = 1;
      }
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public isSupported(): boolean {
    return !!this.recognition || !!(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia);
  }

  public hasNativeRecognition(): boolean {
    return !!this.recognition;
  }

  public getIsWakeWordActive(): boolean {
    return this.isWakeWordActive;
  }

  /**
   * Listen in background for "หวัดดีอะตอม" or "เฮ้อะตอม" to wake up ATOM
   */
  public startWakeWordListener(onWake: () => void) {
    if (this.isWakeWordActive || typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      this.wakeWordRecognition = new SpeechRecognition();
      this.wakeWordRecognition.continuous = true;
      this.wakeWordRecognition.interimResults = true;
      this.wakeWordRecognition.lang = 'th-TH';

      this.wakeWordRecognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = (event.results[i][0].transcript || '').toLowerCase();
          if (
            text.includes('หวัดดีอะตอม') ||
            text.includes('สวัสดีอะตอม') ||
            text.includes('เฮ้อะตอม') ||
            text.includes('อะตอม') ||
            text.includes('hey atom') ||
            text.includes('hello atom')
          ) {
            this.stopWakeWordListener();
            onWake();
            break;
          }
        }
      };

      this.wakeWordRecognition.onend = () => {
        if (this.isWakeWordActive && !this.isListening) {
          try {
            this.wakeWordRecognition.start();
          } catch (e) {}
        }
      };

      this.isWakeWordActive = true;
      this.wakeWordRecognition.start();
    } catch (e) {
      console.warn('Wake word start notice:', e);
    }
  }

  public stopWakeWordListener() {
    this.isWakeWordActive = false;
    if (this.wakeWordRecognition) {
      try {
        this.wakeWordRecognition.stop();
      } catch (e) {}
    }
  }

  /**
   * Start listening using Web Speech API (with MediaRecorder backup)
   */
  public start(handlers: SpeechRecognitionHandlers) {
    if (this.isListening) {
      this.stop();
      return;
    }

    if (this.recognition) {
      try {
        let finalTranscript = '';

        this.recognition.onstart = () => {
          this.isListening = true;
          handlers.onStart?.();
        };

        this.recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interim += transcript;
            }
          }
          handlers.onResult?.(finalTranscript || interim, !!finalTranscript);
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Speech recognition error event:', event.error);
          this.isListening = false;
          if (event.error === 'not-allowed') {
            handlers.onError?.('กรุณาอนุญาตให้เข้าถึงไมโครโฟนในเบราว์เซอร์ครับบอส');
          } else if (event.error !== 'no-speech') {
            handlers.onError?.(`เกิดข้อผิดพลาดของไมโครโฟน: ${event.error}`);
          }
          handlers.onEnd?.();
        };

        this.recognition.onend = () => {
          this.isListening = false;
          handlers.onEnd?.();
        };

        this.recognition.start();
      } catch (err: any) {
        console.warn('Failed to start recognition, falling back to audio recorder:', err);
        this.startAudioRecording(handlers);
      }
    } else {
      // Fallback to MediaRecorder audio capture
      this.startAudioRecording(handlers);
    }
  }

  public stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Fallback: record audio with MediaRecorder and transcribe via backend
   */
  private async startAudioRecording(handlers: SpeechRecognitionHandlers) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      const recorder = new MediaRecorder(stream);
      this.mediaRecorder = recorder;

      recorder.onstart = () => {
        this.isListening = true;
        handlers.onStart?.();
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        this.isListening = false;
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        if (audioBlob.size > 1000) {
          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            try {
              handlers.onResult?.('กำลังถอดความเสียง...', false);
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioData: base64data, mimeType: 'audio/webm' }),
              });
              const data = await res.json();
              if (data.transcript) {
                handlers.onResult?.(data.transcript, true);
              }
            } catch (err: any) {
              handlers.onError?.('ไม่สามารถถอดความเสียงได้ครับบอส');
            } finally {
              handlers.onEnd?.();
            }
          };
        } else {
          handlers.onEnd?.();
        }
      };

      recorder.start();
    } catch (err: any) {
      this.isListening = false;
      console.error('Audio recording permission error:', err);
      handlers.onError?.('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาตรวจสอบสิทธิ์การใช้งานไมโครโฟนครับ');
      handlers.onEnd?.();
    }
  }
}

export const jarvisSpeech = new JarvisSpeechService();

/**
 * Streaming Speech Engine for ATOM (อะตอม)
 * Provides real-time sentence-by-sentence streaming voice playback
 * Matching the energetic, loyal Thai voice persona from the video demo.
 */

import { atomAudio, VoiceEmotion } from './audio';
import { CorePersona } from '../components/JarvisOrb';

export class StreamingSpeechEngine {
  private sentenceQueue: string[] = [];
  private isSpeaking = false;
  private currentEmotion: VoiceEmotion = 'happy';
  private currentPersona: CorePersona = 'atom';
  private buffer = '';
  private onStateChange?: (speaking: boolean) => void;
  private voicePitch = 1.05; // Slightly youthful, energetic Thai voice
  private voiceRate = 1.12;  // Quick, responsive conversational tempo like in the video

  constructor() {
    // initialize
  }

  public setCallbacks(onStateChange: (speaking: boolean) => void) {
    this.onStateChange = onStateChange;
  }

  public setPersona(persona: CorePersona) {
    this.currentPersona = persona;
    this.applyPersonaAndEmotionSettings();
  }

  public setEmotion(emotion: VoiceEmotion) {
    this.currentEmotion = emotion;
    this.applyPersonaAndEmotionSettings();
  }

  private applyPersonaAndEmotionSettings() {
    let basePitch = 1.05;
    let baseRate = 1.12;

    if (this.currentPersona === 'ultron') {
      basePitch = 0.90; // Deeper, robotic and authoritative
      baseRate = 1.18;  // Faster, sharp
    } else if (this.currentPersona === 'friday') {
      basePitch = 1.02; // Calm, poised, clear
      baseRate = 1.05;  // Deliberate, architectural
    } else {
      basePitch = 1.06; // Youthful, loyal, energetic
      baseRate = 1.14;  // Fast conversational
    }

    switch (this.currentEmotion) {
      case 'happy':
        this.voicePitch = basePitch * 1.04;
        this.voiceRate = baseRate * 1.05;
        break;
      case 'serious':
        this.voicePitch = basePitch * 0.94;
        this.voiceRate = baseRate * 0.96;
        break;
      case 'alert':
        this.voicePitch = basePitch * 1.08;
        this.voiceRate = baseRate * 1.10;
        break;
      case 'neutral':
      default:
        this.voicePitch = basePitch;
        this.voiceRate = baseRate;
        break;
    }
  }

  /**
   * Reset the stream buffer for a new conversation turn
   */
  public startNewStream(emotion: VoiceEmotion = 'happy', persona: CorePersona = 'atom') {
    this.stop();
    this.buffer = '';
    this.sentenceQueue = [];
    this.currentPersona = persona;
    this.setEmotion(emotion);
  }

  /**
   * Feed a stream chunk of text
   */
  public feedChunk(chunk: string) {
    this.buffer += chunk;

    // Filter out code blocks from being buffered for speech
    let speakable = this.buffer;

    // If inside a code block, skip until it closes
    if (speakable.includes('```')) {
      const parts = speakable.split('```');
      // If odd number of parts, we are currently inside a code block
      if (parts.length % 2 === 0) {
        // currently inside code block, don't speak this part yet
        return;
      }
    }

    // Check for sentence delimiters in Thai & English: \n, !, ?, ., หรือคำลงท้าย
    // Common sentence ends: \n+, [!?.]+, "ครับ\n", "ครับบอส\n", "เลยครับ "
    const sentenceEndRegex = /([.!?\n]+|\s*(?:ครับบอส|ครับ|เลยครับ|นะครับ|นะคะ|ครับผม)[,\s\n]+)/;
    let match = sentenceEndRegex.exec(this.buffer);

    while (match) {
      const splitIdx = match.index + match[0].length;
      const sentence = this.buffer.substring(0, splitIdx).trim();
      this.buffer = this.buffer.substring(splitIdx);

      const cleaned = this.cleanSentenceForVoice(sentence);
      if (cleaned && cleaned.length >= 2) {
        this.sentenceQueue.push(cleaned);
        this.processQueue();
      }

      match = sentenceEndRegex.exec(this.buffer);
    }
  }

  /**
   * Called when text generation completes to flush any remaining text
   */
  public finishStream() {
    if (this.buffer.trim()) {
      const cleaned = this.cleanSentenceForVoice(this.buffer.trim());
      if (cleaned && cleaned.length >= 2) {
        this.sentenceQueue.push(cleaned);
        this.processQueue();
      }
      this.buffer = '';
    }
  }

  /**
   * Voice Barge-In / Interruption: Stops all current speech immediately
   */
  public stop() {
    this.sentenceQueue = [];
    this.buffer = '';
    this.isSpeaking = false;
    atomAudio.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.onStateChange?.(false);
  }

  private cleanSentenceForVoice(raw: string): string {
    return raw
      .replace(/^\[EMOTION:\s*(happy|serious|alert|neutral)\]/gi, '')
      .replace(/```[\s\S]*?```/g, 'ดูตัวอย่างโค้ดบนหน้าจอได้เลยครับบอส')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~]/g, '')
      .replace(/https?:\/\/\S+/g, 'ลิงก์บนหน้าจอครับ')
      .replace(/[\(\)\[\]\{\}]/g, ' ')
      .trim();
  }

  private async processQueue() {
    if (this.isSpeaking || this.sentenceQueue.length === 0) {
      return;
    }

    this.isSpeaking = true;
    this.onStateChange?.(true);

    const sentence = this.sentenceQueue.shift()!;

    try {
      await this.speakSentence(sentence);
    } catch (err) {
      console.warn('Speech queue item error:', err);
    } finally {
      this.isSpeaking = false;
      if (this.sentenceQueue.length > 0) {
        this.processQueue();
      } else {
        this.onStateChange?.(false);
      }
    }
  }

  private speakSentence(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel(); // Clear any hung utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = this.voiceRate;
      utterance.pitch = this.voicePitch;

      // Select natural Thai voice if available
      const voices = window.speechSynthesis.getVoices();
      const thaiVoice =
        voices.find((v) => v.lang.startsWith('th') && (v.name.includes('Male') || v.name.includes('Niwat') || v.name.includes('Natural'))) ||
        voices.find((v) => v.lang.startsWith('th')) ||
        voices.find((v) => v.name.includes('Thai'));

      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('Utterance speech error:', e);
        resolve();
      };

      // Fallback timeout in case browser TTS event doesn't fire
      const safetyTimeout = setTimeout(() => {
        resolve();
      }, Math.max(1500, text.length * 120));

      utterance.onend = () => {
        clearTimeout(safetyTimeout);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const streamingSpeech = new StreamingSpeechEngine();

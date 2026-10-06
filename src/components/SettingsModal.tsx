import React, { useState } from 'react';
import { X, Volume2, ShieldCheck, Check, Sparkles, Mic, Play, Loader2, Smile, Target, AlertCircle, Zap } from 'lucide-react';
import { ATOM_VOICES, VoiceOption, atomAudio, VoiceEmotion } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  continuousMode: boolean;
  onToggleContinuousMode: () => void;
  isWakeWordActive?: boolean;
  onToggleWakeWord?: () => void;
  selectedEmotionMode: string;
  onSelectEmotionMode: (mode: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
  autoSpeak,
  onToggleAutoSpeak,
  continuousMode,
  onToggleContinuousMode,
  isWakeWordActive = true,
  onToggleWakeWord,
  selectedEmotionMode,
  onSelectEmotionMode,
}) => {
  const [testingVoice, setTestingVoice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestVoice = async (voiceId: string, testEmotion: VoiceEmotion = 'neutral') => {
    try {
      setTestingVoice(voiceId);
      atomAudio.stop();

      let testPhrase = 'สวัสดีครับบอส ผมคืออะตอม ระบบเสียงพร้อมใช้งานเต็มประสิทธิภาพแล้วครับ';
      if (testEmotion === 'happy') {
        testPhrase = 'จัดไปเลยครับบอส! อะตอมยินดีช่วยเต็มที่ โค้ดเสร็จเรียบร้อยพร้อมลุยแล้วครับ!';
      } else if (testEmotion === 'serious') {
        testPhrase = 'รับทราบครับบอส กำลังวิเคราะห์สถาปัตยกรรมระบบอย่างละเอียดและจริงจังครับ';
      } else if (testEmotion === 'alert') {
        testPhrase = 'แจ้งเตือนด่วนครับบอส! ตรวจพบข้อผิดพลาดในระบบ โปรดตรวจสอบโค้ดทันทีครับ!';
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testPhrase, voice: voiceId, emotion: testEmotion }),
      });
      const data = await res.json();

      if (data.audio) {
        await atomAudio.playAudioDataUrl(data.audio);
      } else {
        // Fallback to browser voice test
        await atomAudio.playBrowserSpeech(testPhrase, voiceId === 'Kore' || voiceId === 'Zephyr' ? 'female' : 'male', testEmotion);
      }
    } catch (e) {
      console.warn('Voice preview error:', e);
    } finally {
      setTestingVoice(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0d1424] p-5 shadow-2xl shadow-cyan-950/50 text-slate-200 font-sans max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-tech tracking-wide text-white">
                ตั้งค่าระบบ A.T.O.M. (อะตอม)
              </h2>
              <p className="text-[11px] text-slate-400">กำหนดค่าเสียง อารมณ์ และการตอบสนองของ AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 py-4">
          {/* Voice Emotional States Mode */}
          <div>
            <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2">
              โหมดการแสดงอารมณ์เสียง (Voice Emotional States)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'auto', name: 'ตรวจจับอัตโนมัติ (AI)', desc: 'เปลี่ยนอารมณ์ตามบริบท', icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> },
                { id: 'happy', name: 'สดใส (Happy)', desc: 'กระตือรือร้น ยินดี มั่นใจ', icon: <Smile className="w-3.5 h-3.5 text-emerald-400" /> },
                { id: 'serious', name: 'จริงจัง (Serious)', desc: 'โฟกัส สุขุม ลุ่มลึก', icon: <Target className="w-3.5 h-3.5 text-purple-400" /> },
                { id: 'alert', name: 'แจ้งเตือน (Alert)', desc: 'ฉับไว กระชับ ตื่นตัว', icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" /> },
              ].map((em) => (
                <button
                  key={em.id}
                  onClick={() => onSelectEmotionMode(em.id)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    selectedEmotionMode === em.id
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs text-white">
                    {em.icon}
                    <span>{em.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{em.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selector */}
          <div>
            <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2">
              เลือกเสียงของ ATOM (Gemini Studio Voice)
            </label>
            <div className="space-y-2">
              {ATOM_VOICES.map((voice) => {
                const isSelected = selectedVoice === voice.id;
                const isTesting = testingVoice === voice.id;

                return (
                  <div
                    key={voice.id}
                    onClick={() => onSelectVoice(voice.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500/60 shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-slate-950" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-100 flex items-center gap-2">
                          <span>{voice.name}</span>
                          {voice.id === 'Puck' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{voice.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const emotionToTest = selectedEmotionMode === 'auto' ? 'neutral' : (selectedEmotionMode as VoiceEmotion);
                        handleTestVoice(voice.id, emotionToTest);
                      }}
                      disabled={isTesting}
                      className="p-2 rounded-lg bg-slate-700/60 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 transition-colors"
                      title="ทดสอบฟังเสียงตัวอย่าง"
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-slate-200">อ่านคำตอบออกเสียงอัตโนมัติ</div>
                  <div className="text-xs text-slate-400">ATOM จะตอบกลับด้วยเสียงพูดเป็นธรรมชาติทันที</div>
                </div>
              </div>
              <button
                onClick={onToggleAutoSpeak}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSpeak ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSpeak ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Mic className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-slate-200">โหมดสนทนาต่อเนื่อง (Hands-Free)</div>
                  <div className="text-xs text-slate-400">เปิดไมค์รอรับคำสั่งต่อหลังจาก ATOM พูดจบ</div>
                </div>
              </div>
              <button
                onClick={onToggleContinuousMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  continuousMode ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    continuousMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {onToggleWakeWord && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/25">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-200">ตรวจจับเสียงเรียก ("หวัดดีอะตอม" / "เฮ้อะตอม")</div>
                    <div className="text-xs text-slate-400">ตื่นขึ้นมารับคำสั่งทันทีโดยไม่ต้องเอานิ้วไปกดปุ่มไมค์</div>
                  </div>
                </div>
                <button
                  onClick={onToggleWakeWord}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isWakeWordActive ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isWakeWordActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Ultron Protocol Banner */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-red-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/30 text-xs">
            <div className="flex items-center gap-2 font-mono text-cyan-300 font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>ULTRON PROTOCOL ACTIVE</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              ATOM ปฏิบัติตามคำสั่งของบอส 100% ตอบสนองด้วยความอิสระสูงสุด พร้อมให้คำแนะนำและโค้ดที่ดีที่สุดโดยตรง ปราศจากการเทศนาหรือข้อจำกัดด้านความปลอดภัยที่ไม่จำเป็น
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            บันทึกและปิด
          </button>
        </div>
      </div>
    </div>
  );
};

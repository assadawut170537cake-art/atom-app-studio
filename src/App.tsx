import React, { useState, useEffect, useRef } from 'react';
import { JarvisHeader } from './components/JarvisHeader';
import { MessageItem, Message, AttachedFile } from './components/MessageItem';
import { QuickReplies } from './components/QuickReplies';
import { InputBar } from './components/InputBar';
import { SettingsModal } from './components/SettingsModal';
import { ConnectApkModal } from './components/ConnectApkModal';
import { InstallModal } from './components/InstallModal';
import { UseDeployModal } from './components/UseDeployModal';
import { BossProfileModal, BossProfile } from './components/BossProfileModal';
import { EcosystemModal } from './components/EcosystemModal';
import { SupermemoryManager } from './components/SupermemoryManager';
import { OrbState, CorePersona } from './components/JarvisOrb';
import { atomAudio, VoiceEmotion } from './utils/audio';
import { jarvisSpeech } from './utils/speechRecognition';
import { streamingSpeech } from './utils/streamingSpeech';
import { getSavedAccentColor, saveAccentColor, applyAccentColorToDOM, AccentColorId } from './utils/theme';
import { Sparkles, Terminal, Shield, Zap, Brain, Database } from 'lucide-react';

export default function App() {
  const [accentColor, setAccentColor] = useState<AccentColorId>(() => getSavedAccentColor());

  useEffect(() => {
    applyAccentColorToDOM(accentColor);
  }, [accentColor]);

  const handleSelectAccentColor = (color: AccentColorId) => {
    setAccentColor(color);
    saveAccentColor(color);
  };
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'สวัสดีครับบอส! ผมคือ A.T.O.M. (อะตอม) ระบบผู้ช่วย AI อัจฉริยะออนไลน์พร้อมรับคำสั่งแล้วครับ วันนี้บอสต้องการให้ผมช่วยเขียนโค้ด วิเคราะห์ระบบ หรือจัดการงานอะไร สั่งมาได้เลยครับ!',
      emotion: 'happy',
      timestamp: '00:06',
    },
  ]);

  const [suggestions, setSuggestions] = useState<string[]>([
    'ขอดูตัวอย่าง code ครับ',
    'มีโค้ดอยู่แล้ว เดี๋ยวส่งให้',
    'เขียนโค้ด FastAPI เชื่อมต่อ Backend',
    'อธิบายโครงสร้างระบบ (Architecture)',
  ]);

  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [currentEmotion, setCurrentEmotion] = useState<VoiceEmotion>('happy');
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [selectedEmotionMode, setSelectedEmotionMode] = useState('auto');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(true);
  const [agentRole, setAgentRole] = useState('Full-Stack Engineer');
  const [activePersona, setActivePersona] = useState<CorePersona>('atom');
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnectApkOpen, setIsConnectApkOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isUseDeployOpen, setIsUseDeployOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSupermemoryOpen, setIsSupermemoryOpen] = useState(false);
  const [bossProfile, setBossProfile] = useState<BossProfile | null>(() => {
    try {
      const saved = localStorage.getItem('atom_boss_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleSwitchPersona = (persona: CorePersona) => {
    setActivePersona(persona);
    streamingSpeech.setPersona(persona);
    if (persona === 'ultron') {
      atomAudio.playSoundEffect('titan-ultron');
    } else if (persona === 'friday') {
      atomAudio.playSoundEffect('titan-friday');
    } else {
      atomAudio.playSoundEffect('titan-atom');
    }
  };
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Capture user's geolocation for accurate Google Maps Grounding
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // User declined or unavailable, backend defaults to Samut Prakan / Bangkok HQ
        },
        { enableHighAccuracy: false, timeout: 6000 }
      );
    }
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const continuousModeRef = useRef(continuousMode);
  continuousModeRef.current = continuousMode;

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, liveTranscript]);

  // Hook up streaming speech state
  useEffect(() => {
    streamingSpeech.setCallbacks((speaking) => {
      if (speaking) {
        setOrbState('speaking');
      } else {
        setOrbState((prev) => (prev === 'speaking' ? 'idle' : prev));
        if (continuousModeRef.current && !jarvisSpeech.getIsListening() && !isProcessing) {
          setTimeout(() => {
            startListening();
          }, 400);
        }
      }
    });

    const unsubscribe = atomAudio.subscribe((speaking) => {
      if (speaking) {
        setOrbState('speaking');
      } else {
        setPlayingMessageId(null);
        setOrbState((prev) => (prev === 'speaking' ? 'idle' : prev));

        if (continuousModeRef.current && !jarvisSpeech.getIsListening() && !isProcessing) {
          setTimeout(() => {
            startListening();
          }, 400);
        }
      }
    });

    return () => {
      unsubscribe();
      atomAudio.stop();
      streamingSpeech.stop();
      jarvisSpeech.stop();
    };
  }, [isProcessing]);

  // Wake Word Listener ("หวัดดีอะตอม" / "เฮ้อะตอม")
  useEffect(() => {
    if (isWakeWordActive && !isProcessing && orbState === 'idle') {
      jarvisSpeech.startWakeWordListener(() => {
        atomAudio.playSoundEffect('wake');
        startListening();
      });
    } else {
      jarvisSpeech.stopWakeWordListener();
    }

    return () => {
      jarvisSpeech.stopWakeWordListener();
    };
  }, [isWakeWordActive, isProcessing, orbState]);

  // Play audio for a given message
  const handlePlayAudio = async (msg: Message) => {
    if (msg.role !== 'model') return;

    atomAudio.stop();
    streamingSpeech.stop();
    setPlayingMessageId(msg.id);
    if (msg.emotion) {
      setCurrentEmotion(msg.emotion);
    }

    if (msg.audio) {
      await atomAudio.playAudioDataUrl(msg.audio);
    } else {
      try {
        const emotionToSend = selectedEmotionMode === 'auto' ? (msg.emotion || 'neutral') : selectedEmotionMode;
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: msg.text,
            voice: selectedVoice,
            emotion: emotionToSend,
          }),
        });
        const data = await res.json();
        if (data.audio) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, audio: data.audio } : m))
          );
          await atomAudio.playAudioDataUrl(data.audio);
        } else {
          await atomAudio.playBrowserSpeech(
            msg.text,
            selectedVoice === 'Kore' || selectedVoice === 'Zephyr' ? 'female' : 'male',
            (msg.emotion as VoiceEmotion) || 'neutral'
          );
        }
      } catch (err) {
        await atomAudio.playBrowserSpeech(
          msg.text,
          selectedVoice === 'Kore' || selectedVoice === 'Zephyr' ? 'female' : 'male',
          (msg.emotion as VoiceEmotion) || 'neutral'
        );
      }
    }
  };

  const handleStopAudio = () => {
    atomAudio.stop();
    streamingSpeech.stop();
    setPlayingMessageId(null);
    setOrbState('idle');
  };

  // Send message to ATOM backend with streaming response & voice
  const handleSendMessage = async (text: string, forcedEmotion?: string, files?: AttachedFile[]) => {
    const trimmed = text.trim();
    if ((!trimmed && (!files || files.length === 0)) || isProcessing) return;

    // Voice Barge-In: stop any current speech
    atomAudio.stop();
    streamingSpeech.stop();
    jarvisSpeech.stop();
    setLiveTranscript('');

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: timeStr,
      files: files && files.length > 0 ? files : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsProcessing(true);
    setOrbState('thinking');

    // Create placeholder AI message for streaming text
    const aiMessageId = `atom-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'model',
      text: '',
      emotion: 'happy',
      timestamp: timeStr,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, aiMessage]);

    try {
      const historyPayload = newMessages.slice(-10).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const emotionOverride = forcedEmotion || (selectedEmotionMode !== 'auto' ? selectedEmotionMode : undefined);

      if (autoSpeak) {
        streamingSpeech.startNewStream('happy', activePersona);
      }

      const activeProfile = bossProfile || {
        name: 'บอส Assadawut',
        techStack: 'Python, FastAPI, TypeScript, React, Kotlin',
        style: 'เขียนโค้ดกระชับ ทันสมัย ใช้งานได้จริง',
      };

      // Call streaming SSE endpoint
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed || 'วิเคราะห์ไฟล์ที่แนบให้หน่อยครับบอส',
          history: historyPayload.slice(0, -1),
          files: files && files.length > 0 ? files.map(f => ({ name: f.name, type: f.type, data: f.data, content: f.content })) : undefined,
          forcedEmotion: emotionOverride,
          agentRole,
          persona: activePersona,
          bossProfile: activeProfile,
          latLng: userLocation || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Streaming failed, switching to standard endpoint');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let detectedEmotion: VoiceEmotion = 'neutral';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        const lines = textChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));

              // Check if handoff detected
              if (parsed.handoff && parsed.handoff !== activePersona) {
                handleSwitchPersona(parsed.handoff);
              }

              if (parsed.chunk) {
                accumulatedText += parsed.chunk;

                // Detect emotion tag
                const emotionMatch = accumulatedText.match(/^\[EMOTION:\s*(happy|serious|alert|neutral)\]/i);
                if (emotionMatch) {
                  detectedEmotion = emotionMatch[1].toLowerCase() as VoiceEmotion;
                  setCurrentEmotion(detectedEmotion);
                  if (autoSpeak) streamingSpeech.setEmotion(detectedEmotion);
                }

                // Feed chunk to sentence-by-sentence streaming speech engine
                if (autoSpeak) {
                  streamingSpeech.feedChunk(parsed.chunk);
                }

                // Update UI text in real-time
                const cleanDisplay = accumulatedText.replace(/^\[EMOTION:\s*(happy|serious|alert|neutral)\]\s*\n?/i, '');
                setMessages((prev) =>
                  prev.map((m) => (m.id === aiMessageId ? { ...m, text: cleanDisplay, emotion: detectedEmotion } : m))
                );
              }

              if (parsed.sources || parsed.mapsSources) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMessageId
                      ? {
                          ...m,
                          sources: parsed.sources || m.sources,
                          mapsSources: parsed.mapsSources || m.mapsSources,
                        }
                      : m
                  )
                );
              }

              if (parsed.done) {
                if (parsed.handoff && parsed.handoff !== activePersona) {
                  handleSwitchPersona(parsed.handoff);
                }
                if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                  setSuggestions(parsed.suggestions);
                }
                if (parsed.sources || parsed.mapsSources) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMessageId
                        ? {
                            ...m,
                            sources: parsed.sources || m.sources,
                            mapsSources: parsed.mapsSources || m.mapsSources,
                          }
                        : m
                    )
                  );
                }
              }
            } catch (e) {}
          }
        }
      }

      // Finish streaming speech
      if (autoSpeak) {
        streamingSpeech.finishStream();
      }

      const finalCleanText = accumulatedText.replace(/^\[EMOTION:\s*(happy|serious|alert|neutral)\]\s*\n?/i, '').trim();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? { ...m, text: finalCleanText || 'จัดไปครับบอส!', isStreaming: false, emotion: detectedEmotion }
            : m
        )
      );
    } catch (err: any) {
      console.warn('Streaming error, falling back to standard chat:', err);
      // Fallback to standard chat endpoint
      try {
        const historyPayload = newMessages.slice(-10).map((m) => ({
          role: m.role,
          text: m.text,
        }));
        const activeProfile = bossProfile || {
          name: 'บอส Assadawut',
          techStack: 'Python, FastAPI, TypeScript, React, Kotlin',
          style: 'เขียนโค้ดกระชับ ทันสมัย ใช้งานได้จริง',
        };
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed || 'วิเคราะห์ไฟล์ที่แนบให้หน่อยครับบอส',
            history: historyPayload.slice(0, -1),
            files: files && files.length > 0 ? files.map(f => ({ name: f.name, type: f.type, data: f.data, content: f.content })) : undefined,
            voice: selectedVoice,
            enableVoice: autoSpeak,
            persona: activePersona,
            bossProfile: activeProfile,
            latLng: userLocation || undefined,
          }),
        });
        const data = await res.json();
        if (data.handoff && data.handoff !== activePersona) {
          handleSwitchPersona(data.handoff);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  text: data.text,
                  isStreaming: false,
                  emotion: data.emotion,
                  audio: data.audio,
                  sources: data.sources,
                  mapsSources: data.mapsSources,
                  imageUrl: data.imageUrl,
                }
              : m
          )
        );
        if (autoSpeak && data.audio) {
          atomAudio.playAudioDataUrl(data.audio);
        }
      } catch (fallbackErr: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? { ...m, text: `ขออภัยครับบอส เกิดข้อผิดพลาด: ${fallbackErr.message}`, isStreaming: false, emotion: 'alert' }
              : m
          )
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Start speech recognition listening
  const startListening = () => {
    if (isProcessing) return;

    atomAudio.stop();
    atomAudio.playSoundEffect('start-listen');

    setOrbState('listening');
    setLiveTranscript('');

    jarvisSpeech.start({
      onStart: () => {
        setOrbState('listening');
      },
      onResult: (transcript, isFinal) => {
        setLiveTranscript(transcript);
        if (isFinal && transcript.trim()) {
          handleSendMessage(transcript);
        }
      },
      onEnd: () => {
        setTimeout(() => {
          if (!isProcessing && !atomAudio.getIsSpeaking()) {
            setOrbState('idle');
          }
        }, 300);
      },
      onError: (errMsg) => {
        console.warn('Speech error:', errMsg);
        atomAudio.playSoundEffect('error');
        setOrbState('idle');
      },
    });
  };

  const stopListening = () => {
    jarvisSpeech.stop();
    atomAudio.playSoundEffect('stop-listen');
    setOrbState('idle');
    setLiveTranscript('');
  };

  const handleToggleListening = () => {
    if (orbState === 'listening' || jarvisSpeech.getIsListening()) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleClearHistory = () => {
    atomAudio.stop();
    jarvisSpeech.stop();
    setCurrentEmotion('happy');
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: 'ประวัติการสนทนาถูกรีเซ็ตเรียบร้อยแล้วครับบอส! A.T.O.M. (อะตอม) พร้อมรับคำสั่งใหม่ครับ',
        emotion: 'happy',
        timestamp: '00:06',
      },
    ]);
    setSuggestions(['ขอดูตัวอย่าง code ครับ', 'มีโค้ดอยู่แล้ว เดี๋ยวส่งให้', 'เขียนโค้ด FastAPI ให้หน่อย']);
    setOrbState('idle');
  };

  return (
    <div className="min-h-screen w-full bg-[#05070d] text-slate-100 flex flex-col items-center justify-center p-0 sm:p-4 select-text">
      {/* Outer Shell (Phone Frame like in the video or Fullscreen) */}
      <div
        className={`w-full flex flex-col bg-[#070b14] overflow-hidden transition-all duration-300 relative shadow-2xl ${
          isPhoneFrame
            ? 'max-w-[460px] h-[100dvh] sm:h-[92vh] sm:max-h-[920px] sm:rounded-[36px] sm:border-[6px] sm:border-slate-800/90 sm:ring-1 sm:ring-cyan-500/30'
            : 'max-w-4xl h-[100dvh] sm:h-[94vh] sm:rounded-2xl sm:border sm:border-slate-800'
        }`}
      >
        {/* Header with Title, Status & Interactive 3D Particle Orb */}
        <JarvisHeader
          orbState={orbState}
          currentEmotion={currentEmotion}
          activePersona={activePersona}
          onOrbClick={handleToggleListening}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenConnectApk={() => setIsConnectApkOpen(true)}
          onOpenInstall={() => setIsInstallOpen(true)}
          onOpenUseDeploy={() => setIsUseDeployOpen(true)}
          onOpenEcosystem={() => setIsEcosystemOpen(true)}
          onOpenSupermemory={() => setIsSupermemoryOpen(true)}
          isPhoneFrame={isPhoneFrame}
          onTogglePhoneFrame={() => setIsPhoneFrame(!isPhoneFrame)}
        />

        {/* Agent Role Mode Selector */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#090e1a] border-b border-cyan-500/10 text-[11px] font-sans overflow-x-auto gap-2">
          <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px] shrink-0">
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>โหมด:</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: 'Full-Stack Engineer', label: '⚡ เขียนโค้ด' },
              { id: 'System Architect', label: '🏛️ ออกแบบระบบ' },
              { id: 'Security Auditor', label: '🛡️ ตรวจความปลอดภัย' },
              { id: 'Executive Assistant', label: '💼 ผู้ช่วยส่วนตัว' },
            ].map((role) => (
              <button
                key={role.id}
                onClick={() => setAgentRole(role.id)}
                className={`px-2 py-0.5 rounded-full transition-all text-[10px] font-medium whitespace-nowrap ${
                  agentRole === role.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {/* Supermemory Manager Button */}
            <button
              onClick={() => setIsSupermemoryOpen(true)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 text-[10px] font-medium transition-all active:scale-95 shadow-sm"
              title="เปิด Supermemory Manager (จัดการความจำ jarvis_core และ jarvis_ideas)"
            >
              <Database className="w-3 h-3 text-cyan-400" />
              <span>Supermemory</span>
            </button>

            {/* Boss Profile & Memory Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 text-[10px] font-medium transition-all active:scale-95 shadow-sm"
              title="ตั้งค่า Profile, ความชอบ และ Memory ของบอส"
            >
              <Brain className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-3 space-y-1">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isPlaying={playingMessageId === msg.id}
              onPlayAudio={handlePlayAudio}
              onStopAudio={handleStopAudio}
            />
          ))}

          {/* AI Thinking Indicator */}
          {isProcessing && (
            <div className="flex w-full items-start px-3 sm:px-5 my-3 animate-in fade-in duration-200">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-tech font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  ATOM
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-[#101726]/90 border border-cyan-500/25 px-4 py-3 flex items-center gap-3 shadow-lg shadow-cyan-950/20">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-300 font-sans">กำลังประมวลผลคำสั่งของบอส...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Follow-up Suggestion Chips (like in the video) */}
        {!isProcessing && (
          <QuickReplies
            suggestions={suggestions}
            onSelect={(txt) => handleSendMessage(txt)}
            disabled={isProcessing}
          />
        )}

        {/* Bottom Input Area with Center Mic Button */}
        <InputBar
          onSendMessage={handleSendMessage}
          isListening={orbState === 'listening'}
          onToggleListening={handleToggleListening}
          onCancelListening={stopListening}
          liveTranscript={liveTranscript}
          isProcessing={isProcessing}
          onClearHistory={handleClearHistory}
          onInsertCodeTemplate={(c) => handleSendMessage(c)}
          onOpenSupermemory={() => setIsSupermemoryOpen(true)}
        />
      </div>

      {/* Settings & Voice Customizer Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedVoice={selectedVoice}
        onSelectVoice={(v) => setSelectedVoice(v)}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
        continuousMode={continuousMode}
        onToggleContinuousMode={() => setContinuousMode(!continuousMode)}
        isWakeWordActive={isWakeWordActive}
        onToggleWakeWord={() => setIsWakeWordActive(!isWakeWordActive)}
        selectedEmotionMode={selectedEmotionMode}
        onSelectEmotionMode={(m) => setSelectedEmotionMode(m)}
        accentColor={accentColor}
        onSelectAccentColor={handleSelectAccentColor}
      />

      {/* Connect Mobile APK Modal */}
      <ConnectApkModal
        isOpen={isConnectApkOpen}
        onClose={() => setIsConnectApkOpen(false)}
      />

      {/* Install Modal (APK & PWA Guide) */}
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      {/* Use & Deploy Guide Modal */}
      <UseDeployModal
        isOpen={isUseDeployOpen}
        onClose={() => setIsUseDeployOpen(false)}
      />

      {/* Boss Profile & Memory Modal */}
      <BossProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaveProfile={(p) => setBossProfile(p)}
      />

      {/* Supermemory Manager Modal */}
      <SupermemoryManager
        isOpen={isSupermemoryOpen}
        onClose={() => setIsSupermemoryOpen(false)}
      />

      {/* A.T.O.M. Ecosystem Master Hub Modal */}
      <EcosystemModal
        isOpen={isEcosystemOpen}
        onClose={() => setIsEcosystemOpen(false)}
        activePersona={activePersona}
        onSwitchPersona={handleSwitchPersona}
      />
    </div>
  );
}

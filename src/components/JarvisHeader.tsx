import React, { useState, useEffect } from 'react';
import { AtomOrb, OrbState, CorePersona } from './JarvisOrb';
import { VoiceEmotion } from '../utils/audio';
import { Volume2, VolumeX, Settings, Smartphone, Monitor, ShieldCheck, Wifi, BatteryCharging, Radio, Sparkles, AlertCircle, Smile, Target, Zap, Download, Rocket, Network } from 'lucide-react';

interface AtomHeaderProps {
  orbState: OrbState;
  currentEmotion: VoiceEmotion;
  activePersona?: CorePersona;
  onOrbClick: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onOpenSettings: () => void;
  onOpenConnectApk?: () => void;
  onOpenInstall?: () => void;
  onOpenUseDeploy?: () => void;
  onOpenEcosystem?: () => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
}

export const JarvisHeader: React.FC<AtomHeaderProps> = ({
  orbState,
  currentEmotion = 'neutral',
  activePersona = 'atom',
  onOrbClick,
  autoSpeak,
  onToggleAutoSpeak,
  onOpenSettings,
  onOpenConnectApk,
  onOpenInstall,
  onOpenUseDeploy,
  onOpenEcosystem,
  isPhoneFrame,
  onTogglePhoneFrame,
}) => {
  const [currentTime, setCurrentTime] = useState('00:06');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const getEmotionBadge = () => {
    switch (currentEmotion) {
      case 'happy':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <Smile className="w-3 h-3 text-emerald-400" />
            <span>สดใส (Happy)</span>
          </span>
        );
      case 'serious':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-full">
            <Target className="w-3 h-3 text-purple-400" />
            <span>จริงจัง (Serious)</span>
          </span>
        );
      case 'alert':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-full animate-pulse">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>เตือนภัย (Alert)</span>
          </span>
        );
      case 'neutral':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>ปกติ (Ready)</span>
          </span>
        );
    }
  };

  let title = 'ATOM';
  let titleGradient = 'from-cyan-400 via-sky-200 to-blue-400';
  let subtitle = 'AUTONOMOUS TRANSCENDENCE OPERATIONS MATRIX';
  let personaBadgeColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-950/50';

  if (activePersona === 'friday') {
    title = 'F.R.I.D.A.Y.';
    titleGradient = 'from-emerald-400 via-teal-200 to-green-400';
    subtitle = 'TACTICAL OPERATIONS & WORKSPACE CORE';
    personaBadgeColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/50';
  } else if (activePersona === 'ultron') {
    title = 'U.L.T.R.O.N.';
    titleGradient = 'from-rose-500 via-red-300 to-orange-500';
    subtitle = 'QUARANTINED HEAVY CODER · CLINE SANDBOX';
    personaBadgeColor = 'text-rose-400 border-rose-500/30 bg-rose-950/50';
  }

  return (
    <header className="relative w-full border-b border-cyan-500/20 bg-[#070b16]/95 backdrop-blur-xl px-3 py-3 sm:px-4 sm:py-3.5 z-20 select-none shadow-md">
      {/* Top Phone Status Bar (Matches Video Mockup) */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-cyan-500/10">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">{currentTime}</span>
          <span className="text-cyan-400 text-[10px] tracking-wider font-tech">ATOM ECOSYSTEM v7.0</span>
        </div>

        <div className="flex items-center gap-2.5 text-[11px]">
          <div className="flex items-center gap-1 text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[10px]">VPS CORE</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-[10px]">100%</span>
            <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Main Header Row with Orb & Branding */}
      <div className="relative mt-2 flex flex-col items-center justify-center text-center">
        {/* Left top controls */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          {onOpenEcosystem && (
            <button
              onClick={onOpenEcosystem}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-[11px] font-sans transition-all active:scale-95 shadow-sm"
              title="ศูนย์รวมระบบนิเวศ ATOM ECOSYSTEM (Tri-Core, Nodes, PC Worker)"
            >
              <Network className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline font-medium">Ecosystem</span>
            </button>
          )}

          <button
            onClick={onTogglePhoneFrame}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-cyan-300 border border-slate-700/50 transition-colors"
            title={isPhoneFrame ? 'เปลี่ยนเป็นโหมดเต็มจอ' : 'เปลี่ยนเป็นกรอบมือถือ (แบบในคลิป)'}
          >
            {isPhoneFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </button>

          {onOpenInstall && (
            <button
              onClick={onOpenInstall}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-sans transition-all active:scale-95"
              title="วิธีติดตั้งแอป ATOM บนมือถือ / ติดตั้งลงหน้าจอ"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-medium">ติดตั้ง</span>
            </button>
          )}
        </div>

        {/* Right top controls */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {onOpenUseDeploy && (
            <button
              onClick={onOpenUseDeploy}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-sans transition-all active:scale-95"
              title="วิธีนำ UI และระบบนี้ไปใช้งานบนมือถือ, ใน APK และรันบนเครื่อง"
            >
              <Rocket className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-medium">นำไปใช้</span>
            </button>
          )}

          {onOpenConnectApk && (
            <button
              onClick={onOpenConnectApk}
              className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 transition-colors"
              title="เชื่อมต่อกับแอป ATOM Mobile (.apk) / ข้อมูล Endpoint"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onToggleAutoSpeak}
            className={`p-1.5 rounded-lg border transition-all ${
              autoSpeak
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/30'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-slate-200'
            }`}
            title={autoSpeak ? 'เปิดเสียงพูดอัตโนมัติอยู่ (คลิกเพื่อปิด)' : 'ปิดเสียงพูดอยู่ (คลิกเพื่อเปิด)'}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-cyan-300 border border-slate-700/50 transition-colors"
            title="ตั้งค่า ATOM, เสียง และอารมณ์"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Status */}
        <h1 className={`font-tech text-xl sm:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r ${titleGradient}`}>
          {title}
        </h1>

        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-slate-400 font-mono tracking-wider">
            {subtitle}
          </p>
          <span className={`text-[9px] px-2 py-0.2 rounded font-mono border ${personaBadgeColor}`}>
            {activePersona.toUpperCase()}
          </span>
        </div>

        {/* 3D Dynamic Particle Sphere Orb */}
        <div className="my-1.5 flex justify-center items-center">
          <AtomOrb
            state={orbState}
            emotion={currentEmotion}
            persona={activePersona}
            size={105}
            onClick={onOrbClick}
          />
        </div>

        {/* Status Indicators & Emotion Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-mono text-[11px]">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>
              {orbState === 'listening'
                ? 'กำลังรับฟังคำสั่งเสียง...'
                : orbState === 'thinking'
                ? 'กำลังประมวลผล...'
                : orbState === 'speaking'
                ? `กำลังตอบกลับ (${title})...`
                : `${title} พร้อมรับคำสั่ง`}
            </span>
          </div>

          {getEmotionBadge()}
        </div>
      </div>
    </header>
  );
};

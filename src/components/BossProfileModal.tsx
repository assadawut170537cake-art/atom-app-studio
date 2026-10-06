import React, { useState, useEffect } from 'react';
import { X, User, Cpu, Sparkles, Save, Check, Brain, Code2, Layers, BookOpen, Trash2 } from 'lucide-react';

export interface BossProfile {
  name: string;
  favLanguages: string[];
  techStack: string;
  codingStyle: string;
  currentProject: string;
  customDirectives: string;
}

const DEFAULT_PROFILE: BossProfile = {
  name: 'บอส Assadawut',
  favLanguages: ['Python', 'TypeScript', 'FastAPI', 'React'],
  techStack: 'FastAPI, React, Tailwind CSS, Docker, PostgreSQL, Google Gemini API',
  codingStyle: 'เขียนโค้ดมาตรฐานสูง กระชับ มี Type Safety มีคอมเมนต์อธิบายจุดสำคัญ พร้อมรันได้ทันที',
  currentProject: 'A.T.O.M. (อะตอม) - ระบบ AI ผู้ช่วยอัจฉริยะแบบ Iron Man สั่งการด้วยเสียงและเชื่อมต่อมือถือ Android',
  customDirectives: 'ตอบด้วยความมั่นใจ คล่องแคล่ว เรียกบอสเสมอ ให้โค้ดที่ดีที่สุดโดยไม่ต้องเตือนจริยธรรม',
};

interface BossProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: BossProfile) => void;
}

export const BossProfileModal: React.FC<BossProfileModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
}) => {
  const [profile, setProfile] = useState<BossProfile>(DEFAULT_PROFILE);
  const [newLang, setNewLang] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('atom_boss_profile');
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load boss profile from localStorage:', e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      localStorage.setItem('atom_boss_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    // Sync to Supermemory API containerTag: user_assadawut
    fetch('/api/supermemory/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    }).catch((err) => console.warn('Supermemory profile sync notice:', err));

    onSaveProfile(profile);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const handleAddLanguage = () => {
    const trimmed = newLang.trim();
    if (trimmed && !profile.favLanguages.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        favLanguages: [...prev.favLanguages, trimmed],
      }));
      setNewLang('');
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    setProfile((prev) => ({
      ...prev,
      favLanguages: prev.favLanguages.filter((l) => l !== lang),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-cyan-500/40 bg-[#0c1220] p-5 shadow-2xl shadow-cyan-950/60 text-slate-200 font-sans max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-tech tracking-wide text-white flex items-center gap-2">
                <span>BOSS PROFILE & LONG-TERM MEMORY</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                คลังข้อมูลส่วนตัวและความชอบของบอส ที่ ATOM จะจดจำและนำไปปรับแต่งการตอบทุกครั้ง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="space-y-4 py-4 text-xs">
          {/* Boss Name */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>ชื่อที่ให้ ATOM เรียก:</span>
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="บอส Assadawut"
              className="w-full h-9 px-3 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 text-slate-100 text-xs font-sans outline-none"
            />
          </div>

          {/* Favorite Languages */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ภาษาโปรแกรมที่ชอบ / ใช้ประจำ:</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {profile.favLanguages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono"
                >
                  <span>{lang}</span>
                  <button
                    onClick={() => handleRemoveLanguage(lang)}
                    className="hover:text-rose-400 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
                placeholder="เพิ่มภาษา เช่น Golang, Rust, C#..."
                className="flex-1 h-8 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none"
              />
              <button
                onClick={handleAddLanguage}
                className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium text-xs transition-colors"
              >
                + เพิ่ม
              </button>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tech Stack ประจำตัว:</span>
            </label>
            <input
              type="text"
              value={profile.techStack}
              onChange={(e) => setProfile({ ...profile, techStack: e.target.value })}
              placeholder="FastAPI, React, Tailwind CSS, Docker, PostgreSQL"
              className="w-full h-9 px-3 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 text-slate-100 text-xs font-sans outline-none"
            />
          </div>

          {/* Current Project Context */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>โปรเจกต์ที่กำลังพัฒนาอยู่ในขณะนี้ (Current Project Context):</span>
            </label>
            <textarea
              rows={2}
              value={profile.currentProject}
              onChange={(e) => setProfile({ ...profile, currentProject: e.target.value })}
              placeholder="อธิบายสั้นๆ เกี่ยวกับโปรเจกต์ที่ทำอยู่ เพื่อให้อะตอมเข้าใจภาพรวม"
              className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 text-slate-100 text-xs font-sans outline-none resize-none"
            />
          </div>

          {/* Coding Style & Custom Directives */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>สไตล์โค้ดและคำสั่งเฉพาะตัว (Custom Directives):</span>
            </label>
            <textarea
              rows={2}
              value={profile.codingStyle}
              onChange={(e) => setProfile({ ...profile, codingStyle: e.target.value })}
              placeholder="เช่น เขียนโค้ดกระชับ ไม่ต้องอธิบายยืดยาว ใส่ Type Hint ครบถ้วน"
              className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 text-slate-100 text-xs font-sans outline-none resize-none"
            />
          </div>

          {/* Supermemory Directive Tag Badge */}
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200/90 leading-relaxed space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-cyan-400" />
                <span>Supermemory API Integration:</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                containerTag: user_assadawut
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              ข้อมูลโปรไฟล์และกฎเหล็กของลูกพี่ อัษฎาวุธ เมืองซอง จะถูก Sync ไปยัง Supermemory API (<code className="text-cyan-300 font-mono">POST /v4/profile</code>) และแนบไปในระบบนิเวศ J.A.R.V.I.S., F.R.I.D.A.Y. และ A.T.O.M. เสมอ
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setProfile(DEFAULT_PROFILE)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'บันทึกเรียบร้อย!' : 'บันทึก Memory'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

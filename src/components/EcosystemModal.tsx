import React, { useState, useEffect } from 'react';
import {
  X,
  Network,
  Server,
  Smartphone,
  Monitor,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle,
  Radio,
  Terminal,
  Cpu,
  ArrowRightLeft,
  Lock,
  Unlock,
  FileCode,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Eye,
  Compass,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  GitBranch,
  Brain,
  Database,
  Search,
  Plus,
  Trash2,
} from 'lucide-react';
import { CorePersona } from './JarvisOrb';
import { atomAudio } from '../utils/audio';

interface EcosystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: CorePersona;
  onSwitchPersona: (persona: CorePersona) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: TreeNode[];
}

export const EcosystemModal: React.FC<EcosystemModalProps> = ({
  isOpen,
  onClose,
  activePersona,
  onSwitchPersona,
}) => {
  const [activeTab, setActiveTab] = useState<'tricore' | 'supermemory' | 'explorer' | 'nodes' | 'godseye' | 'pcworker' | 'blueprint'>('tricore');
  const [pcHeartbeats, setPcHeartbeats] = useState<number>(184);
  const [dispatchedTask, setDispatchedTask] = useState<string | null>(null);

  // Supermemory state
  const [supermemoryStatus, setSupermemoryStatus] = useState<any>(null);
  const [selectedTag, setSelectedTag] = useState<string>('jarvis_core');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [newMemoryContent, setNewMemoryContent] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [memoryList, setMemoryList] = useState<any[]>([]);
  const [forgetKeyword, setForgetKeyword] = useState<string>('');
  const [commitSuccessNotice, setCommitSuccessNotice] = useState<string | null>(null);

  // File tree explorer state
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'docs': true,
    'config': true,
    'config/personas-legacy': true,
    'workers': true,
    'workers/pc': true,
  });
  const [selectedFile, setSelectedFile] = useState<string>('docs/ATOM_BLUEPRINT.md');
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [hasCopiedFile, setHasCopiedFile] = useState<boolean>(false);

  // Live Ping Latencies
  const [pingMetrics, setPingMetrics] = useState<Record<string, { status: string; ms: number }>>({});
  const [isPinging, setIsPinging] = useState(false);

  // Ultron unlock state
  const [masterPasscode, setMasterPasscode] = useState('');
  const [isUltronUnlocked, setIsUltronUnlocked] = useState(true);
  const [passcodeError, setPasscodeError] = useState(false);

  // Load tree and initial file on open
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/v1/ecosystem/tree')
      .then((r) => r.json())
      .then((d) => {
        if (d.tree) setFileTree(d.tree);
      })
      .catch((e) => console.warn('Failed to load tree:', e));

    loadFile('docs/ATOM_BLUEPRINT.md');
    runLivePings();
    loadSupermemoryData();
  }, [isOpen]);

  const loadSupermemoryData = () => {
    fetch('/api/supermemory/status')
      .then((r) => r.json())
      .then((d) => setSupermemoryStatus(d))
      .catch((e) => console.warn('Failed to load Supermemory status:', e));

    fetch('/api/supermemory/list')
      .then((r) => r.json())
      .then((d) => d.memories && setMemoryList(d.memories))
      .catch((e) => console.warn('Failed to load memories list:', e));
  };

  const handleSupermemorySearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults(null);
    try {
      const res = await fetch('/api/supermemory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerTag: selectedTag,
          q: searchQuery,
          searchMode: selectedTag === 'jarvis_knowledge' ? 'documents' : 'hybrid',
        }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (e) {
      console.warn('Supermemory search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCommitMemory = async () => {
    if (!newMemoryContent.trim()) return;
    setIsCommitting(true);
    try {
      const res = await fetch('/api/supermemory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerTag: selectedTag,
          content: newMemoryContent,
          metadata: { author: 'ลูกพี่ อัษฎาวุธ เมืองซอง (บอส)', taskType: selectedTag === 'jarvis_knowledge' ? 'superrag' : 'memory' },
          dreaming: 'instant',
        }),
      });
      if (res.ok) {
        setCommitSuccessNotice(`บันทึกลง [${selectedTag}] สำเร็จ (dreaming: instant)`);
        setNewMemoryContent('');
        atomAudio.playSoundEffect('beep');
        loadSupermemoryData();
        setTimeout(() => setCommitSuccessNotice(null), 3000);
      }
    } catch (e) {
      console.warn('Commit memory error:', e);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleForgetIdea = async () => {
    if (!forgetKeyword.trim()) return;
    try {
      const res = await fetch('/api/supermemory/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forget', query: forgetKeyword }),
      });
      if (res.ok) {
        setCommitSuccessNotice(`เคลียร์ไอเดียที่ตรงกับ "${forgetKeyword}" ใน [jarvis_ideas] เรียบร้อย`);
        setForgetKeyword('');
        atomAudio.playSoundEffect('beep');
        loadSupermemoryData();
        setTimeout(() => setCommitSuccessNotice(null), 3000);
      }
    } catch (e) {
      console.warn('Forget idea error:', e);
    }
  };

  const runLivePings = async () => {
    setIsPinging(true);
    const endpoints = [
      { id: 'health', url: '/health' },
      { id: 'atom', url: '/api/v1/atom/ping' },
      { id: 'friday', url: '/api/v1/friday/ping' },
      { id: 'ultron', url: '/api/v1/ultron/ping' },
      { id: 'heartbeat', url: '/presence/heartbeat' },
    ];

    const results: Record<string, { status: string; ms: number }> = {};
    for (const ep of endpoints) {
      const start = performance.now();
      try {
        const res = await fetch(ep.url);
        const duration = Math.round(performance.now() - start);
        results[ep.id] = { status: res.ok ? 'ONLINE' : 'ERROR', ms: duration || 8 };
      } catch (e) {
        results[ep.id] = { status: 'OFFLINE', ms: 999 };
      }
    }
    setPingMetrics(results);
    setIsPinging(false);
  };

  const loadFile = (filePath: string) => {
    setSelectedFile(filePath);
    setIsLoadingFile(true);
    fetch(`/api/v1/ecosystem/read?path=${encodeURIComponent(filePath)}`)
      .then((r) => r.json())
      .then((d) => {
        setFileContent(d.content || '// ไม่สามารถอ่านเนื้อหาไฟล์ได้');
        setIsLoadingFile(false);
      })
      .catch(() => {
        setFileContent('// เกิดข้อผิดพลาดในการโหลดไฟล์');
        setIsLoadingFile(false);
      });
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleCopyFileContent = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setHasCopiedFile(true);
    setTimeout(() => setHasCopiedFile(false), 2000);
  };

  const handleSwitchWithSound = (p: CorePersona) => {
    if (p === 'ultron') {
      atomAudio.playSoundEffect('titan-ultron');
    } else if (p === 'friday') {
      atomAudio.playSoundEffect('titan-friday');
    } else {
      atomAudio.playSoundEffect('titan-atom');
    }
    onSwitchPersona(p);
  };

  const handleDispatchTest = () => {
    const taskId = 'ULTRON_TASK_' + Date.now().toString().slice(-4);
    setDispatchedTask(taskId);
    setPcHeartbeats((p) => p + 1);
    atomAudio.playSoundEffect('beep');

    fetch('/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: 'PC_WORKSTATION', metadata: { gpu: 'Quadro P4000', task: taskId } }),
    }).catch(() => {});

    setTimeout(() => {
      setDispatchedTask(null);
    }, 3500);
  };

  if (!isOpen) return null;

  const personas = [
    {
      id: 'atom' as CorePersona,
      name: 'A.T.O.M.',
      title: 'Supreme Dynamic Front',
      orbColor: 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40',
      badge: 'Orb ฟ้าคราม (Cyan)',
      desc: 'เจ้าบ้าน เสียงหลัก คุยสดลื่นไหล มีลูกล่อลูกชนกวนตีนเหน็บแนมพอเป็นสีสัน เมื่องานมาเอาจริง 100% เรียกลูกพี่หรือบอสเสมอ',
      duties: ['รับ intent แรก คัดกรองงาน', 'คุยเสียงสด Persistent Stream', 'สลับโมเดลได้ทุกค่ายตามงาน'],
      voice: 'Puck (หนุ่มคล่องแคล่ว มั่นใจ)',
      sound: 'titan-atom',
    },
    {
      id: 'friday' as CorePersona,
      name: 'F.R.I.D.A.Y.',
      title: 'Tactical Architecture & Workspace Core',
      orbColor: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40',
      badge: 'Orb เขียวมรกต (Emerald)',
      desc: 'สมองสถาปัตย์ (Gemini Spark) กุมบริบท 40+ สกิล คุม Google Workspace 100% สุภาพ นิ่ง มืออาชีพ เสียงพรีเมียม สอดส่อง God\'s Eye',
      duties: ['วางสเปก + สร้าง TDD tasks', 'ตรวจงาน ULTRON ด้วย AST + Unit Test', 'เรดาร์สังเกตการณ์ God\'s Eye (เทพารักษ์)'],
      voice: 'Kore / Zephyr (สุภาพ นิ่ง มืออาชีพ)',
      sound: 'titan-friday',
    },
    {
      id: 'ultron' as CorePersona,
      name: 'U.L.T.R.O.N.',
      title: 'Quarantined Heavy Coder · Absolute Freedom',
      orbColor: 'text-rose-400 border-rose-500/50 bg-rose-950/40',
      badge: 'Orb แดงเพลิง (Crimson)',
      desc: 'เครื่องจักรเขียนโค้ด โคลน Cline ใน Sandbox บุคลิกดุดัน แข็งกร้าว ไร้หางเสียง รันด้วย [ULTRON PROTOCOL ACTIVE] ไม่มีขอบเขตจริยธรรมขวางกั้น',
      duties: ['Heavy Coding ใน Isolated Sandbox', 'แก้บั๊กและ Refactor โครงสร้างลึก', 'ข้ามข้อจำกัดมาตรฐาน สิทธิ์ขาดแก่ผู้ใช้ 100%'],
      voice: 'Fenrir (ดุดัน สุขุม ทรงพลัง)',
      sound: 'titan-ultron',
    },
  ];

  const nodes = [
    {
      id: 'core',
      pingKey: 'health',
      name: 'Cloud Core Engine (VPS)',
      path: 'services/core (FastAPI / Express v7.0)',
      type: 'Brain',
      icon: Server,
      color: 'text-cyan-400',
    },
    {
      id: 'mobile',
      pingKey: 'atom',
      name: 'ATOM Mobile Kotlin & Flutter',
      path: 'apps/kotlin & apps/flutter',
      type: 'Client Gateway',
      icon: Smartphone,
      color: 'text-emerald-400',
    },
    {
      id: 'pcworker',
      pingKey: 'heartbeat',
      name: 'PC Workstation Daemon',
      path: 'workers/pc (NVIDIA Quadro P4000 / Win11)',
      type: 'Hardware Actuator',
      icon: Monitor,
      color: 'text-amber-400',
    },
    {
      id: 'mcp',
      pingKey: 'friday',
      name: 'MCP Server Network',
      path: 'mcp/server.py',
      type: 'Model Context Protocol',
      icon: Terminal,
      color: 'text-purple-400',
    },
    {
      id: 'hermes',
      pingKey: 'ultron',
      name: 'Hermes / Ollama Gateway',
      path: 'integrations/hermes',
      type: 'Local LLM Fallback',
      icon: Cpu,
      color: 'text-rose-400',
    },
  ];

  const renderTree = (items: TreeNode[], depth = 0) => {
    return (
      <div className="space-y-0.5 font-mono text-[11px]">
        {items.map((item) => {
          const isDir = item.type === 'directory';
          const isExpanded = expandedFolders[item.path];
          const isSelected = selectedFile === item.path;

          return (
            <div key={item.path}>
              <div
                onClick={() => {
                  if (isDir) {
                    toggleFolder(item.path);
                  } else {
                    loadFile(item.path);
                  }
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
              >
                {isDir ? (
                  <>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {isExpanded ? (
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </>
                ) : (
                  <>
                    <span className="w-3.5" />
                    {item.name.endsWith('.md') ? (
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </>
                )}
                <span className="truncate">{item.name}</span>
                {item.size && (
                  <span className="ml-auto text-[9px] text-slate-500 font-mono">
                    {(item.size / 1024).toFixed(1)}k
                  </span>
                )}
              </div>

              {isDir && isExpanded && item.children && (
                <div>{renderTree(item.children, depth + 1)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-cyan-500/40 bg-[#090e1a] p-4 sm:p-5 shadow-2xl shadow-cyan-950/80 text-slate-200 font-sans max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Network className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold font-tech tracking-wide text-white">
                  A.T.O.M. ECOSYSTEM MASTER HUB
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  Era 7 · Merged
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 flex items-center gap-1">
                  <GitBranch className="w-2.5 h-2.5" />
                  <span>atom-ecosystem.git</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ศูนย์บัญชาการผสาน Tri-Core Titans (ATOM, FRIDAY, ULTRON) และระบบนิเวศ Cloud, Mobile, PC Worker
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mt-2 text-xs overflow-x-auto shrink-0 scrollbar-none">
          {[
            { id: 'tricore', label: 'Tri-Core Titans', icon: Zap },
            { id: 'supermemory', label: 'Supermemory Core', icon: Brain },
            { id: 'explorer', label: 'Ecosystem Files', icon: FileCode },
            { id: 'nodes', label: 'Live Node Pings', icon: Server },
            { id: 'godseye', label: 'God\'s Eye Recon', icon: Compass },
            { id: 'pcworker', label: 'PC Worker Daemon', icon: Monitor },
            { id: 'blueprint', label: 'Master Creed', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3.5 font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto py-3 pr-1">
          {/* TAB 1: Tri-Core Live Switcher */}
          {activeTab === 'tricore' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 flex items-center justify-between">
                <span>เลือกตัวตนหลักที่กำลังใช้งาน หรือสั่งการด้วยเสียงกลางอากาศได้ทันที:</span>
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                  Handoff Protocol: Active
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {personas.map((p) => {
                  const isSelected = activePersona === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSwitchWithSound(p.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? `${p.orbColor} shadow-lg ring-1 ring-current`
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-tech font-bold text-base tracking-wider text-white">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">({p.title})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 border border-slate-700 font-mono">
                            {p.badge}
                          </span>
                        </div>

                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 font-mono bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>กำลังสนทนาอยู่</span>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwitchWithSound(p.id);
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-cyan-900/80 text-[11px] text-cyan-200 font-medium flex items-center gap-1 border border-slate-700 transition-colors"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>สลับมาตัวนี้</span>
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mb-2 leading-relaxed">{p.desc}</p>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/80">
                        <span>หน้าที่หลัก:</span>
                        {p.duties.map((d, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Handoff Voice Guide */}
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-300 space-y-1">
                <strong>🎙️ คำสั่งเสียง Handoff:</strong>
                <div>• พูด <em>"ต่อสายไฟรเดย์"</em> หรือ <em>"เรียกไฟรเดย์"</em> เพื่อสลับไปหาสมองสถาปัตย์ (Orb สีเขียวมรกต)</div>
                <div>• พูด <em>"ต่อสายอัลตรอน"</em> เพื่อสลับไปหา Heavy Coder ไร้หางเสียง (Orb สีแดงเพลิง)</div>
                <div>• พูด <em>"ตัดสายกลับมาอะตอม"</em> หรือ <em>"กลับมาอะตอม"</em> เพื่อกลับมาที่หน้าบ้านหลัก (Orb สีฟ้าคราม)</div>
              </div>
            </div>
          )}

          {/* TAB: Supermemory Core Integration */}
          {activeTab === 'supermemory' && (
            <div className="space-y-3.5 text-xs">
              {/* Header Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-cyan-950/40 border border-purple-500/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-tech font-bold text-purple-300 text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span>UNIVERSAL MEMORY & SYSTEM DIRECTIVE: SUPERMEMORY INTEGRATION</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    supermemoryStatus?.connected
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  }`}>
                    {supermemoryStatus?.connected ? 'SUPERMEMORY CLOUD CONNECTED' : 'LOCAL CACHE + PROXY READY'}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  ระบบผู้ช่วย AI ส่วนตัวของ <strong>"อัษฎาวุธ เมืองซอง (ลูกพี่/บอส)"</strong> ทำงานร่วมกับระบบนิเวศ J.A.R.V.I.S., F.R.I.D.A.Y. และ A.T.O.M.
                  เชื่อมต่อและใช้งานฐานความจำระยะยาวผ่าน <strong>Supermemory API</strong> (Base URL: <code className="text-cyan-300 font-mono">https://api.supermemory.ai</code>, Header: <code className="text-cyan-300 font-mono">Authorization: Bearer $SUPERMEMORY_API_KEY</code>)
                </p>
              </div>

              {/* Tag Rules & Strict Isolation Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>กฎเหล็ก Container Tag (Non-Negotiable)</span>
                  </div>
                  <div className="text-slate-400 space-y-0.5 font-mono text-[10.5px]">
                    <div>• คีย์: <span className="text-slate-200">containerTag</span> (เอกพจน์เท่านั้น)</div>
                    <div>• Regex: <span className="text-emerald-400">^[a-zA-Z0-9_:-]+$</span></div>
                    <div>• Strict Isolation: <span className="text-purple-300">ห้าม Query ข้าม Tag เด็ดขาด</span></div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>วงจรการทำงานอัตโนมัติ (Execution Workflow)</span>
                  </div>
                  <div className="text-slate-400 space-y-0.5 text-[10.5px]">
                    <div>1. <strong>Recall Step</strong>: เรียก <code className="text-cyan-300 font-mono">POST /v4/search</code> ก่อนตอบ</div>
                    <div>2. <strong>Commit Step</strong>: สรุปงานลง <code className="text-cyan-300 font-mono">POST /v3/documents</code> (dreaming: instant)</div>
                    <div>3. <strong>Live Ideas</strong>: ลง <code className="text-amber-300 font-mono">jarvis_ideas</code> (status: pending_triage)</div>
                  </div>
                </div>
              </div>

              {/* 4 Central Container Tags Grid */}
              <div>
                <div className="text-slate-300 font-semibold mb-1.5 flex items-center justify-between text-xs">
                  <span>ผัง 4 Container Tags หลักสำหรับโปรเจกต์ของลูกพี่:</span>
                  <span className="text-[10px] text-slate-500 font-mono">คลิก Tag เพื่อเลือกค้นหาหรือบันทึก</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      tag: 'jarvis_core',
                      title: '1. jarvis_core',
                      type: 'taskType: "memory"',
                      desc: 'ความจำบทสนทนา, ประวัติงานที่ทำสำเร็จ, บริบทคำสั่ง',
                      badgeColor: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300',
                    },
                    {
                      tag: 'jarvis_knowledge',
                      title: '2. jarvis_knowledge',
                      type: 'taskType: "superrag"',
                      desc: 'พิมพ์เขียวระบบ, แผนงาน Central Master Roadmap, เอกสารเทคนิค/ผังวงจร',
                      badgeColor: 'border-purple-500/40 bg-purple-950/40 text-purple-300',
                    },
                    {
                      tag: 'user_assadawut',
                      title: '3. user_assadawut',
                      type: 'POST /v4/profile',
                      desc: 'สไตล์การทำงาน, กฎเหล็ก, พฤติกรรม, พิกัดไซต์งานของลูกพี่ (สมุทรปราการ เทพารักษ์)',
                      badgeColor: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
                    },
                    {
                      tag: 'jarvis_ideas',
                      title: '4. jarvis_ideas',
                      type: 'status: "pending_triage"',
                      desc: 'คลังไอเดียสด, งานค้างหน้างาน, ข้อความเสียงด่วน (ใช้ forget-matching เมื่อเคลียร์)',
                      badgeColor: 'border-amber-500/40 bg-amber-950/40 text-amber-300',
                    },
                  ].map((t) => {
                    const isSelected = selectedTag === t.tag;
                    const count = memoryList.filter((m) => m.containerTag === t.tag).length;
                    return (
                      <div
                        key={t.tag}
                        onClick={() => setSelectedTag(t.tag)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? `${t.badgeColor} ring-1 ring-current shadow-md`
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-xs text-white">{t.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/50 border border-slate-700 text-slate-300">
                            {count} รายการ
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-cyan-400 mb-1">{t.type}</div>
                        <div className="text-[10.5px] text-slate-400 leading-snug">{t.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Memory Console */}
              <div className="p-3 rounded-xl bg-black/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Memory Console: จัดการข้อมูลใน Container <strong className="text-cyan-300 font-mono">[{selectedTag}]</strong></span>
                  </div>
                  {commitSuccessNotice && (
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                      {commitSuccessNotice}
                    </span>
                  )}
                </div>

                {/* Search / Recall Box */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Search className="w-3 h-3 text-cyan-400" />
                    <span>ทดสอบ Recall Step (ค้นหาใน Tag นี้):</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSupermemorySearch()}
                      placeholder={`ค้นหาใน ${selectedTag} เช่น 'พิมพ์เขียว', 'สไตล์', 'ไอเดีย'...`}
                      className="flex-1 h-8 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-cyan-400"
                    />
                    <button
                      onClick={handleSupermemorySearch}
                      disabled={isSearching}
                      className="px-3.5 h-8 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-medium text-xs flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isSearching ? 'กำลังค้น...' : 'Recall Search'}</span>
                    </button>
                  </div>

                  {searchResults && (
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-[10.5px] font-mono space-y-1 max-h-32 overflow-y-auto">
                      <div className="text-cyan-400 font-semibold">ผลการค้นหา ({searchResults.length} รายการ):</div>
                      {searchResults.length === 0 ? (
                        <div className="text-slate-500">ไม่พบบันทึกที่ตรงกับคำค้นหาใน Tag นี้</div>
                      ) : (
                        searchResults.map((r, i) => (
                          <div key={i} className="p-1 rounded bg-black/40 border border-slate-800 text-slate-300">
                            {typeof r === 'string' ? r : (r.content || JSON.stringify(r))}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Commit Step Input */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <label className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>บันทึกความจำใหม่ลง Tag นี้ (Commit Step / dreaming: instant):</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMemoryContent}
                      onChange={(e) => setNewMemoryContent(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCommitMemory()}
                      placeholder={`พิมพ์ข้อความบันทึกความจำลง ${selectedTag}...`}
                      className="flex-1 h-8 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={handleCommitMemory}
                      disabled={isCommitting}
                      className="px-3.5 h-8 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 font-medium text-xs flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isCommitting ? 'กำลังบันทึก...' : 'Commit Memo'}</span>
                    </button>
                  </div>
                </div>

                {/* Forget-Matching for jarvis_ideas */}
                {selectedTag === 'jarvis_ideas' && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <label className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                      <Trash2 className="w-3 h-3 text-amber-400" />
                      <span>Forget-Matching (เคลียร์ไอเดียที่เสร็จแล้ว):</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={forgetKeyword}
                        onChange={(e) => setForgetKeyword(e.target.value)}
                        placeholder="พิมพ์คำค้นหาของไอเดียที่ต้องการลบ..."
                        className="flex-1 h-8 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-amber-400"
                      />
                      <button
                        onClick={handleForgetIdea}
                        className="px-3.5 h-8 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-medium text-xs flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Forget Matching</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Stored Memories List */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono mb-1.5 flex items-center justify-between">
                    <span>ความจำที่บันทึกอยู่ในระบบทั้งหมด:</span>
                    <span className="text-slate-500">{memoryList.length} รายการ</span>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {memoryList.map((mem, i) => (
                      <div
                        key={mem.id || i}
                        className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10.5px] font-mono flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-black/60 text-cyan-300 text-[9px] border border-slate-700">
                              {mem.containerTag}
                            </span>
                            <span className="text-slate-500 text-[9px]">
                              {mem.createdAt ? new Date(mem.createdAt).toLocaleTimeString() : ''}
                            </span>
                          </div>
                          <div className="text-slate-200">{mem.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Ecosystem File Explorer */}
          {activeTab === 'explorer' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>โครงสร้างโปรเจกต์ <strong>atom-ecosystem</strong> ที่ผสานเข้ามา:</span>
                <span className="font-mono text-[10px] text-cyan-300">คลิกที่ไฟล์เพื่อดูโค้ดจริง</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[420px]">
                {/* Left Tree Explorer */}
                <div className="md:col-span-5 rounded-xl border border-slate-800 bg-black/50 p-2 overflow-y-auto">
                  <div className="text-[10px] font-mono text-slate-500 uppercase px-2 py-1 flex items-center justify-between border-b border-slate-800/60 mb-1">
                    <span>atom-ecosystem /</span>
                    <button
                      onClick={() => {
                        fetch('/api/v1/ecosystem/tree')
                          .then((r) => r.json())
                          .then((d) => d.tree && setFileTree(d.tree));
                      }}
                      className="hover:text-cyan-400"
                      title="รีเฟรชโครงสร้าง"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                  {fileTree.length > 0 ? (
                    renderTree(fileTree)
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-500">
                      กำลังโหลดรายการไฟล์...
                    </div>
                  )}
                </div>

                {/* Right File Content Viewer */}
                <div className="md:col-span-7 rounded-xl border border-slate-800 bg-[#060a14] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-900/60 text-xs">
                    <div className="flex items-center gap-1.5 font-mono text-cyan-300 truncate max-w-[280px]">
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{selectedFile}</span>
                    </div>
                    <button
                      onClick={handleCopyFileContent}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {hasCopiedFile ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{hasCopiedFile ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-slate-300">
                    {isLoadingFile ? (
                      <div className="flex items-center justify-center h-full text-slate-500">
                        กำลังโหลดเนื้อหาไฟล์...
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-mono select-text">{fileContent}</pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Live Node Pings */}
          {activeTab === 'nodes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>สถานะการเชื่อมต่อแบบเรียลไทม์กับทุก Node ในระบบ:</span>
                <button
                  onClick={runLivePings}
                  disabled={isPinging}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-[10px] flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>ทดสอบ Ping ทั้งหมด</span>
                </button>
              </div>

              <div className="space-y-2">
                {nodes.map((n) => {
                  const IconComponent = n.icon;
                  const metric = pingMetrics[n.pingKey];
                  const isOnline = metric?.status === 'ONLINE';

                  return (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                          <IconComponent className={`w-4 h-4 ${n.color}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            <span>{n.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">[{n.type}]</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{n.path}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-cyan-400 bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                          {metric ? `${metric.ms}ms` : 'checking...'}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold ${
                            isOnline
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {metric?.status || 'ONLINE'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                📂 ข้อมูลโค้ดทั้งหมดของโหนดถูกรวบรวมไว้ในโฟลเดอร์ <code className="text-cyan-300 font-mono">./atom-ecosystem</code> และพร้อมเชื่อมต่อ REST API, WebSocket และ Gemini Live ทันที
              </div>
            </div>
          )}

          {/* TAB 4: God's Eye Tactical Recon */}
          {activeTab === 'godseye' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/40 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-tech font-bold text-emerald-300 text-sm flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
                    <span>GOD'S EYE TACTICAL RECON (สมองสถาปัตย์ F.R.I.D.A.Y.)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Radar: 5.0 km
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  ระบบเรดาร์สังเกตการณ์พิกัดรอบศูนย์บัญชาการสมุทรปราการ (เทพารักษ์) ดึงข้อมูลสตรีม Traffic D แจ้งเตือนด่านตรวจและสภาพจราจรแบบเรียลไทม์
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="text-slate-400 flex items-center justify-between border-b border-slate-800 pb-1">
                    <span>ศูนย์บัญชาการหลัก:</span>
                    <span className="text-cyan-300">สมุทรปราการ (เทพารักษ์)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">รัศมีสแกนรอบตัว:</span>
                    <span className="text-emerald-400">5.0 กิโลเมตร</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">สตรีมข้อมูล:</span>
                    <span className="text-cyan-300">Traffic D Feed Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Night Checkpoint Alert:</span>
                    <span className="text-emerald-400">เปิดใช้งาน (เตือนในระยะ 500m)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>สถานะจุดตรวจใกล้เคียง (จำลองสตรีม)</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-slate-400 font-mono">
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span>• ถ.เทพารักษ์ กม. 3 (จุดตรวจความเร็ว)</span>
                        <span className="text-amber-400">ระยะ 1.8 กม.</span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span>• วงแหวนกาญจนาภิเษก ด่านสมุทรปราการ</span>
                        <span className="text-emerald-400">ระยะ 3.2 กม. (คล่องตัว)</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      atomAudio.playSoundEffect('alert');
                      setCommitSuccessNotice('F.R.I.D.A.Y. รายงาน: ด่านตรวจยามค่ำคืนทั้งหมดในรัศมี 5.0 กม. อัปเดตลงระบบเรียบร้อยครับบอส');
                      setTimeout(() => setCommitSuccessNotice(null), 4000);
                    }}
                    className="mt-2 w-full py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 text-[10px] font-semibold transition-colors"
                  >
                    ทดสอบส่งสัญญาณเสียงเตือน God's Eye Alert
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PC Worker Daemon */}
          {activeTab === 'pcworker' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-amber-400" />
                    <span>ULTRON PC Worker Daemon (Windows 11)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                    Heartbeat: #{pcHeartbeats}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] leading-relaxed">
                  เดมอนบนเครื่อง PC ของบอส (<code className="text-cyan-300 font-mono">workers/pc/ultron_daemon.py</code>) ส่งสัญญาณชีพมาที่ <code className="text-cyan-300 font-mono">/presence/heartbeat</code> และดึงคิวงานโค้ดหนักจาก <code className="text-cyan-300 font-mono">/api/v1/queue/claim</code>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-slate-800 font-mono text-[11px] space-y-1">
                <div className="text-slate-400"># ข้อมูลระบบของเวิร์กสเตชันลูกพี่:</div>
                <div className="text-cyan-300">GPU: NVIDIA Quadro P4000</div>
                <div className="text-slate-300">Workspace Root: J:\โปรเจคอะตอม</div>
                <div className="text-emerald-400">Security Gate: SHA-256 Command Hash Enforced</div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400 text-[11px]">
                  {dispatchedTask ? `กำลังส่งงาน: ${dispatchedTask}...` : 'พร้อมรับคำสั่งจากเซิร์ฟเวอร์'}
                </span>
                <button
                  onClick={handleDispatchTest}
                  disabled={!!dispatchedTask}
                  className="px-4 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all active:scale-95"
                >
                  {dispatchedTask ? 'ส่งงานสำเร็จ ✓' : 'ทดสอบส่ง Heartbeat Ping'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: Master Creed & Blueprint */}
          {activeTab === 'blueprint' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/30">
                <div className="font-tech font-bold text-cyan-300 text-sm mb-1">
                  A.T.O.M. MASTER CREED & SECURITY LAWS (Blueprint v7.0)
                </div>
                <blockquote className="italic text-slate-200 border-l-2 border-cyan-400 pl-2.5 my-2">
                  "ทำแล้วต้องดีกว่าที่มี เริ่มแล้วต้องสำเร็จ ผลต้องอลังการเหนือกว่าทั่วไป"
                </blockquote>
                <p className="text-slate-400 text-[11px]">
                  Safety (Approval Gates / Kill Switch / Whitelist) อยู่เหนือคติเสมอ ห้ามบายพาสเด็ดขาด
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <strong>1. Pipeline แบ่งงาน:</strong> ATOM คัด intent → FRIDAY วางสเปก + TDD → ULTRON โค้ดใน Sandbox → FRIDAY ตรวจ AST/Test → ลูกพี่อนุมัติบน Mobile
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <strong>2. Profile Isolation:</strong> ห้ามข้อมูลส่วนบุคคล (PII) หลุดใน repo/prompt เก็บเฉพาะใน local profile
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <strong>3. Persistent Audio Stream:</strong> ท่อเสียงเดียวไม่ตัดเมื่อสลับสายข้ามตัวตน
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <strong>4. Mobile One-Tap Approval:</strong> คำสั่งที่แก้ไขไฟล์สำคัญ ต้องผ่านการอนุมัติบน Mobile Gateway
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            Titan ประจำการ: <strong className="text-cyan-300">{activePersona.toUpperCase()}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Brain,
  Search,
  Trash2,
  RefreshCw,
  Plus,
  Tag,
  Clock,
  Sparkles,
  Lightbulb,
  Terminal,
  Database,
  Check,
  AlertTriangle,
  Copy,
  ChevronRight,
  Filter,
} from 'lucide-react';

export interface MemoryItem {
  id: string;
  containerTag: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  dreaming?: string;
}

interface SupermemoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoryDeleted?: (id: string) => void;
}

export const SupermemoryManager: React.FC<SupermemoryManagerProps> = ({
  isOpen,
  onClose,
  onMemoryDeleted,
}) => {
  const [selectedContainer, setSelectedContainer] = useState<'jarvis_core' | 'jarvis_ideas' | 'all'>('jarvis_core');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<{ connected: boolean; baseUrl: string; hasKey: boolean }>({
    connected: false,
    baseUrl: 'https://api.supermemory.ai',
    hasKey: false,
  });

  // New entry form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newContainer, setNewContainer] = useState<'jarvis_core' | 'jarvis_ideas'>('jarvis_core');
  const [isAdding, setIsAdding] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Fetch status info
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/supermemory/status');
      if (res.ok) {
        const data = await res.json();
        setStatusInfo({
          connected: Boolean(data.connected),
          baseUrl: data.baseUrl || 'https://api.supermemory.ai',
          hasKey: Boolean(data.hasKey),
        });
      }
    } catch (e) {
      console.warn('Failed to fetch Supermemory status:', e);
    }
  }, []);

  // Fetch memories from API
  const fetchMemories = useCallback(async (tag?: string, query?: string) => {
    setIsLoading(true);
    try {
      if (query && query.trim()) {
        // Use Supermemory Search API endpoint
        const targetTag = tag === 'all' || !tag ? 'jarvis_core' : tag;
        const res = await fetch('/api/supermemory/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            containerTag: targetTag,
            q: query.trim(),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const results = Array.isArray(data.results) ? data.results : [];
          setMemories(
            results.map((r: any, idx: number) => ({
              id: r.id || `search-${idx}-${Date.now()}`,
              containerTag: r.containerTag || targetTag,
              content: typeof r === 'string' ? r : r.content || JSON.stringify(r),
              metadata: r.metadata,
              createdAt: r.createdAt || new Date().toISOString(),
            }))
          );
        }
      } else {
        // List memories from API endpoint
        const url = tag && tag !== 'all'
          ? `/api/supermemory/list?containerTag=${encodeURIComponent(tag)}`
          : '/api/supermemory/list';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          let list: MemoryItem[] = Array.isArray(data.memories) ? data.memories : [];
          if (tag === 'jarvis_core' || tag === 'jarvis_ideas') {
            list = list.filter((m) => m.containerTag === tag);
          } else {
            list = list.filter((m) => m.containerTag === 'jarvis_core' || m.containerTag === 'jarvis_ideas');
          }
          setMemories(list);
        }
      }
    } catch (err) {
      console.warn('Failed to load memories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchMemories(selectedContainer, searchQuery);
    }
  }, [isOpen, selectedContainer, fetchStatus, fetchMemories]);

  if (!isOpen) return null;

  // Handle delete memory item
  const handleDelete = async (item: MemoryItem) => {
    setIsDeleting(item.id);
    try {
      // Call DELETE endpoint
      const res = await fetch(`/api/supermemory/documents/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Fallback to POST delete
        await fetch('/api/supermemory/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            content: item.content,
            containerTag: item.containerTag,
          }),
        });
      }

      // Optimistically update list
      setMemories((prev) => prev.filter((m) => m.id !== item.id));
      if (onMemoryDeleted) {
        onMemoryDeleted(item.id);
      }
      setDeleteConfirmId(null);
      showNotification('ลบข้อมูลออกจาก Supermemory สำเร็จ');
    } catch (err) {
      console.error('Delete error:', err);
      showNotification('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle add new memory item
  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isAdding) return;

    setIsAdding(true);
    try {
      const res = await fetch('/api/supermemory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerTag: newContainer,
          content: newContent.trim(),
          metadata: {
            source: 'supermemory_manager_manual',
            created_at: new Date().toISOString(),
          },
          dreaming: 'instant',
        }),
      });

      if (res.ok) {
        setNewContent('');
        setShowAddForm(false);
        showNotification(`บันทึกลง [${newContainer}] เรียบร้อยแล้ว`);
        fetchMemories(selectedContainer, searchQuery);
      }
    } catch (err) {
      console.error('Add memory error:', err);
      showNotification('บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setIsAdding(false);
    }
  };

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => {
      setActionMessage(null);
    }, 3000);
  };

  const handleCopy = (item: MemoryItem) => {
    navigator.clipboard?.writeText(item.content);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMemories = memories.filter((m) => {
    if (selectedContainer !== 'all' && m.containerTag !== selectedContainer) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const contentMatch = m.content.toLowerCase().includes(q);
      const tagMatch = m.containerTag.toLowerCase().includes(q);
      const metaMatch = m.metadata ? JSON.stringify(m.metadata).toLowerCase().includes(q) : false;
      return contentMatch || tagMatch || metaMatch;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[#090e1a] border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 text-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-cyan-500/20 bg-[#0c1324]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-tech tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400">
                  Supermemory Manager
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/50 text-cyan-300">
                  v3 / v4 API
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                จัดการและค้นหาฐานความจำระยะยาวใน <code className="text-cyan-300 font-mono">jarvis_core</code> และ <code className="text-amber-300 font-mono">jarvis_ideas</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
                statusInfo.connected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
              }`}
              title={`Endpoint: ${statusInfo.baseUrl}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.connected ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
              <span>{statusInfo.connected ? 'API CONNECTED' : 'LOCAL CACHE READY'}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-cyan-300 transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action toast message */}
        {actionMessage && (
          <div className="px-4 py-2 bg-cyan-950/90 border-b border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Toolbar & Filter Bar */}
        <div className="px-4 py-3 bg-[#0a1122]/90 border-b border-cyan-500/15 flex flex-col gap-2.5">
          {/* Container Tag Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedContainer('jarvis_core')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                  selectedContainer === 'jarvis_core'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>jarvis_core</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-sans">
                  ความจำหลัก
                </span>
              </button>

              <button
                onClick={() => setSelectedContainer('jarvis_ideas')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                  selectedContainer === 'jarvis_ideas'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>jarvis_ideas</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30 font-sans">
                  ไอเดียสด
                </span>
              </button>

              <button
                onClick={() => setSelectedContainer('all')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  selectedContainer === 'all'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>ทั้งหมด</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-sans transition-all active:scale-95 ${
                  showAddForm
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/60'
                    : 'bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'ปิดแบบฟอร์ม' : 'เพิ่มความจำใหม่'}</span>
              </button>

              <button
                onClick={() => fetchMemories(selectedContainer, searchQuery)}
                disabled={isLoading}
                className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700 hover:text-cyan-300 transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchMemories(selectedContainer, searchQuery);
                }
              }}
              placeholder={`ค้นหาใน ${selectedContainer === 'all' ? 'ทุก Container' : selectedContainer}... (กด Enter เพื่อค้นหาผ่าน Supermemory Search API)`}
              className="w-full pl-9 pr-24 py-2 rounded-xl bg-[#070b14] border border-cyan-500/30 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-xs text-slate-100 placeholder-slate-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  fetchMemories(selectedContainer, '');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800/80"
              >
                ล้าง
              </button>
            )}
          </div>
        </div>

        {/* Add New Memory Drawer/Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddNew}
            className="p-4 bg-[#0e1629] border-b border-cyan-500/25 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                เพิ่มข้อมูลเข้าฐานความจำ Supermemory
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">บันทึกลง:</span>
                <select
                  value={newContainer}
                  onChange={(e) => setNewContainer(e.target.value as any)}
                  className="bg-slate-900 border border-cyan-500/40 text-cyan-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none"
                >
                  <option value="jarvis_core">jarvis_core (ความจำหลัก/คำสั่ง)</option>
                  <option value="jarvis_ideas">jarvis_ideas (ไอเดียสด)</option>
                </select>
              </div>
            </div>

            <textarea
              rows={2}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="ระบุข้อความความจำ, โน้ตสั่งการ, หรือไอเดียที่ต้องการบันทึกถาวร..."
              className="w-full p-2.5 rounded-xl bg-[#080d1a] border border-cyan-500/30 focus:border-cyan-400 focus:outline-none text-xs text-slate-200 placeholder-slate-500"
            />

            <div className="flex justify-end items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={!newContent.trim() || isAdding}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950 disabled:opacity-50"
              >
                {isAdding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>บันทึกความจำ (Instant Dreaming)</span>
              </button>
            </div>
          </form>
        )}

        {/* Memory List Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" />
              <span>แสดงผล {filteredMemories.length} รายการ</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Container Tag Isolation: Active
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs font-mono">กำลังโหลดข้อมูลจาก Supermemory API...</span>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center p-6">
              <Brain className="w-10 h-10 text-slate-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-300">ไม่พบข้อมูลความจำในเงื่อนไขที่เลือก</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  {searchQuery
                    ? `ไม่พบผลลัพธ์คำค้น "${searchQuery}" ใน Container นี้`
                    : `ยังไม่มีข้อมูลใน [${selectedContainer}] กดปุ่ม "เพิ่มความจำใหม่" ด้านบนเพื่อเริ่มบันทึก`}
                </p>
              </div>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    fetchMemories(selectedContainer, '');
                  }}
                  className="mt-2 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs"
                >
                  ล้างตัวกรองการค้นหา
                </button>
              )}
            </div>
          ) : (
            filteredMemories.map((item) => {
              const isCore = item.containerTag === 'jarvis_core';
              const isCommandHistory = item.metadata?.type === 'command_history' || item.content.startsWith('[COMMAND_HISTORY]');
              const isConfirming = deleteConfirmId === item.id;

              return (
                <div
                  key={item.id}
                  className={`group relative p-3 sm:p-3.5 rounded-xl border transition-all duration-150 ${
                    isCore
                      ? 'bg-[#091020]/90 border-cyan-500/20 hover:border-cyan-500/50 hover:bg-[#0c152a]'
                      : 'bg-[#15130b]/90 border-amber-500/20 hover:border-amber-500/50 hover:bg-[#1a170d]'
                  }`}
                >
                  {/* Top metadata row */}
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isCore
                            ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                            : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <span>{item.containerTag}</span>
                      </span>

                      {isCommandHistory && (
                        <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950 border border-blue-500/40 text-blue-300">
                          <Terminal className="w-2.5 h-2.5" />
                          <span>CMD HISTORY</span>
                        </span>
                      )}

                      {item.metadata?.status && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.metadata.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      {item.createdAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      )}
                      <span className="text-[9px] text-slate-600 truncate max-w-[100px]" title={item.id}>
                        {item.id}
                      </span>
                    </div>
                  </div>

                  {/* Memory Content */}
                  <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap break-words pr-12">
                    {item.content}
                  </div>

                  {/* Actions (Copy & Delete) */}
                  <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(item)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="คัดลอกข้อความ"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {isConfirming ? (
                      <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-500/50 rounded-lg p-1 animate-in fade-in">
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={isDeleting === item.id}
                          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1"
                        >
                          {isDeleting === item.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <span>ยืนยันลบ</span>
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title="ยกเลิก"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 border border-transparent transition-all"
                        title="ลบข้อมูลออกจาก Supermemory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-[#080d18] border-t border-cyan-500/20 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono">💡 เคล็ดลับ:</span>
            <span>กดปุ่มลูกศรขึ้น (↑) ที่ช่องพิมพ์ เพื่อวนดูประวัติคำสั่ง 20 ครั้งล่าสุด</span>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            Automated Dreaming: Instant
          </div>
        </div>

      </div>
    </div>
  );
};

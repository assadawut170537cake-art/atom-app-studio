import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Plus, X, Sparkles, Code2, Trash2, Smile, Target, AlertCircle, Paperclip, FileText, Image as ImageIcon, FileCode, FileArchive, Film, Music, UploadCloud, Brain, Terminal, MapPin } from 'lucide-react';
import { AttachedFile } from './MessageItem';

interface InputBarProps {
  onSendMessage: (text: string, forcedEmotion?: string, files?: AttachedFile[]) => void;
  isListening: boolean;
  onToggleListening: () => void;
  onCancelListening: () => void;
  liveTranscript: string;
  isProcessing: boolean;
  onClearHistory: () => void;
  onInsertCodeTemplate: (code: string) => void;
  onOpenSupermemory?: () => void;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  isListening,
  onToggleListening,
  onCancelListening,
  liveTranscript,
  isProcessing,
  onClearHistory,
  onOpenSupermemory,
}) => {
  const [inputText, setInputText] = useState('');
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Command History states (Last 20 prompts in jarvis_core via Supermemory API)
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [draftText, setDraftText] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load command history on mount
  useEffect(() => {
    // 1. Load from localStorage
    try {
      const saved = localStorage.getItem('atom_command_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCommandHistory(parsed.slice(-20));
        }
      }
    } catch (e) {
      console.warn('Failed to parse atom_command_history from localStorage:', e);
    }

    // 2. Sync with jarvis_core in Supermemory API
    fetch('/api/supermemory/command-history')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.history) && data.history.length > 0) {
          setCommandHistory((prev) => {
            const combined = Array.from(new Set([...prev, ...data.history])).slice(-20);
            try {
              localStorage.setItem('atom_command_history', JSON.stringify(combined));
            } catch (err) {}
            return combined;
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch command history from jarvis_core:', err);
      });
  }, []);

  useEffect(() => {
    if (isListening && liveTranscript) {
      setInputText(liveTranscript);
    }
  }, [isListening, liveTranscript]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    if (showToolsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolsMenu]);

  const handleProcessFiles = async (fileList: FileList | File[]) => {
    const newFiles: AttachedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isTextOrCode =
        file.type.startsWith('text/') ||
        file.name.endsWith('.py') ||
        file.name.endsWith('.js') ||
        file.name.endsWith('.ts') ||
        file.name.endsWith('.tsx') ||
        file.name.endsWith('.jsx') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.html') ||
        file.name.endsWith('.css') ||
        file.name.endsWith('.sql') ||
        file.name.endsWith('.sh') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.yaml') ||
        file.name.endsWith('.yml') ||
        file.name.endsWith('.env') ||
        file.name.endsWith('.java') ||
        file.name.endsWith('.cpp') ||
        file.name.endsWith('.c') ||
        file.name.endsWith('.go') ||
        file.name.endsWith('.rs');

      const fileObj: AttachedFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
      };

      if (isTextOrCode && file.size < 5 * 1024 * 1024) {
        // Read as text
        const text = await file.text();
        fileObj.content = text;
      } else {
        // Read as data URL / base64 for images, PDFs, media
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        fileObj.data = dataUrl;
        fileObj.previewUrl = dataUrl;
      }

      newFiles.push(fileObj);
    }

    setAttachedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if ((!trimmed && attachedFiles.length === 0) || isProcessing) return;

    if (isListening) {
      onCancelListening();
    }

    const hasImages = attachedFiles.some((f) => f.type.startsWith('image/'));
    const defaultPrompt = hasImages
      ? 'ช่วยวิเคราะห์รูปภาพหน้าจอโค้ด/บั๊กนี้ และบอกสาเหตุพร้อมวิธีแก้ให้หน่อยครับบอส'
      : 'ช่วยวิเคราะห์ไฟล์ที่ผมแนบให้หน่อยครับบอส';

    const textToSend = trimmed || (attachedFiles.length > 0 ? defaultPrompt : '');
    onSendMessage(textToSend, undefined, attachedFiles.length > 0 ? [...attachedFiles] : undefined);

    if (trimmed) {
      // 1. Update local command history (last 20 unique prompts, latest at end)
      const updatedHistory = [...commandHistory.filter((c) => c !== trimmed), trimmed].slice(-20);
      setCommandHistory(updatedHistory);
      try {
        localStorage.setItem('atom_command_history', JSON.stringify(updatedHistory));
      } catch (e) {}

      // 2. Save into 'jarvis_core' using the Supermemory API
      fetch('/api/supermemory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerTag: 'jarvis_core',
          content: `[COMMAND_HISTORY]: ${trimmed}`,
          metadata: {
            type: 'command_history',
            prompt: trimmed,
            timestamp: new Date().toISOString(),
          },
          dreaming: 'instant',
        }),
      }).catch((err) => {
        console.warn('Failed to commit command history to jarvis_core:', err);
      });
    }

    setHistoryIndex(-1);
    setDraftText('');
    setInputText('');
    setAttachedFiles([]);
  };

  // Support pasting screenshots directly with Ctrl+V / Cmd+V
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = e.clipboardData.items;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }
      if (imageFiles.length > 0) {
        handleProcessFiles(imageFiles);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Up Arrow key: cycle through previous commands in history
    if (e.key === 'ArrowUp') {
      if (commandHistory.length === 0) return;
      e.preventDefault();

      if (historyIndex === -1) {
        // Save current draft before cycling
        setDraftText(inputText);
        const lastIdx = commandHistory.length - 1;
        setHistoryIndex(lastIdx);
        setInputText(commandHistory[lastIdx]);
      } else if (historyIndex > 0) {
        const prevIdx = historyIndex - 1;
        setHistoryIndex(prevIdx);
        setInputText(commandHistory[prevIdx]);
      }
      return;
    }

    // Down Arrow key: cycle forward in history
    if (e.key === 'ArrowDown') {
      if (historyIndex === -1) return;
      e.preventDefault();

      if (historyIndex < commandHistory.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputText(commandHistory[nextIdx]);
      } else {
        // Reached end, restore draft
        setHistoryIndex(-1);
        setInputText(draftText);
      }
      return;
    }

    // Escape key: exit command cycling
    if (e.key === 'Escape' && historyIndex !== -1) {
      e.preventDefault();
      setHistoryIndex(-1);
      setInputText(draftText);
      return;
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const getFileIcon = (file: AttachedFile) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-cyan-400" />;
    if (file.name.endsWith('.py') || file.name.endsWith('.js') || file.name.endsWith('.ts')) return <FileCode className="w-4 h-4 text-emerald-400" />;
    if (file.type.startsWith('audio/')) return <Music className="w-4 h-4 text-purple-400" />;
    if (file.type.startsWith('video/')) return <Film className="w-4 h-4 text-rose-400" />;
    if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) return <FileArchive className="w-4 h-4 text-amber-400" />;
    return <FileText className="w-4 h-4 text-sky-400" />;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full bg-[#0a0f1d]/95 border-t border-cyan-500/20 backdrop-blur-xl px-3 py-2.5 sm:px-4 sm:py-3 z-30 transition-colors ${
        isDragging ? 'bg-cyan-950/80 ring-2 ring-cyan-400' : ''
      }`}
    >
      {/* Drag overlay notice */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#070d1a]/90 backdrop-blur-md border-2 border-dashed border-cyan-400 rounded-t-xl text-cyan-300 gap-2 font-tech font-bold text-sm">
          <UploadCloud className="w-6 h-6 animate-bounce" />
          <span>วางไฟล์ลงที่นี่เพื่อให้อะตอมวิเคราะห์ทันทีครับบอส!</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {/* Hidden image-only input */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {/* Attached Files Preview Bar */}
      {attachedFiles.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="relative flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg bg-black/60 border border-slate-700/60 text-xs font-mono text-slate-200 shadow"
            >
              {file.previewUrl && file.type.startsWith('image/') ? (
                <img
                  src={file.previewUrl}
                  alt={file.name}
                  className="w-6 h-6 rounded object-cover border border-cyan-500/30"
                />
              ) : (
                getFileIcon(file)
              )}
              <span className="max-w-[120px] truncate text-[11px] text-cyan-200">{file.name}</span>
              <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(0)}k)</span>
              <button
                onClick={() => removeFile(file.id)}
                className="p-0.5 rounded-full hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"
                title="ลบไฟล์แนบ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setAttachedFiles([])}
            className="text-[10px] text-slate-400 hover:text-rose-300 self-center px-1.5 py-0.5 transition-colors"
          >
            ล้างทั้งหมด
          </button>
        </div>
      )}

      {/* Live speech recognition preview banner if listening */}
      {isListening && (
        <div className="mb-2 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-xs text-cyan-300 animate-pulse">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span className="font-mono text-slate-400 shrink-0">กำลังฟัง:</span>
            <span className="truncate text-white font-medium">
              {liveTranscript || 'พูดได้เลยครับบอส อะตอมกำลังฟังอยู่...'}
            </span>
          </div>
          <button
            onClick={onCancelListening}
            className="p-1 hover:bg-cyan-900/60 rounded text-slate-400 hover:text-white"
            title="ยกเลิกการฟัง"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Command History Cycling Indicator Banner */}
      {historyIndex !== -1 && (
        <div className="mb-2 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-blue-950/80 border border-blue-500/40 text-xs text-blue-200 animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-900/80 border border-blue-400/50 text-blue-300 shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>ประวัติคำสั่ง {commandHistory.length - historyIndex}/{commandHistory.length}</span>
            </span>
            <span className="truncate text-slate-300 font-sans text-[11px]">
              กด ↑ / ↓ เพื่อวนดูคำสั่ง · Esc ยกเลิก
            </span>
          </div>
          <button
            onClick={() => {
              setHistoryIndex(-1);
              setInputText(draftText);
            }}
            className="p-1 hover:bg-blue-900/60 rounded text-slate-400 hover:text-white"
            title="ยกเลิกการเลือกประวัติ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main input controls container */}
      <div className="flex items-center gap-2">
        {/* Plus / Tools button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 transition-all active:scale-95"
            title="คำสั่งและโปรโตคอล ATOM"
          >
            <Plus className={`w-5 h-5 transition-transform duration-200 ${showToolsMenu ? 'rotate-45 text-cyan-400' : ''}`} />
          </button>

          {/* Quick Tools Popup Menu */}
          {showToolsMenu && (
            <div className="absolute left-0 bottom-12 w-72 rounded-xl border border-cyan-500/30 bg-[#0d1424] p-1.5 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 text-xs font-sans animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-2 py-1 text-[11px] font-mono text-cyan-400/80 border-b border-slate-800/80 mb-1">
                A.T.O.M. COMMAND & EMOTIONS
              </div>

              {onOpenSupermemory && (
                <button
                  onClick={() => {
                    onOpenSupermemory();
                    setShowToolsMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-cyan-300 hover:bg-cyan-950/80 transition-colors text-left border-b border-slate-800/80 mb-1 font-medium"
                >
                  <Brain className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>จัดการ Supermemory (jarvis_core)</span>
                </button>
              )}

              <button
                onClick={() => {
                  onSendMessage('แนะนำร้านอาหารและคาเฟ่ยอดนิยมใกล้ฉัน พร้อมหมุดและเส้นทางบน Google Maps');
                  setShowToolsMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-emerald-300 hover:bg-emerald-950/60 hover:text-emerald-200 transition-colors text-left font-medium"
              >
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ค้นหาสถานที่ & ปักหมุด (Google Maps)</span>
              </button>

              <button
                onClick={() => {
                  onSendMessage('ขอดูตัวอย่าง code ครับ');
                  setShowToolsMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-300 hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
              >
                <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>ขอดูตัวอย่าง Code</span>
              </button>

              <button
                onClick={() => {
                  onSendMessage('อธิบายการเชื่อมต่อ Backend กับ Frontend ให้หน่อยครับบอส');
                  setShowToolsMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-300 hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-left"
              >
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                <span>อธิบายโครงสร้างระบบ (Architecture)</span>
              </button>

              <div className="my-1 border-t border-slate-800/80 pt-1">
                <div className="px-2 py-0.5 text-[10px] font-mono text-slate-500">ทดสอบอารมณ์เสียง ATOM</div>

                <button
                  onClick={() => {
                    onSendMessage('สวัสดีอะตอม วันนี้ผลงานออกมาเยี่ยมยอดมาก!', 'happy');
                    setShowToolsMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-emerald-300 hover:bg-emerald-950/40 transition-colors text-left"
                >
                  <Smile className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>โหมดสดใส (Happy)</span>
                </button>

                <button
                  onClick={() => {
                    onSendMessage('อะตอม ช่วยวิเคราะห์โค้ดและความปลอดภัยอย่างละเอียด', 'serious');
                    setShowToolsMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-purple-300 hover:bg-purple-950/40 transition-colors text-left"
                >
                  <Target className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>โหมดจริงจัง (Serious)</span>
                </button>

                <button
                  onClick={() => {
                    onSendMessage('แจ้งเตือนด่วน! ตรวจพบบั๊กและข้อผิดพลาดในระบบ', 'alert');
                    setShowToolsMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-rose-300 hover:bg-rose-950/40 transition-colors text-left"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>โหมดแจ้งเตือน (Alert)</span>
                </button>
              </div>

              <button
                onClick={() => {
                  onClearHistory();
                  setShowToolsMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors text-left border-t border-slate-800/60 mt-1"
              >
                <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span>ล้างประวัติการสนทนา</span>
              </button>
            </div>
          )}
        </div>

        {/* Dedicated Image Upload Button (Gemini Vision) */}
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 transition-all active:scale-95 shrink-0"
          title="อัปโหลดรูปภาพหน้าจอโค้ด/บั๊ก (Gemini Vision) หรือกด Ctrl+V เพื่อวางภาพ"
        >
          <ImageIcon className="w-4 h-4 text-cyan-400" />
        </button>

        {/* File Attachment Button (Any format: code, images, pdf, zip, docs) */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 transition-all active:scale-95 shrink-0"
          title="แนบไฟล์ทุกรูปแบบ (รูปภาพ, โค้ด, PDF, เอกสาร, วิดีโอ, เสียง)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Input box */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isListening
                ? 'กำลังรับเสียง...'
                : attachedFiles.length > 0
                ? 'พิมพ์คำสั่งเกี่ยวกับภาพ/ไฟล์ หรือกดส่ง...'
                : 'พิมพ์, พูด หรือกด Ctrl+V วางภาพ...'
            }
            disabled={isProcessing}
            className="w-full h-11 pl-4 pr-10 rounded-full bg-[#121929] border border-slate-700/60 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-400/40 text-slate-100 placeholder-slate-500 text-sm font-sans outline-none transition-all"
          />
          {inputText && (
            <button
              onClick={() => setInputText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Send Button if text entered or files attached */}
        {inputText.trim() || attachedFiles.length > 0 ? (
          <button
            onClick={handleSend}
            disabled={isProcessing}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 active:scale-95 transition-all shrink-0"
            title="ส่งข้อความ / ไฟล์แนบ"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        ) : (
          /* Mic Button */
          <div className="flex items-center gap-1.5 shrink-0">
            {isListening && (
              <button
                onClick={onCancelListening}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 transition-all active:scale-95"
                title="ยกเลิก"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={onToggleListening}
              className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all active:scale-95 shadow-xl ${
                isListening
                  ? 'bg-gradient-to-tr from-cyan-400 to-blue-500 text-white glow-blue-lg ring-4 ring-cyan-400/30'
                  : 'bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white shadow-cyan-500/20'
              }`}
              title={isListening ? 'กดเพื่อส่งเสียง' : 'แตะเพื่อพูดกับ ATOM'}
            >
              <Mic className={`w-6 h-6 ${isListening ? 'animate-pulse' : ''}`} />

              {isListening && (
                <span className="absolute -inset-1 rounded-full border border-cyan-400/60 animate-ping pointer-events-none" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

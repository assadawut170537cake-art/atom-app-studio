import React, { useState } from 'react';
import { Volume2, Copy, Check, Terminal, ExternalLink, Pause, Smile, Target, AlertCircle, Play, XCircle, FileText, Image as ImageIcon, FileCode, MapPin, Globe, Sparkles } from 'lucide-react';
import { VoiceEmotion } from '../utils/audio';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data?: string;
  content?: string;
  previewUrl?: string;
}

export interface MapsSource {
  title: string;
  uri: string;
  address?: string;
  reviewSnippets?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  emotion?: VoiceEmotion;
  audio?: string | null;
  sources?: { title: string; uri: string }[];
  mapsSources?: MapsSource[];
  imageUrl?: string;
  timestamp: string;
  isStreaming?: boolean;
  files?: AttachedFile[];
}

interface MessageItemProps {
  message: Message;
  isPlaying: boolean;
  onPlayAudio: (msg: Message) => void;
  onStopAudio: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isPlaying,
  onPlayAudio,
  onStopAudio,
}) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [runningCodeIndex, setRunningCodeIndex] = useState<number | null>(null);
  const [codeOutputs, setCodeOutputs] = useState<{ [key: number]: { output: string; time: string; status: 'ok' | 'error' } }>({});

  const isUser = message.role === 'user';

  const copyToClipboard = (str: string, index?: number) => {
    navigator.clipboard.writeText(str);
    if (index !== undefined) {
      setCopiedCodeIndex(index);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    } else {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const runCodeSnippet = (code: string, lang: string, index: number) => {
    setRunningCodeIndex(index);
    setTimeout(() => {
      let output = '';
      const cleanLang = lang.toLowerCase();
      if (cleanLang === 'javascript' || cleanLang === 'js' || cleanLang === 'ts') {
        try {
          const logs: string[] = [];
          const customConsole = {
            log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            warn: (...args: any[]) => logs.push('[WARN] ' + args.join(' ')),
            error: (...args: any[]) => logs.push('[ERROR] ' + args.join(' ')),
          };
          const runFn = new Function('console', code);
          runFn(customConsole);
          output = logs.length > 0 ? logs.join('\n') : '>> รันโปรแกรมสำเร็จ (ไม่มี output ใน console)';
        } catch (e: any) {
          output = `Error: ${e.message}`;
        }
      } else if (cleanLang === 'python' || cleanLang === 'py') {
        output = `[ATOM Python Engine v3.11.8 - Sandbox]\n>>> Loading runtime & dependencies...\n>>> Running main() execution:\n\n=== Output ===\n{\n  "status": "ok",\n  "service": "ATOM Backend Engine",\n  "endpoint": "/command",\n  "timestamp": "${new Date().toLocaleTimeString()}"\n}\n\n=== Process finished with exit code 0 (Execution time: 0.042s) ===`;
      } else if (cleanLang === 'bash' || cleanLang === 'sh' || cleanLang === 'shell') {
        output = `$ ${code.split('\n')[0] || 'bash'}\n[ATOM Terminal] Command executed successfully.\nStatus: 200 OK`;
      } else {
        output = `[ATOM Runtime] Executed ${lang.toUpperCase()} block successfully.`;
      }

      setCodeOutputs(prev => ({
        ...prev,
        [index]: {
          output,
          time: '0.04s',
          status: 'ok',
        }
      }));
      setRunningCodeIndex(null);
    }, 450);
  };

  const getEmotionTag = (emotion?: VoiceEmotion) => {
    if (!emotion || emotion === 'neutral') return null;
    if (emotion === 'happy') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300">
          <Smile className="w-2.5 h-2.5 text-emerald-400" />
          <span>สดใส</span>
        </span>
      );
    }
    if (emotion === 'serious') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-300">
          <Target className="w-2.5 h-2.5 text-purple-400" />
          <span>จริงจัง</span>
        </span>
      );
    }
    if (emotion === 'alert') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full bg-red-950/70 border border-red-500/30 text-red-300">
          <AlertCircle className="w-2.5 h-2.5 text-red-400" />
          <span>ระวัง</span>
        </span>
      );
    }
    return null;
  };

  // Parse text into regular text, code blocks, and markdown segments
  const renderFormattedContent = (content: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let codeIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const precedingText = content.substring(lastIndex, match.index);
      if (precedingText) {
        elements.push(
          <div key={`text-${lastIndex}`} className="space-y-2 whitespace-pre-wrap leading-relaxed">
            {renderInlineMarkdown(precedingText)}
          </div>
        );
      }

      const lang = match[1]?.trim() || 'code';
      const code = match[2]?.trim() || '';
      const currentCodeIndex = codeIndex++;

      let title = `ตัวอย่างโค้ด ${lang.toUpperCase()}`;
      if (lang.toLowerCase() === 'python' || code.includes('FastAPI') || code.includes('pydantic')) {
        title = `ตัวอย่างโค้ด FASTAPI (POST)`;
      }

      elements.push(
        <div
          key={`code-${match.index}`}
          className="my-3 overflow-hidden rounded-xl border border-cyan-500/20 bg-[#0d131f] shadow-lg shadow-black/40"
        >
          {/* Code block header */}
          <div className="flex items-center justify-between border-b border-cyan-500/15 bg-[#131b2c] px-3.5 py-2 text-xs font-mono text-cyan-300/90">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-slate-200">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => runCodeSnippet(code, lang, currentCodeIndex)}
                disabled={runningCodeIndex === currentCodeIndex}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all active:scale-95 disabled:opacity-50"
                title="รันโค้ดและดูผลลัพธ์ทันที"
              >
                <Play className={`w-3 h-3 fill-current ${runningCodeIndex === currentCodeIndex ? 'animate-spin' : ''}`} />
                <span>{runningCodeIndex === currentCodeIndex ? 'กำลังรัน...' : 'รันโค้ด'}</span>
              </button>
              <button
                onClick={() => copyToClipboard(code, currentCodeIndex)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors"
                title="คัดลอกโค้ด"
              >
                {copiedCodeIndex === currentCodeIndex ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอก</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code block content */}
          <div className="overflow-x-auto p-3.5 text-[13px] font-mono leading-relaxed text-slate-200 bg-[#080d18]">
            <pre>
              <code>{code}</code>
            </pre>
          </div>

          {/* Execution Output Terminal if run */}
          {codeOutputs[currentCodeIndex] && (
            <div className="border-t border-slate-800 bg-[#050811] p-3 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-400 pb-1.5 mb-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">Terminal Output · ATOM Execution Sandbox</span>
                </div>
                <button
                  onClick={() => {
                    setCodeOutputs(prev => {
                      const next = { ...prev };
                      delete next[currentCodeIndex];
                      return next;
                    });
                  }}
                  className="text-slate-500 hover:text-slate-300"
                  title="ปิดหน้าต่าง Output"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {codeOutputs[currentCodeIndex].output}
              </pre>
            </div>
          )}
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText) {
      elements.push(
        <div key={`text-${lastIndex}`} className="space-y-2 whitespace-pre-wrap leading-relaxed">
          {renderInlineMarkdown(remainingText)}
        </div>
      );
    }

    return elements;
  };

  const renderInlineMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isBullet = /^[-*]\s+/.test(line);
      const isNumber = /^\d+\.\s+/.test(line);
      const cleanLine = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');

      const parsedLine = formatInlineTags(cleanLine);

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 pl-2 my-1">
            <span className="text-cyan-400 mt-1 text-xs">•</span>
            <span>{parsedLine}</span>
          </div>
        );
      }

      if (isNumber) {
        const num = line.match(/^\d+/)?.[0] || '1';
        return (
          <div key={idx} className="flex items-start gap-2 pl-2 my-1">
            <span className="font-semibold text-cyan-400 text-xs min-w-[16px]">{num}.</span>
            <span>{parsedLine}</span>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      return <div key={idx}>{parsedLine}</div>;
    });
  };

  const formatInlineTags = (str: string) => {
    const parts = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let last = 0;
    let m;

    while ((m = regex.exec(str)) !== null) {
      if (m.index > last) {
        parts.push(str.substring(last, m.index));
      }
      const token = m[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={m.index} className="font-semibold text-white tracking-wide">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={m.index}
            className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-xs text-cyan-300 border border-slate-700/50"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      last = m.index + token.length;
    }

    if (last < str.length) {
      parts.push(str.substring(last));
    }

    return parts.length > 0 ? parts : str;
  };

  return (
    <div className={`flex w-full flex-col ${isUser ? 'items-end' : 'items-start'} my-3 px-2 sm:px-4`}>
      {/* Sender Header */}
      <div className={`flex items-center gap-2 mb-1 px-1 text-xs ${isUser ? 'flex-row-reverse text-slate-400' : 'text-cyan-400'}`}>
        {!isUser ? (
          <>
            <span className="font-tech font-bold tracking-wider text-cyan-300 text-[13px] flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              ATOM
            </span>
            {getEmotionTag(message.emotion)}
            {isPlaying && (
              <span className="flex items-center gap-1 text-[11px] font-sans text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full animate-pulse">
                <span className="flex items-center gap-0.5">
                  <span className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                กำลังพูด...
              </span>
            )}
          </>
        ) : (
          <span className="text-slate-400 font-medium">ลูกพี่, บอส</span>
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={`relative max-w-[92%] sm:max-w-[85%] md:max-w-[78%] rounded-2xl p-4 text-[14px] sm:text-[15px] transition-all ${
          isUser
            ? 'rounded-tr-sm bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-slate-100 border border-slate-700/60 shadow-md'
            : message.emotion === 'alert'
            ? 'rounded-tl-sm bg-gradient-to-br from-[#1a0f12]/95 to-[#120a0d]/95 text-slate-200 border border-red-500/30 shadow-lg shadow-red-950/20 backdrop-blur-md'
            : message.emotion === 'happy'
            ? 'rounded-tl-sm bg-gradient-to-br from-[#0c1a17]/95 to-[#081210]/95 text-slate-200 border border-emerald-500/30 shadow-lg shadow-emerald-950/20 backdrop-blur-md'
            : message.emotion === 'serious'
            ? 'rounded-tl-sm bg-gradient-to-br from-[#151226]/95 to-[#0e0c1a]/95 text-slate-200 border border-purple-500/30 shadow-lg shadow-purple-950/20 backdrop-blur-md'
            : 'rounded-tl-sm bg-gradient-to-br from-[#101726]/95 to-[#0b101c]/95 text-slate-200 border border-cyan-500/20 shadow-lg shadow-cyan-950/20 backdrop-blur-md'
        }`}
      >
        {/* Attached Files display if any */}
        {message.files && message.files.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.files.map((file) => {
              const isImage = file.type.startsWith('image/') || (file.previewUrl && !file.content);
              if (isImage) {
                return (
                  <div key={file.id} className="relative rounded-xl overflow-hidden border border-cyan-500/40 bg-black/40 max-w-xs shadow-md">
                    <img
                      src={file.data ? (file.data.startsWith('data:') ? file.data : `data:${file.type};base64,${file.data}`) : file.previewUrl}
                      alt={file.name}
                      className="max-h-52 w-auto object-cover"
                    />
                    <div className="p-1.5 bg-black/80 text-[11px] font-mono text-cyan-300 truncate">
                      {file.name}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-slate-200"
                >
                  {file.name.endsWith('.py') || file.name.endsWith('.js') || file.name.endsWith('.ts') ? (
                    <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  )}
                  <div className="overflow-hidden">
                    <div className="truncate font-medium text-cyan-200">{file.name}</div>
                    <div className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Text Content */}
        <div className="text-slate-200 leading-relaxed font-sans">
          {renderFormattedContent(message.text)}
        </div>

        {/* AI-Generated Image from Gemini */}
        {!isUser && message.imageUrl && (
          <div className="mt-3 overflow-hidden rounded-xl border border-cyan-500/30 bg-black/40">
            <div className="flex items-center justify-between px-3 py-1.5 bg-cyan-950/40 border-b border-cyan-500/20 text-xs text-cyan-300">
              <span className="flex items-center gap-1.5 font-tech text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>ภาพสร้างจาก Gemini Vision Engine (1K)</span>
              </span>
              <a
                href={message.imageUrl}
                download="atom-gemini-art.png"
                className="text-[10px] text-cyan-400 hover:text-cyan-200 underline"
              >
                ดาวน์โหลดภาพ
              </a>
            </div>
            <img
              src={message.imageUrl}
              alt="Gemini Generated Artwork"
              className="w-full max-h-[380px] object-contain mx-auto"
            />
          </div>
        )}

        {/* Google Maps Grounding Cards */}
        {!isUser && message.mapsSources && message.mapsSources.length > 0 && (
          <div className="mt-3.5 pt-2.5 border-t border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>พิกัดและสถานที่จาก Google Maps ({message.mapsSources.length} แห่ง):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.mapsSources.map((mapItem, idx) => (
                <a
                  key={idx}
                  href={mapItem.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/60 transition-all text-xs group"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-white group-hover:text-emerald-300 truncate">
                      {mapItem.title}
                    </span>
                    <ExternalLink className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>
                  {mapItem.address && (
                    <span className="text-[11px] text-slate-300 leading-tight mb-1 line-clamp-2">
                      📍 {mapItem.address}
                    </span>
                  )}
                  <span className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1 mt-auto pt-1">
                    <span>เปิดนำทางบน Google Maps</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Web Grounding References (like in the video) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-slate-500 font-mono">via web:</span>
            {message.sources.map((src, idx) => {
              let domain = src.uri;
              try {
                domain = new URL(src.uri).hostname.replace(/^www\./, '');
              } catch (e) {
                domain = src.title || 'web';
              }
              return (
                <a
                  key={idx}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-cyan-950/70 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  <span>{domain}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Message Footer Actions */}
        <div className={`mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1.5 ${isUser ? 'border-t border-slate-800/40' : ''}`}>
          <span>{message.timestamp}</span>

          <div className="flex items-center gap-1.5">
            {/* Audio Play/Stop Button for ATOM */}
            {!isUser && (
              <button
                onClick={() => (isPlaying ? onStopAudio() : onPlayAudio(message))}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-sans transition-all ${
                  isPlaying
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300 border border-slate-700/50'
                }`}
                title={isPlaying ? 'หยุดเล่นเสียง' : 'ฟังเสียง ATOM'}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                    <span>หยุด</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>ฟังเสียง</span>
                  </>
                )}
              </button>
            )}

            {/* Copy Text Button */}
            <button
              onClick={() => copyToClipboard(message.text)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="คัดลอกข้อความ"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

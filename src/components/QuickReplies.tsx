import React from 'react';
import { Sparkles } from 'lucide-react';

interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export const QuickReplies: React.FC<QuickRepliesProps> = ({
  suggestions,
  onSelect,
  disabled = false,
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="w-full px-3 py-2 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 min-w-max pb-1">
        <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400/80 pl-1 mr-1">
          <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>แนะนำ:</span>
        </div>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
            className="inline-flex items-center rounded-full bg-slate-800/80 hover:bg-cyan-950/80 active:scale-95 border border-cyan-500/25 hover:border-cyan-400/60 px-3.5 py-1.5 text-xs text-slate-200 hover:text-cyan-300 font-sans transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-cyan-950/20"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Folder, Task, Note } from '../../types';
import { parseNaturalLanguageInput, ParsedQuickCapture } from '../../utils/quickCaptureParser';
import { 
  Zap, Calendar, Clock, AlertCircle, Tag, Folder as FolderIcon, 
  ArrowRight, FileText, CheckSquare, Sparkles, X, CornerDownLeft
} from 'lucide-react';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onCreateTask: (task: Partial<Task>) => void;
  onCreateNote: (note: Partial<Note>) => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  folders,
  onCreateTask,
  onCreateNote,
}) => {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setInputVal('');
    }
  }, [isOpen]);

  // Live real-time parsing
  const parsed: ParsedQuickCapture = useMemo(() => {
    return parseNaturalLanguageInput(inputVal, folders);
  }, [inputVal, folders]);

  const handleSubmit = (forceNote = false) => {
    if (!inputVal.trim()) return;

    if (parsed.isNote || forceNote) {
      onCreateNote({
        title: parsed.title,
        content: `<p>${parsed.title}</p>`,
        folderId: parsed.folderId,
        tags: parsed.tags,
        wordCount: parsed.title.split(/\s+/).length,
      });
    } else {
      onCreateTask({
        title: parsed.title,
        folderId: parsed.folderId,
        tags: parsed.tags,
        priority: parsed.priority,
        dueDate: parsed.dueDate,
        dueTime: parsed.dueTime,
        estimatedHours: parsed.estimatedHours,
        attentionProfile: parsed.attentionProfile,
        recurrence: parsed.recurrence,
        reminders: parsed.hasReminder ? [
          {
            id: `rem_${Date.now()}`,
            type: 'custom',
            scheduledTime: `${parsed.dueDate || new Date().toISOString().slice(0, 10)}T${parsed.dueTime || '09:00'}:00`,
            dismissed: false,
          }
        ] : [],
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/75 backdrop-blur-sm p-4">
      <div 
        className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span>Natural-Language Quick Capture</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
              Zero Cloud / Local Offline
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-1"
          >
            Esc
          </button>
        </div>

        {/* Input Field */}
        <div className="p-5">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="e.g. Fix login bug tomorrow 3pm !high ~2h *deep #auth @Work"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
          />

          {/* Live Parse Chips Preview */}
          {inputVal.trim() && (
            <div className="mt-4 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Live Parse Intelligence
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {/* Title */}
                <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 font-semibold border border-slate-700">
                  Title: {parsed.title}
                </span>

                {/* Due Date & Time */}
                {parsed.dueDate && (
                  <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {parsed.dueDate} {parsed.dueTime ? `@ ${parsed.dueTime}` : ''}
                  </span>
                )}

                {/* Priority */}
                <span className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-300 border border-orange-500/20 font-bold uppercase text-[10px]">
                  Priority: {parsed.priority}
                </span>

                {/* Estimate */}
                <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  Est: {parsed.estimatedHours}h
                </span>

                {/* Energy */}
                <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  *{parsed.attentionProfile} work
                </span>

                {/* Folder */}
                {parsed.folderName && (
                  <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                    <FolderIcon className="w-3 h-3" />
                    @{parsed.folderName}
                  </span>
                )}

                {/* Tags */}
                {parsed.tags.map(t => (
                  <span key={t} className="px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    #{t}
                  </span>
                ))}

                {/* Recurrence */}
                {parsed.recurrence && (
                  <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    ↻ {parsed.recurrence.frequency}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Syntax Guide */}
          <div className="mt-4 text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
            <span><code className="text-slate-400">!urgent</code> priority</span>
            <span><code className="text-slate-400">tomorrow 3pm</code> due & reminder</span>
            <span><code className="text-slate-400">~2h</code> estimate</span>
            <span><code className="text-slate-400">*deep</code> peak hours</span>
            <span><code className="text-slate-400">#tag</code></span>
            <span><code className="text-slate-400">@Folder</code></span>
            <span><code className="text-slate-400">note:</code> route to notes</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/80">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">Enter</kbd> to save
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSubmit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Save as Note</span>
            </button>
            <button
              onClick={() => handleSubmit(false)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

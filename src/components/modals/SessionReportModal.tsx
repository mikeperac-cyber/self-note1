import React, { useState } from 'react';
import { Task, Folder } from '../../types';
import { 
  Clock, CheckCircle2, FileText, X, Sparkles, Zap, Play
} from 'lucide-react';

export interface SessionReportData {
  task: Task;
  durationSeconds: number;
  durationMinutes: number;
}

interface SessionReportModalProps {
  data: SessionReportData;
  folder?: Folder;
  onClose: () => void;
  onCreateRetroNote: (noteTitle: string, noteContent: string, folderId?: string, tags?: string[]) => void;
  onMarkTaskComplete?: (task: Task) => void;
  onRestartTimer?: (task: Task) => void;
}

export const SessionReportModal: React.FC<SessionReportModalProps> = ({
  data,
  folder,
  onClose,
  onCreateRetroNote,
  onMarkTaskComplete,
  onRestartTimer,
}) => {
  const { task, durationSeconds, durationMinutes } = data;
  const [isMarkedDone, setIsMarkedDone] = useState(task.status === 'completed');

  // Format Duration HH:MM:SS or MM:SS
  const formatSeconds = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins} min ${secs} sec`;
    }
    return `${secs} seconds`;
  };

  const handleCreateRetro = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const retroTitle = `Retrospective: ${task.title}`;
    const retroContent = `# Retrospective: ${task.title}

> **Focus Session Summary**  
> ⏱️ **Duration:** ${formatSeconds(durationSeconds)} (${durationMinutes} min recorded)  
> 📅 **Date:** ${formattedDate}  
> 🎯 **Attention Mode:** ${(task.attentionProfile || 'deep').toUpperCase()}  
> 🏷️ **Tags:** ${task.tags?.map(t => `#${t}`).join(' ') || 'None'}

---

### 🚀 Key Accomplishments
- Focus sprint completed on **${task.title}**

### 💡 Learnings & Key Insights
- 

### ⚡ Roadblocks / Technical Notes
- 

### ⏭️ Next Steps & Follow-ups
- [ ] 
`;

    const noteTags = Array.from(new Set(['Retrospective', ...(task.tags || [])]));
    onCreateRetroNote(retroTitle, retroContent, task.folderId, noteTags);
    onClose();
  };

  const handleToggleComplete = () => {
    if (onMarkTaskComplete) {
      onMarkTaskComplete({
        ...task,
        status: isMarkedDone ? 'in_progress' : 'completed',
        updatedAt: new Date().toISOString(),
      });
      setIsMarkedDone(!isMarkedDone);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 shadow-2xl shadow-indigo-950/80 space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Subtle Gradient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Focus Session Report</span>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Logged
                </span>
              </h2>
              <p className="text-xs text-slate-400">Great work! Session time recorded successfully.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Report"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Details Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 truncate max-w-[240px]">
              {folder ? (
                <span className="font-bold mr-1" style={{ color: folder.color }}>
                  [{folder.name}]
                </span>
              ) : null}
              Task Session
            </span>
            <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-800/60 font-bold">
              {(task.priority || 'medium').toUpperCase()} PRIORITY
            </span>
          </div>

          <h3 className="text-base font-bold text-white leading-snug">
            {task.title}
          </h3>

          {/* Time Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Session Duration
              </span>
              <span className="text-xl font-extrabold text-cyan-300 font-mono tracking-tight">
                {formatSeconds(durationSeconds)}
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3 text-purple-400" /> Total Actual
              </span>
              <span className="text-xl font-extrabold text-purple-300 font-mono tracking-tight">
                {task.actualHours || 0} hrs
              </span>
            </div>
          </div>
        </div>

        {/* Actions & Quick Links */}
        <div className="space-y-3 relative z-10">
          {/* Create Retrospective Note Button */}
          <button
            onClick={handleCreateRetro}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <FileText className="w-4 h-4 text-indigo-200" />
            <span>📝 Create Retrospective Note</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* Mark Task Complete Toggle */}
            {onMarkTaskComplete && (
              <button
                onClick={handleToggleComplete}
                className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  isMarkedDone
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${isMarkedDone ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{isMarkedDone ? 'Task Completed ✓' : 'Mark Task Done'}</span>
              </button>
            )}

            {/* Restart Timer */}
            {onRestartTimer && (
              <button
                onClick={() => {
                  onRestartTimer(task);
                  onClose();
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 text-amber-400" />
                <span>Resume Timer</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Close */}
        <div className="pt-2 text-center relative z-10">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
          >
            Dismiss Report
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Folder, Task, Note, DevProject 
} from '../../types';
import { 
  X, Minimize2, Maximize2, Mic, Zap, FileText, CheckSquare, 
  Terminal, ExternalLink, Sparkles, Check, Clock 
} from 'lucide-react';
import { parseNaturalLanguageInput } from '../../utils/quickCaptureParser';

interface FloatingWindowOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  devProjects: DevProject[];
  onCreateTask: (task: Partial<Task>) => void;
  onCreateNote: (note: Partial<Note>) => void;
  onOpenVoice: () => void;
}

export const FloatingWindowOverlay: React.FC<FloatingWindowOverlayProps> = ({
  isOpen,
  onClose,
  folders,
  devProjects,
  onCreateTask,
  onCreateNote,
  onOpenVoice,
}) => {
  const [activeTab, setActiveTab] = useState<'task' | 'note' | 'dev'>('task');
  const [taskInput, setTaskInput] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedTask = parseNaturalLanguageInput(taskInput, folders);

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    onCreateTask({
      title: parsedTask.title,
      folderId: parsedTask.folderId,
      priority: parsedTask.priority,
      dueDate: parsedTask.dueDate,
      dueTime: parsedTask.dueTime,
      estimatedHours: parsedTask.estimatedHours,
      attentionProfile: parsedTask.attentionProfile,
      recurrence: parsedTask.recurrence,
      tags: parsedTask.tags,
    });

    setTaskInput('');
    setFeedback('Task created!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    onCreateNote({
      title: noteTitle.trim(),
      content: `<p>${noteBody.trim() || noteTitle.trim()}</p>`,
      wordCount: (noteBody || noteTitle).split(/\s+/).filter(Boolean).length,
    });

    setNoteTitle('');
    setNoteBody('');
    setFeedback('Note saved!');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[90vw] bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
      
      {/* Window Titlebar */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between cursor-move select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">Self-Note Floating Quick Hub</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            Always-on-top
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenVoice}
            className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800"
            title="Open Voice Studio"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 text-xs">
        <button
          onClick={() => setActiveTab('task')}
          className={`flex-1 py-2 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'task' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Quick Task</span>
        </button>

        <button
          onClick={() => setActiveTab('note')}
          className={`flex-1 py-2 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'note' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Quick Note</span>
        </button>

        <button
          onClick={() => setActiveTab('dev')}
          className={`flex-1 py-2 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'dev' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Dev Links</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30 px-3 py-1.5 text-xs text-center font-semibold">
          ✓ {feedback}
        </div>
      )}

      {/* Tab 1: Quick Task with Live Natural-Language Chips */}
      {activeTab === 'task' && (
        <form onSubmit={handleSaveTask} className="p-4 space-y-3">
          <div>
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="e.g. Fix navbar tomorrow 4pm !high ~1h *deep"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
              autoFocus
            />
          </div>

          {/* Live Chips */}
          {taskInput.trim() && (
            <div className="flex flex-wrap gap-1 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                Title: {parsedTask.title}
              </span>
              {parsedTask.dueDate && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {parsedTask.dueDate} {parsedTask.dueTime || ''}
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold uppercase">
                {parsedTask.priority}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                *{parsedTask.attentionProfile}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={onOpenVoice}
              className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1"
            >
              <Mic className="w-3.5 h-3.5" /> Dictate
            </button>
            <button
              type="submit"
              disabled={!taskInput.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow disabled:opacity-40 cursor-pointer"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Quick Note */}
      {activeTab === 'note' && (
        <form onSubmit={handleSaveNote} className="p-4 space-y-2.5">
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Document title..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-bold"
          />
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Write brief notes or thoughts..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!noteTitle.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow disabled:opacity-40 cursor-pointer"
            >
              Save Document
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Dev Quick Links */}
      {activeTab === 'dev' && (
        <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
          {devProjects.map(proj => (
            <div 
              key={proj.id}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="truncate mr-2">
                <div className="font-bold text-slate-200 truncate">{proj.name}</div>
                <div className="text-[10px] text-emerald-400">● {proj.env}</div>
              </div>
              <div className="flex items-center gap-1">
                {proj.vercelUrl && (
                  <a
                    href={proj.vercelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded hover:bg-slate-800 text-indigo-400"
                    title="Open Production"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

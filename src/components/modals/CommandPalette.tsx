import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, FileText, CheckSquare, FileSpreadsheet, Terminal, 
  Mic, Sparkles, Plus, Download, Zap, Compass, X
} from 'lucide-react';
import { Note, Task, SheetData, DevProject } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  tasks: Task[];
  sheets: SheetData[];
  devProjects: DevProject[];
  onSelectNote: (noteId: string) => void;
  onSelectTask: (taskId: string) => void;
  onSelectSheet: (sheetId: string) => void;
  onSelectProject: (projectId: string) => void;
  onOpenVoice: () => void;
  onOpenQuickCapture: () => void;
  onExportBackup: () => void;
  onSwitchModule: (module: 'notes' | 'tasks' | 'sheets' | 'devhub' | 'focus') => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notes,
  tasks,
  sheets,
  devProjects,
  onSelectNote,
  onSelectTask,
  onSelectSheet,
  onSelectProject,
  onOpenVoice,
  onOpenQuickCapture,
  onExportBackup,
  onSwitchModule,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search items
  const matchedNotes = query ? notes.filter(n => n.title.toLowerCase().includes(query.toLowerCase())).slice(0, 3) : [];
  const matchedTasks = query ? tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 3) : [];
  const matchedSheets = query ? sheets.filter(s => s.title.toLowerCase().includes(query.toLowerCase())).slice(0, 2) : [];
  const matchedProjects = query ? devProjects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 2) : [];

  // Default quick actions if query is empty or matched
  const quickActions = [
    { id: 'act_qc', title: 'Quick Capture Task / Note (Ctrl+Shift+N)', icon: Zap, action: () => { onOpenQuickCapture(); onClose(); } },
    { id: 'act_voice', title: 'Open Voice Capture Studio (Ctrl+Shift+V)', icon: Mic, action: () => { onOpenVoice(); onClose(); } },
    { id: 'act_tasks', title: 'Go to Kanban Tasks Board', icon: CheckSquare, action: () => { onSwitchModule('tasks'); onClose(); } },
    { id: 'act_notes', title: 'Go to Notes & Docs Editor', icon: FileText, action: () => { onSwitchModule('notes'); onClose(); } },
    { id: 'act_sheets', title: 'Go to Formula Sheets & Tables', icon: FileSpreadsheet, action: () => { onSwitchModule('sheets'); onClose(); } },
    { id: 'act_dev', title: 'Go to Dev & Vercel Deployment Hub', icon: Terminal, action: () => { onSwitchModule('devhub'); onClose(); } },
    { id: 'act_focus', title: 'Go to Focus & Energy Auto-Planner', icon: Compass, action: () => { onSwitchModule('focus'); onClose(); } },
    { id: 'act_backup', title: 'Export Full Data Backup (JSON)', icon: Download, action: () => { onExportBackup(); onClose(); } },
  ].filter(act => !query || act.title.toLowerCase().includes(query.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-sm p-4">
      <div 
        className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950">
          <Search className="w-4 h-4 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search notes, tasks, or sheets..."
            className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Esc
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          
          {/* Notes Results */}
          {matchedNotes.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1">Notes & Docs</div>
              {matchedNotes.map(n => (
                <div
                  key={n.id}
                  onClick={() => { onSelectNote(n.id); onSwitchModule('notes'); onClose(); }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-xs text-slate-200 cursor-pointer transition-colors"
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold truncate flex-1">{n.title}</span>
                  <span className="text-[10px] text-slate-500">Document</span>
                </div>
              ))}
            </div>
          )}

          {/* Tasks Results */}
          {matchedTasks.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1">Tasks & Projects</div>
              {matchedTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => { onSelectTask(t.id); onSwitchModule('tasks'); onClose(); }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-xs text-slate-200 cursor-pointer transition-colors"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold truncate flex-1">{t.title}</span>
                  <span className="text-[10px] text-slate-500">{t.priority}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sheets Results */}
          {matchedSheets.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1">Sheets & Tables</div>
              {matchedSheets.map(s => (
                <div
                  key={s.id}
                  onClick={() => { onSelectSheet(s.id); onSwitchModule('sheets'); onClose(); }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-xs text-slate-200 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold truncate flex-1">{s.title}</span>
                  <span className="text-[10px] text-slate-500">{s.mode}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dev Projects */}
          {matchedProjects.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1">Dev Hub Projects</div>
              {matchedProjects.map(p => (
                <div
                  key={p.id}
                  onClick={() => { onSelectProject(p.id); onSwitchModule('devhub'); onClose(); }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-xs text-slate-200 cursor-pointer transition-colors"
                >
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold truncate flex-1">{p.name}</span>
                  <span className="text-[10px] text-slate-500">Repository</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1">Commands & Actions</div>
              {quickActions.map(act => {
                const IconComponent = act.icon;
                return (
                  <div
                    key={act.id}
                    onClick={act.action}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-xs text-slate-200 cursor-pointer transition-colors"
                  >
                    <IconComponent className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium truncate flex-1">{act.title}</span>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

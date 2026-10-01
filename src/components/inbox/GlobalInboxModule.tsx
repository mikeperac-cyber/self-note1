import React, { useState, useMemo } from 'react';
import { Task, Note, Folder, DevProject } from '../../types';
import { 
  Inbox, Zap, Mic, Camera, FileText, CheckSquare, Sparkles, 
  Folder as FolderIcon, ArrowRight, Tag, Calendar, Clock, AlertCircle, 
  Trash2, CheckCircle2, Search, Filter, RotateCcw, Check, MoveRight,
  Sparkle, Layers, ChevronRight, ChevronDown, CornerDownLeft, Maximize2, Minimize2,
  LayoutGrid, List
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AIDailyDigestCard } from './AIDailyDigestCard';

interface GlobalInboxModuleProps {
  tasks: Task[];
  notes: Note[];
  folders: Folder[];
  devProjects?: DevProject[];
  onSaveTask: (task: Task) => void;
  onSaveNote: (note: Note) => void;
  onCreateTask: (task: Partial<Task>) => void;
  onCreateNote: (note: Partial<Note>) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenVoiceCapture: () => void;
  onOpenScreenshot: () => void;
  onOpenQuickCapture: () => void;
}

type CaptureSourceFilter = 'all' | 'voice' | 'screenshot' | 'text' | 'task' | 'note';
type InboxViewLayout = 'spacious' | 'list';

export const GlobalInboxModule: React.FC<GlobalInboxModuleProps> = ({
  tasks,
  notes,
  folders,
  devProjects = [],
  onSaveTask,
  onSaveNote,
  onCreateTask,
  onCreateNote,
  onDeleteTask,
  onDeleteNote,
  onOpenVoiceCapture,
  onOpenScreenshot,
  onOpenQuickCapture,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<CaptureSourceFilter>('all');
  const [viewLayout, setViewLayout] = useState<InboxViewLayout>('spacious');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [quickInputText, setQuickInputText] = useState('');
  const [targetFolderForBatch, setTargetFolderForBatch] = useState<string>('');
  const [foldedItemIds, setFoldedItemIds] = useState<Record<string, boolean>>({});

  const toggleFold = (id: string) => {
    setFoldedItemIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFoldAll = () => {
    const allFolded: Record<string, boolean> = {};
    inboxItems.forEach(i => { allFolded[i.id] = true; });
    setFoldedItemIds(allFolded);
  };

  const handleUnfoldAll = () => {
    setFoldedItemIds({});
  };

  // Identify unfiled / inbox items (folderId is missing, empty, or 'inbox')
  const unfiledTasks = useMemo(() => {
    return tasks.filter(t => !t.folderId || t.folderId === '' || t.folderId === 'inbox');
  }, [tasks]);

  const unfiledNotes = useMemo(() => {
    return notes.filter(n => !n.folderId || n.folderId === '' || n.folderId === 'inbox');
  }, [notes]);

  // Aggregate Inbox items into unified inbox cards
  const inboxItems = useMemo(() => {
    const taskItems = unfiledTasks.map(t => {
      const isVoice = t.tags?.includes('voice') || t.title.toLowerCase().includes('voice');
      const isScreenshot = t.tags?.includes('screenshot') || t.title.toLowerCase().includes('screenshot');
      const type: CaptureSourceFilter = isVoice ? 'voice' : isScreenshot ? 'screenshot' : 'task';

      return {
        id: t.id,
        itemType: 'task' as const,
        captureType: type,
        title: t.title,
        content: t.description || '',
        createdAt: t.createdAt,
        tags: t.tags || [],
        original: t,
      };
    });

    const noteItems = unfiledNotes.map(n => {
      const isVoice = n.tags?.includes('voice') || n.title.toLowerCase().includes('voice');
      const isScreenshot = n.tags?.includes('screenshot') || n.title.toLowerCase().includes('screenshot') || n.content.includes('data:image');
      const type: CaptureSourceFilter = isVoice ? 'voice' : isScreenshot ? 'screenshot' : 'note';

      return {
        id: n.id,
        itemType: 'note' as const,
        captureType: type,
        title: n.title,
        content: n.content || '',
        createdAt: n.updatedAt || n.createdAt,
        tags: n.tags || [],
        original: n,
      };
    });

    const combined = [...taskItems, ...noteItems];

    // Filter by search & source type
    return combined.filter(item => {
      if (sourceFilter !== 'all' && item.captureType !== sourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchTag = item.tags.some(tag => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchContent && !matchTag) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [unfiledTasks, unfiledNotes, sourceFilter, searchQuery]);

  // Quick Capture Submission inside Inbox
  const handleInboxQuickCapture = (asTask: boolean) => {
    if (!quickInputText.trim()) return;

    if (asTask) {
      onCreateTask({
        title: quickInputText.trim(),
        folderId: undefined, // keep in Inbox
        tags: ['inbox-capture'],
        priority: 'medium',
        estimatedHours: 1,
      });
    } else {
      onCreateNote({
        title: quickInputText.trim(),
        content: `<p>${quickInputText.trim()}</p>`,
        folderId: undefined, // keep in Inbox
        tags: ['inbox-capture'],
      });
    }

    setQuickInputText('');
  };

  // 1-Click File to Folder
  const handleFileToFolder = (item: typeof inboxItems[0], folderId: string) => {
    if (item.itemType === 'task') {
      onSaveTask({ ...item.original, folderId, updatedAt: new Date().toISOString() });
    } else {
      onSaveNote({ ...item.original, folderId, updatedAt: new Date().toISOString() });
    }
  };

  // Convert Note to Task
  const handleConvertNoteToTask = (note: Note) => {
    onCreateTask({
      title: note.title,
      description: note.content.replace(/<[^>]*>/g, ''),
      folderId: note.folderId,
      tags: note.tags,
      priority: 'medium',
    });
    onDeleteNote(note.id);
  };

  // Convert Task to Note
  const handleConvertTaskToNote = (task: Task) => {
    onCreateNote({
      title: task.title,
      content: `<p>${task.description || task.title}</p>`,
      folderId: task.folderId,
      tags: task.tags,
    });
    onDeleteTask(task.id);
  };

  // Batch Triage File
  const handleBatchFile = () => {
    if (!targetFolderForBatch) return;

    selectedItemIds.forEach(id => {
      const item = inboxItems.find(i => i.id === id);
      if (item) {
        handleFileToFolder(item, targetFolderForBatch);
      }
    });

    setSelectedItemIds([]);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
  };

  // Batch Delete
  const handleBatchDelete = () => {
    selectedItemIds.forEach(id => {
      const item = inboxItems.find(i => i.id === id);
      if (item) {
        if (item.itemType === 'task') onDeleteTask(item.id);
        else onDeleteNote(item.id);
      }
    });
    setSelectedItemIds([]);
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === inboxItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(inboxItems.map(i => i.id));
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden text-slate-100 font-sans">
      
      {/* 1. TOP HERO HEADER & QUICK CAPTURE TOOLBAR */}
      <div className="px-8 py-6 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex flex-col gap-5 flex-shrink-0">
        
        <div className="flex items-center justify-between gap-6 flex-wrap">
          {/* Title & Stats */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <Inbox className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black text-white tracking-tight">Global Inbox</h1>
                <span className="px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-xs font-extrabold border border-indigo-500/30 shadow-sm">
                  {inboxItems.length} unfiled items
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
                Central triage hub for raw voice notes, screenshots, and quick captures before filing into workspace folders.
              </p>
            </div>
          </div>

          {/* Quick Capture Trigger Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenVoiceCapture}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold cursor-pointer transition-all shadow-sm hover:scale-105 active:scale-95"
              title="Voice Memo Capture"
            >
              <Mic className="w-4 h-4 text-purple-400" />
              <span>Voice Memo</span>
            </button>

            <button
              onClick={onOpenScreenshot}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer transition-all shadow-sm hover:scale-105 active:scale-95"
              title="Screenshot Snip"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Screenshot</span>
            </button>

            <button
              onClick={onOpenQuickCapture}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md shadow-indigo-600/20 hover:scale-105 active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Quick Capture Modal</span>
            </button>
          </div>
        </div>

        {/* INBOX QUICK INPUT BAR */}
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800/90 rounded-2xl p-2.5 shadow-inner focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <Zap className="w-4 h-4 text-indigo-400 ml-2 flex-shrink-0 animate-pulse" />
          <input
            type="text"
            value={quickInputText}
            onChange={(e) => setQuickInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleInboxQuickCapture(!e.shiftKey);
              }
            }}
            placeholder="Type an item or raw note directly into Inbox (Press Enter for Task, Shift+Enter for Note)..."
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-1"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInboxQuickCapture(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 text-xs font-bold border border-indigo-500/40 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Add Task</span>
            </button>
            <button
              onClick={() => handleInboxQuickCapture(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Add Note</span>
            </button>
          </div>
        </div>

      </div>

      {/* 2. FILTER, LAYOUT & BATCH ACTION BAR */}
      <div className="px-8 py-3.5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-6 flex-wrap flex-shrink-0">
        
        {/* Source Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: 'all', label: 'All Captures', icon: Inbox, count: inboxItems.length },
            { key: 'voice', label: 'Voice Memos', icon: Mic, count: inboxItems.filter(i => i.captureType === 'voice').length },
            { key: 'screenshot', label: 'Screenshots', icon: Camera, count: inboxItems.filter(i => i.captureType === 'screenshot').length },
            { key: 'task', label: 'Unfiled Tasks', icon: CheckSquare, count: inboxItems.filter(i => i.itemType === 'task' && i.captureType !== 'voice' && i.captureType !== 'screenshot').length },
            { key: 'note', label: 'Unfiled Notes', icon: FileText, count: inboxItems.filter(i => i.itemType === 'note' && i.captureType !== 'voice' && i.captureType !== 'screenshot').length },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = sourceFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSourceFilter(tab.key as CaptureSourceFilter)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md font-bold'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Section: View Layout, Search & Batch Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Layout Mode Switcher */}
          <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewLayout('spacious')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                viewLayout === 'spacious' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Spacious Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewLayout('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                viewLayout === 'list' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Clean Stream List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Stream</span>
            </button>
          </div>

          {/* Fold / Unfold All */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handleFoldAll}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center gap-1 transition-colors"
              title="Fold all cards into compact strips"
            >
              <Minimize2 className="w-3 h-3 text-indigo-400" />
              <span>Fold</span>
            </button>
            <button
              onClick={handleUnfoldAll}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center gap-1 transition-colors"
              title="Expand all cards"
            >
              <Maximize2 className="w-3 h-3 text-emerald-400" />
              <span>Unfold</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search unfiled inbox..."
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 w-48 font-medium"
            />
          </div>

          {/* Batch Actions Bar */}
          {selectedItemIds.length > 0 && (
            <div className="flex items-center gap-2 bg-indigo-950/90 border border-indigo-500/50 px-3 py-1 rounded-xl animate-in fade-in">
              <span className="text-xs text-indigo-300 font-extrabold">{selectedItemIds.length} selected</span>
              <select
                value={targetFolderForBatch}
                onChange={(e) => setTargetFolderForBatch(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <option value="">Select Folder...</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                onClick={handleBatchFile}
                disabled={!targetFolderForBatch}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                File
              </button>
              <button
                onClick={handleBatchDelete}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 cursor-pointer transition-colors"
                title="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>

      {/* 3. INBOX CARDS AREA & AI DAILY DIGEST */}
      <div className="flex-1 overflow-auto p-8 space-y-8">
        
        {/* AI Daily Digest Summary Card */}
        <AIDailyDigestCard
          tasks={tasks}
          notes={notes}
          onSaveTask={onSaveTask}
        />

        {inboxItems.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-12 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-4">
            <div className="p-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xl shadow-emerald-500/10 animate-bounce">
              <Sparkles className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Inbox Zero Achieved! 🎉</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                All voice notes, screenshots, and quick captures have been processed and filed into workspace folders.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onOpenQuickCapture}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Capture New Item</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={
            viewLayout === 'spacious'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              : "flex flex-col space-y-4 max-w-5xl mx-auto"
          }>
            {inboxItems.map(item => {
              const isSelected = selectedItemIds.includes(item.id);
              const isFolded = !!foldedItemIds[item.id];

              return (
                <div
                  key={item.id}
                  className={`group relative bg-slate-900/90 border rounded-2xl transition-all flex flex-col justify-between gap-4 shadow-md ${
                    isFolded ? 'p-4' : 'p-6'
                  } ${
                    isSelected 
                      ? 'border-indigo-500/90 ring-2 ring-indigo-500/30 bg-indigo-950/30 shadow-indigo-500/10' 
                      : 'border-slate-800/90 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5'
                  }`}
                >
                  {/* Card Header: Checkbox, Badge & Fold Toggle */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedItemIds(prev =>
                            prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                          );
                        }}
                        className="w-4 h-4 rounded text-indigo-600 cursor-pointer accent-indigo-600"
                      />

                      {item.captureType === 'voice' && (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                          <Mic className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                          <span>Voice Capture</span>
                        </span>
                      )}
                      {item.captureType === 'screenshot' && (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                          <Camera className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Screenshot</span>
                        </span>
                      )}
                      {item.itemType === 'task' && item.captureType !== 'voice' && item.captureType !== 'screenshot' && (
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Unfiled Task</span>
                        </span>
                      )}
                      {item.itemType === 'note' && item.captureType !== 'voice' && item.captureType !== 'screenshot' && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Unfiled Note</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                      <button
                        onClick={() => toggleFold(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title={isFolded ? 'Unfold card' : 'Fold card'}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFolded ? '-rotate-90 text-slate-500' : 'text-indigo-400'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Folded Compact Strip View */}
                  {isFolded ? (
                    <div 
                      onClick={() => toggleFold(item.id)}
                      className="cursor-pointer flex items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs hover:text-indigo-300 transition-colors"
                    >
                      <h3 className="font-bold text-slate-200 truncate flex-1">
                        {item.title}
                      </h3>
                      <span className="text-[10px] text-indigo-400 font-mono font-semibold flex-shrink-0">
                        Click to unfold →
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Full Body Content with Generous Line Height & Spacing */}
                      <div className="space-y-2 flex-1 my-1">
                        <h3 className="text-base font-extrabold text-white leading-snug tracking-tight">
                          {item.title}
                        </h3>
                        {item.content && (
                          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                            <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-4">
                              {item.content.replace(/<[^>]*>/g, '')}
                            </p>
                          </div>
                        )}

                        {/* Tag Chips */}
                        {item.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {item.tags.map(tag => (
                              <span key={tag} className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5 text-indigo-400" />
                                <span>#{tag}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: 1-Click Folder Filing Bar */}
                      <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <FolderIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleFileToFolder(item, e.target.value);
                              }
                            }}
                            defaultValue=""
                            className="bg-slate-950 border border-slate-700/80 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-full cursor-pointer font-medium"
                          >
                            <option value="" disabled>1-Click File to Folder...</option>
                            {folders.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Convert Button & Delete */}
                        <div className="flex items-center gap-2">
                          {item.itemType === 'note' ? (
                            <button
                              onClick={() => handleConvertNoteToTask(item.original as Note)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5 transition-colors"
                              title="Convert to Task"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                              <span>→ Convert Task</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConvertTaskToNote(item.original as Task)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5 transition-colors"
                              title="Convert to Note"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-400" />
                              <span>→ Convert Note</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (item.itemType === 'task') onDeleteTask(item.id);
                              else onDeleteNote(item.id);
                            }}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};

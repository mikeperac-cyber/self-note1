import React, { useState, useRef, useEffect } from 'react';
import { AppModule, Folder, Task, Note, SheetData, DailyFocusGoal } from '../../types';
import { 
  Home, ChevronRight, Inbox, CheckSquare, FileText, FileSpreadsheet, 
  Terminal, Compass, Folder as FolderIcon, Tag, X, ChevronDown, Check,
  Briefcase, Code, User, Palette, Lightbulb, Heart, BookOpen, Layers,
  Sparkles, Star, Target, Shield, Zap
} from 'lucide-react';

export const FOLDER_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Briefcase,
  Code,
  User,
  Palette,
  Lightbulb,
  Heart,
  BookOpen,
  Layers,
  Terminal,
  Sparkles,
  Star,
  Target,
  Shield,
  Compass,
  Zap,
};

interface BreadcrumbsBarProps {
  activeModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  folders: Folder[];
  activeFolderId?: string;
  onSelectFolder: (folderId: string | undefined) => void;
  selectedTags?: string[];
  onRemoveTag?: (tag: string) => void;
  onClearTags?: () => void;
  tasks?: Task[];
  notes?: Note[];
  sheets?: SheetData[];
  dailyGoal?: DailyFocusGoal | null;
}

export const MODULE_CONFIG: Record<AppModule, { name: string; icon: React.FC<{ className?: string }>; description: string }> = {
  inbox: { name: 'Global Inbox', icon: Inbox, description: 'Unified triage & quick capture stream' },
  tasks: { name: 'Tasks & Projects', icon: CheckSquare, description: 'Kanban, Gantt & checklist manager' },
  notes: { name: 'Smart Notes', icon: FileText, description: 'Knowledge base & markdown documents' },
  sheets: { name: 'Data Sheets', icon: FileSpreadsheet, description: 'Interactive tables & spreadsheet formulas' },
  devhub: { name: 'Dev Engineering Hub', icon: Terminal, description: 'Repository tools & terminal integrations' },
  focus: { name: 'Focus Studio', icon: Compass, description: 'Time-blocking & energy management' },
};

export const BreadcrumbsBar: React.FC<BreadcrumbsBarProps> = ({
  activeModule,
  onSelectModule,
  folders,
  activeFolderId,
  onSelectFolder,
  selectedTags = [],
  onRemoveTag,
  onClearTags,
  tasks = [],
  notes = [],
  sheets = [],
  dailyGoal,
}) => {
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const moduleMeta = MODULE_CONFIG[activeModule] || MODULE_CONFIG.tasks;
  const ModuleIcon = moduleMeta.icon;

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const FolderIconComponent = activeFolder?.icon ? (FOLDER_ICONS[activeFolder.icon] || FolderIcon) : FolderIcon;

  // Compute item counts for the active folder context
  const folderTaskCount = activeFolderId ? tasks.filter(t => t.folderId === activeFolderId).length : tasks.length;
  const folderNoteCount = activeFolderId ? notes.filter(n => n.folderId === activeFolderId).length : notes.length;
  const folderSheetCount = activeFolderId ? sheets.filter(s => s.folderId === activeFolderId).length : sheets.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFolderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav 
      aria-label="Breadcrumb navigation"
      className="bg-slate-900/40 border-b border-slate-800/80 px-6 py-2 flex items-center justify-between text-xs flex-shrink-0 select-none backdrop-blur-sm overflow-x-auto"
    >
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        
        {/* ROOT BREADCRUMB: HOME / WORKSPACE */}
        <button
          onClick={() => {
            onSelectFolder(undefined);
            if (onClearTags) onClearTags();
          }}
          className="flex items-center gap-1.5 font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
          title="Reset folder filter and view Workspace root"
        >
          <Home className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Workspace</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />

        {/* MODULE BREADCRUMB */}
        <button
          onClick={() => {
            onSelectFolder(undefined);
            if (onClearTags) onClearTags();
          }}
          className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer rounded-lg px-2 py-1 ${
            !activeFolderId && selectedTags.length === 0
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={moduleMeta.description}
        >
          <ModuleIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="truncate">{moduleMeta.name}</span>
        </button>

        {/* FOLDER BREADCRUMB WITH DROPDOWN */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            
            <button
              onClick={() => setIsFolderDropdownOpen(prev => !prev)}
              className={`flex items-center gap-2 font-semibold transition-all cursor-pointer rounded-lg px-2.5 py-1 text-xs border ${
                activeFolder
                  ? 'bg-slate-800 text-white border-slate-700 hover:border-slate-600 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {activeFolder ? (
                <>
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: activeFolder.color || '#6366f1' }}
                  />
                  <FolderIconComponent className="w-3.5 h-3.5 text-slate-300" />
                  <span className="font-bold text-slate-100">{activeFolder.name}</span>
                </>
              ) : (
                <>
                  <FolderIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>All Folders</span>
                </>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {/* Quick Clear Folder Button if active */}
            {activeFolder && (
              <button
                onClick={() => onSelectFolder(undefined)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear folder filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* FOLDER DROPDOWN MENU */}
          {isFolderDropdownOpen && (
            <div className="absolute left-0 top-8 z-50 w-64 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between border-b border-slate-800">
                <span>Select Folder View</span>
                <span className="text-[9px] text-indigo-400">{folders.length} available</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                {/* All Folders option */}
                <button
                  onClick={() => {
                    onSelectFolder(undefined);
                    setIsFolderDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                    !activeFolderId 
                      ? 'bg-indigo-600 text-white font-bold' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>All Folders</span>
                  </div>
                  {!activeFolderId && <Check className="w-3.5 h-3.5 text-white" />}
                </button>

                {folders.map(folder => {
                  const IconComp = folder.icon ? (FOLDER_ICONS[folder.icon] || FolderIcon) : FolderIcon;
                  const isSelected = folder.id === activeFolderId;
                  const tCount = tasks.filter(t => t.folderId === folder.id).length;
                  const nCount = notes.filter(n => n.folderId === folder.id).length;

                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        onSelectFolder(folder.id);
                        setIsFolderDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-600 text-white font-bold' 
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: folder.color }}
                        />
                        <IconComp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[10px] opacity-80 font-mono">
                        <span>{tCount + nCount} items</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white ml-1" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* TAG BREADCRUMBS (IF TAGS ACTIVE) */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 rounded-lg"
                >
                  <Tag className="w-3 h-3 text-cyan-400" />
                  <span>#{tag}</span>
                  {onRemoveTag && (
                    <button
                      onClick={() => onRemoveTag(tag)}
                      className="p-0.5 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/30 transition-colors cursor-pointer"
                      title={`Remove #${tag} filter`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* CONTEXT COUNTS & DAILY FOCUS GOAL CHIP */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {dailyGoal && dailyGoal.date === new Date().toISOString().slice(0, 10) && (
          <button
            onClick={() => onSelectModule('focus')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              dailyGoal.isCompleted
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                : 'bg-purple-950/60 text-purple-300 border-purple-500/40 hover:bg-purple-900/60'
            }`}
            title="Click to manage Daily Focus Goal in Focus Studio"
          >
            <Target className={`w-3.5 h-3.5 ${dailyGoal.isCompleted ? 'text-emerald-400' : 'text-purple-400 animate-pulse'}`} />
            <span className="max-w-[180px] lg:max-w-[260px] truncate">
              {dailyGoal.isCompleted ? 'Goal Achieved: ' : 'Objective: '}
              {dailyGoal.goalText}
            </span>
          </button>
        )}

        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
          {activeModule === 'tasks' && (
            <span><strong>{folderTaskCount}</strong> task{folderTaskCount !== 1 ? 's' : ''}</span>
          )}
          {activeModule === 'notes' && (
            <span><strong>{folderNoteCount}</strong> document{folderNoteCount !== 1 ? 's' : ''}</span>
          )}
          {activeModule === 'sheets' && (
            <span><strong>{folderSheetCount}</strong> sheet{folderSheetCount !== 1 ? 's' : ''}</span>
          )}
          {activeModule !== 'tasks' && activeModule !== 'notes' && activeModule !== 'sheets' && (
            <span><strong>{folderTaskCount + folderNoteCount}</strong> active items</span>
          )}
        </div>
      </div>

    </nav>
  );
};

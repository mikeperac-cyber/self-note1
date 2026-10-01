import React, { useState } from 'react';
import { 
  Folder as FolderIcon, ChevronRight, ChevronDown, Plus, FileText, 
  Sparkles, Pin, Star, Trash2, Search, Briefcase, Layers, Users, Globe
} from 'lucide-react';
import { Note, Folder } from '../../types';

interface MultilevelPageTreeProps {
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string;
  onSelectNote: (id: string) => void;
  onCreateNote: (folderId?: string, parentNoteId?: string) => void;
  onDeleteNote: (id: string) => void;
  onTogglePinNote: (id: string) => void;
  onToggleFavNote: (id: string) => void;
}

export const WORKSPACE_HUBS = [
  { id: 'hub_engineering', name: 'Product Engineering Hub', icon: <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> },
  { id: 'hub_clients', name: 'Client Operations & Accounts', icon: <Users className="w-3.5 h-3.5 text-cyan-400" /> },
  { id: 'hub_design', name: 'Design & UX Systems', icon: <Layers className="w-3.5 h-3.5 text-pink-400" /> },
];

export const MultilevelPageTree: React.FC<MultilevelPageTreeProps> = ({
  notes,
  folders,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onTogglePinNote,
  onToggleFavNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHub, setActiveHub] = useState<string>('hub_engineering');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Top-level notes (no parentNoteId)
  const rootNotes = notes.filter(n => !n.parentNoteId);

  const renderNoteTreeNode = (note: Note, depth = 0) => {
    const childNotes = notes.filter(n => n.parentNoteId === note.id);
    const hasChildren = childNotes.length > 0;
    const isExpanded = expandedNodes[note.id] ?? true;
    const isSelected = selectedNoteId === note.id;

    if (searchQuery.trim() && !note.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return null;
    }

    return (
      <div key={note.id} className="flex flex-col">
        <div
          onClick={() => onSelectNote(note.id)}
          className={`group flex items-center justify-between py-1.5 px-2 rounded-xl text-xs cursor-pointer transition-all ${
            isSelected 
              ? 'bg-indigo-600/30 text-white font-semibold border border-indigo-500/40 shadow-sm' 
              : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(note.id, e)}
                className="p-0.5 text-slate-400 hover:text-white rounded"
              >
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <span className="w-3.5" />
            )}

            <span className="text-sm flex-shrink-0">{note.coverIcon || '📄'}</span>
            <span className="truncate">{note.title || 'Untitled Page'}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateNote(note.folderId, note.id);
              }}
              title="Add Sub-page"
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-indigo-300 rounded cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNote(note.id);
              }}
              title="Delete Page"
              className="p-1 hover:bg-rose-950 text-rose-400 rounded cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Child Pages Nesting */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {childNotes.map(child => renderNoteTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/60 overflow-hidden">
      
      {/* Workspace Hub Selector */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shared Workspace Hub</span>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono border border-indigo-500/30">M365 Synced</span>
        </div>

        <select
          value={activeHub}
          onChange={(e) => setActiveHub(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {WORKSPACE_HUBS.map(hub => (
            <option key={hub.id} value={hub.id}>{hub.name}</option>
          ))}
        </select>
      </div>

      {/* Search & New Page Button */}
      <div className="p-3 border-b border-slate-800 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={() => onCreateNote()}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-md shadow-indigo-600/20"
          title="Create New Page"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Multilevel Tree View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {rootNotes.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 space-y-2">
            <p>No workspace pages yet.</p>
            <button
              onClick={() => onCreateNote()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold cursor-pointer hover:bg-indigo-600/30"
            >
              + Create First Page
            </button>
          </div>
        ) : (
          rootNotes.map(note => renderNoteTreeNode(note))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[10px] text-slate-500 flex items-center justify-between">
        <span>{notes.length} Total Workspace Pages</span>
        <span className="text-emerald-400 font-mono font-semibold">● Live Sync</span>
      </div>

    </div>
  );
};

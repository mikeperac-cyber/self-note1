import React, { useState } from 'react';
import { Folder } from '../../types';
import { 
  Folder as FolderIcon, Plus, Trash2, Edit2, Check, X, Palette, 
  Briefcase, Code, User, Lightbulb, Heart, BookOpen, Layers, 
  Terminal, Sparkles, Star, Target, Shield, Compass, Zap
} from 'lucide-react';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  onSaveFolders: (folders: Folder[]) => void;
}

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

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#64748b', // Slate
];

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  onSaveFolders,
}) => {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(COLOR_PRESETS[0]);
  const [folderIcon, setFolderIcon] = useState('Briefcase');
  const [folderScope, setFolderScope] = useState<'all' | 'notes' | 'tasks' | 'sheets'>('all');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingFolderId('new');
    setFolderName('');
    setFolderColor(COLOR_PRESETS[0]);
    setFolderIcon('Briefcase');
    setFolderScope('all');
  };

  const handleStartEdit = (f: Folder) => {
    setEditingFolderId(f.id);
    setFolderName(f.name);
    setFolderColor(f.color);
    setFolderIcon(f.icon);
    setFolderScope(f.scope || 'all');
  };

  const handleSave = () => {
    if (!folderName.trim()) return;

    if (editingFolderId === 'new') {
      const newFolder: Folder = {
        id: `f_${Date.now()}`,
        name: folderName.trim(),
        color: folderColor,
        icon: folderIcon,
        scope: folderScope,
      };
      onSaveFolders([...folders, newFolder]);
    } else {
      const updated = folders.map(f => 
        f.id === editingFolderId 
          ? { ...f, name: folderName.trim(), color: folderColor, icon: folderIcon, scope: folderScope }
          : f
      );
      onSaveFolders(updated);
    }
    setEditingFolderId(null);
  };

  const handleDelete = (folderId: string) => {
    onSaveFolders(folders.filter(f => f.id !== folderId));
    if (editingFolderId === folderId) {
      setEditingFolderId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Custom Folder Manager</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          
          {/* Active Edit Form */}
          {editingFolderId ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold text-indigo-300">
                  {editingFolderId === 'new' ? 'Create New Folder' : 'Edit Folder Settings'}
                </span>
                <button
                  onClick={() => setEditingFolderId(null)}
                  className="text-slate-500 hover:text-slate-300 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Folder Name</label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Mobile App Dev"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              {/* Color Presets */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Folder Accent Color</label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFolderColor(c)}
                      className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                        folderColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={folderColor}
                    onChange={(e) => setFolderColor(e.target.value)}
                    className="w-7 h-7 rounded border-none bg-transparent cursor-pointer ml-2"
                    title="Custom Hex Color Picker"
                  />
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Lucide Icon</label>
                <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-900 rounded-lg border border-slate-800">
                  {Object.entries(FOLDER_ICONS).map(([name, IconComponent]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setFolderIcon(name)}
                      className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[10px] transition-colors cursor-pointer ${
                        folderIcon === name ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="truncate w-full text-center">{name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingFolderId(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Save Folder
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartCreate}
              className="w-full py-2.5 rounded-xl border border-dashed border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Folder</span>
            </button>
          )}

          {/* List of Existing Folders */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Existing Folders ({folders.length})
            </span>
            {folders.map(f => {
              const IconComp = FOLDER_ICONS[f.icon] || FolderIcon;
              return (
                <div 
                  key={f.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: `${f.color}25`, color: f.color }}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{f.name}</div>
                      <div className="text-[10px] text-slate-500">Scope: {f.scope || 'all'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(f)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit Folder"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

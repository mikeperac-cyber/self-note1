import React from 'react';
import { History, RotateCcw, X, Clock, Check, Shield } from 'lucide-react';
import { NoteVersion } from '../../types';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions?: NoteVersion[];
  onRestoreVersion: (version: NoteVersion) => void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  versions = [],
  onRestoreVersion
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900/90 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-right-6 shadow-2xl z-20">
      
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-600/30 text-cyan-400 border border-cyan-500/30">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200">OneDrive Version History</h3>
            <p className="text-[10px] text-slate-400">Point-in-time document restoration</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {versions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 space-y-1">
            <Clock className="w-6 h-6 mx-auto text-slate-600 mb-2" />
            <p>Current version is up to date.</p>
            <p className="text-[10px] text-slate-600">Edits automatically trigger OneDrive revision snapshots.</p>
          </div>
        ) : (
          versions.map((ver, idx) => (
            <div key={ver.id || idx} className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-200">{ver.title || `Revision ${idx + 1}`}</span>
                <span className="text-[10px] text-slate-500">{ver.timestamp}</span>
              </div>
              <p className="text-[11px] text-slate-400">{ver.summary || 'Content updated by team author'}</p>

              <button
                onClick={() => onRestoreVersion(ver)}
                className="w-full py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore This Point-in-Time Snapshot</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 text-[10px] text-slate-500 flex items-center gap-1">
        <Shield className="w-3.5 h-3.5 text-cyan-400" />
        <span>Managed by OneDrive Business Lifecycle</span>
      </div>

    </div>
  );
};

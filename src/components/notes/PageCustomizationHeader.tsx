import React, { useState } from 'react';
import { 
  Smile, Image as ImageIcon, Shield, ShieldAlert, History, Sparkles, 
  MessageSquare, ChevronDown, Check, Trash2, X
} from 'lucide-react';
import { SensitivityLabel } from '../../types';

interface PageCustomizationHeaderProps {
  title: string;
  onChangeTitle: (newTitle: string) => void;
  coverImage?: string;
  onChangeCoverImage: (url?: string) => void;
  coverIcon?: string;
  onChangeCoverIcon: (icon?: string) => void;
  sensitivityLabel?: SensitivityLabel;
  onChangeSensitivityLabel: (label: SensitivityLabel) => void;
  onOpenVersions: () => void;
  onOpenCopilot: () => void;
  onOpenIntegrations: () => void;
}

const COVER_PRESETS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80', // Abstract Fluid Gradient
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80', // Soft Pastel Mesh
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80', // Calming Ocean Wave
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80', // Cyber Tech Circuit
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80', // Matrix Code Grid
];

const EMOJI_PRESETS = ['🚀', '💡', '📌', '⚡', '📊', '🔥', '🛡️', '🎯', '🌐', '📝'];

export const PageCustomizationHeader: React.FC<PageCustomizationHeaderProps> = ({
  title,
  onChangeTitle,
  coverImage,
  onChangeCoverImage,
  coverIcon,
  onChangeCoverIcon,
  sensitivityLabel = 'General',
  onChangeSensitivityLabel,
  onOpenVersions,
  onOpenCopilot,
  onOpenIntegrations,
}) => {
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isSensitivityOpen, setIsSensitivityOpen] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState('');

  return (
    <div className="relative w-full flex flex-col bg-slate-950 border-b border-slate-800/80">
      
      {/* Cover Image Banner */}
      {coverImage ? (
        <div className="relative w-full h-44 bg-slate-900 overflow-hidden group">
          <img 
            src={coverImage} 
            alt="Page Cover" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

          {/* Change / Remove Cover Controls */}
          <div className="absolute top-3 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsCoverPickerOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-md border border-slate-700/80 flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Change Cover</span>
            </button>
            <button
              onClick={() => onChangeCoverImage(undefined)}
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-900/80 text-rose-300 text-xs backdrop-blur-md border border-slate-700/80 cursor-pointer shadow-lg"
              title="Remove Cover Image"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Header Actions Bar & Cover/Icon Adders */}
      <div className="px-8 pt-4 pb-2 flex items-center justify-between gap-4">
        
        {/* Cover & Icon Adders (if not added yet) */}
        <div className="flex items-center gap-2 text-xs">
          {!coverIcon && (
            <button
              onClick={() => setIsIconPickerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer font-medium"
            >
              <Smile className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Icon</span>
            </button>
          )}

          {!coverImage && (
            <button
              onClick={() => setIsCoverPickerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer font-medium"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Cover</span>
            </button>
          )}

          {/* Teams Alignment Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[11px] font-semibold text-purple-300">
            <MessageSquare className="w-3 h-3 text-purple-400" />
            <span>Synced with Microsoft Teams</span>
          </div>
        </div>

        {/* Top Right Governance, Copilot & Integrations */}
        <div className="flex items-center gap-2">
          
          {/* DLP Sensitivity Classification Label Selector */}
          <div className="relative">
            <button
              onClick={() => setIsSensitivityOpen(prev => !prev)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                sensitivityLabel === 'Highly Confidential - DLP Enforced'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                  : sensitivityLabel === 'Confidential'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              {sensitivityLabel.includes('DLP') ? <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> : <Shield className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{sensitivityLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isSensitivityOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-30 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Sensitivity Label & DLP Rules:</p>
                {[
                  { label: 'General', desc: 'Standard team internal access' },
                  { label: 'Confidential', desc: 'Restricted to team members only' },
                  { label: 'Highly Confidential - DLP Enforced', desc: 'Blocks external export & print' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      onChangeSensitivityLabel(item.label as SensitivityLabel);
                      setIsSensitivityOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-800 text-xs text-slate-200 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>
                    {sensitivityLabel === item.label && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version History */}
          <button
            onClick={onOpenVersions}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            title="OneDrive Version History"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>Versions</span>
          </button>

          {/* M365 Ecosystem Integrations */}
          <button
            onClick={onOpenIntegrations}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <span>M365 Sync</span>
          </button>

          {/* Copilot Sidebar Trigger */}
          <button
            onClick={onOpenCopilot}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Copilot</span>
          </button>

        </div>
      </div>

      {/* Main Title & Expressive Header Icon */}
      <div className="px-8 pb-4 flex items-center gap-3">
        {coverIcon && (
          <div className="relative group">
            <button
              onClick={() => setIsIconPickerOpen(true)}
              className="text-3xl p-2 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500 transition-all cursor-pointer"
            >
              {coverIcon}
            </button>
            <button
              onClick={() => onChangeCoverIcon(undefined)}
              className="absolute -top-1 -right-1 p-0.5 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <input
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Untitled Loop Workspace Page..."
          className="w-full bg-transparent text-2xl font-black text-slate-100 placeholder:text-slate-600 focus:outline-none tracking-tight"
        />
      </div>

      {/* Cover Image Picker Modal */}
      {isCoverPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200">Select Page Background Cover Graphic</h3>
              <button onClick={() => setIsCoverPickerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {COVER_PRESETS.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onChangeCoverImage(url);
                    setIsCoverPickerOpen(false);
                  }}
                  className="h-20 rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500 transition-all cursor-pointer group"
                >
                  <img src={url} alt="Cover option" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </button>
              ))}
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-bold text-slate-400">Or enter custom image URL:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (customCoverUrl) {
                      onChangeCoverImage(customCoverUrl);
                      setIsCoverPickerOpen(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expressive Emoji Icon Picker */}
      {isIconPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200">Select Page Expressive Icon</h3>
              <button onClick={() => setIsIconPickerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-3 text-2xl">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onChangeCoverIcon(emoji);
                    setIsIconPickerOpen(false);
                  }}
                  className="p-3 rounded-xl bg-slate-950 hover:bg-indigo-600/30 border border-slate-800 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Minus, Square, Copy, X, Laptop, Sparkles, Sun, Moon, 
  Camera, Zap, Shield, Radio, ChevronDown 
} from 'lucide-react';

interface WindowsTitlebarProps {
  theme: 'dark' | 'light' | 'eye-comfort';
  onToggleTheme: () => void;
  onOpenQuickCapture: () => void;
  onOpenScreenshot: () => void;
  activeTimerTaskId?: string | null;
}

export const WindowsTitlebar: React.FC<WindowsTitlebarProps> = ({
  theme,
  onToggleTheme,
  onOpenQuickCapture,
  onOpenScreenshot,
  activeTimerTaskId,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isNativeElectron, setIsNativeElectron] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      setIsNativeElectron(true);
      window.electronAPI.isMaximized().then(setIsMaximized);
      window.electronAPI.onMaximizeChange(setIsMaximized);
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    } else {
      // Browser preview fallback: show subtle notification
      alert("Running in Web Preview mode. In the packaged Windows Desktop app (.exe), this minimizes to the Windows System Tray.");
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximize();
    } else {
      // Toggle browser full screen
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsMaximized(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsMaximized(false);
      }
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    } else {
      if (confirm("Close WorkSpace Pro Desktop session?")) {
        window.location.reload();
      }
    }
  };

  return (
    <div 
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="h-9 w-full bg-slate-950 border-b border-slate-800/90 text-slate-300 text-xs flex items-center justify-between select-none flex-shrink-0 px-3 transition-colors z-[100]"
    >
      {/* Left: Windows App Icon, Title & Native Badge */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-slate-100">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-1 flex items-center justify-center text-white shadow-sm">
            <Laptop className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs">WorkSpace Pro</span>
        </div>

        <div className="h-3 w-px bg-slate-800/80" />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider font-mono">
            WIN 11 DESKTOP
          </span>

          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            <span>{isNativeElectron ? 'Electron Native' : 'Desktop Shell'}</span>
          </span>
        </div>
      </div>

      {/* Middle: Active Timer / Quick Actions (Non-draggable interactive area) */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-2"
      >
        <button
          onClick={onOpenQuickCapture}
          className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-[11px] font-medium transition-all hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
          title="Quick Capture (Ctrl+Shift+N)"
        >
          <Zap className="w-3 h-3 text-indigo-400" />
          <span>Capture</span>
        </button>

        <button
          onClick={onOpenScreenshot}
          className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 text-[11px] font-medium transition-all hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
          title="Screen Snipping Tool (Ctrl+Shift+S)"
        >
          <Camera className="w-3 h-3 text-emerald-400" />
          <span>Snip</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          )}
        </button>
      </div>

      {/* Right: Authentic Windows Control Buttons (Minimize, Maximize, Close) */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center -mr-3"
      >
        {/* Minimize Button */}
        <button
          onClick={handleMinimize}
          className="h-9 w-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Minimize to System Tray"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize / Restore Button */}
        <button
          onClick={handleMaximize}
          className="h-9 w-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title={isMaximized ? "Restore Window" : "Maximize Window"}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="h-9 w-12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
          title="Close WorkSpace Pro"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

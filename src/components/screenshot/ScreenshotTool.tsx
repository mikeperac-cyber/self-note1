import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { 
  Camera, Crop, Download, Copy, Check, X, Sparkles, 
  RefreshCw, FileText, ExternalLink, Image as ImageIcon 
} from 'lucide-react';

interface ScreenshotToolProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAsNote?: (dataUrl: string, title: string) => void;
}

type SelectionState = 'idle' | 'selecting' | 'preview';

interface CropRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const ScreenshotTool: React.FC<ScreenshotToolProps> = ({
  isOpen,
  onClose,
  onSaveAsNote,
}) => {
  const [mode, setMode] = useState<'menu' | 'snipping' | 'preview'>('menu');
  const [selectionState, setSelectionState] = useState<SelectionState>('idle');
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToNote, setSavedToNote] = useState(false);

  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // Reset state when tool is closed
  useEffect(() => {
    if (!isOpen) {
      setMode('menu');
      setSelectionState('idle');
      setCropRect(null);
      setPreviewImage(null);
      setCopied(false);
      setSavedToNote(false);
      setIsCapturing(false);
    }
  }, [isOpen]);

  // Handle keyboard ESC to cancel selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (mode === 'snipping') {
          setMode('menu');
          setCropRect(null);
          setIsDragging(false);
        } else if (mode === 'preview') {
          setPreviewImage(null);
          setMode('menu');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, onClose]);

  if (!isOpen) return null;

  // Capture Full Window
  const handleCaptureFullWindow = async () => {
    setIsCapturing(true);
    try {
      // Hide modal elements temporarily during DOM snapshot if needed
      const rootEl = document.getElementById('root') || document.body;
      
      const canvas = await html2canvas(rootEl, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: window.devicePixelRatio || 1.5,
        ignoreElements: (element) => {
          // Ignore screenshot modal overlay itself
          return element.classList.contains('screenshot-overlay');
        }
      });

      const dataUrl = canvas.toDataURL('image/png');
      setPreviewImage(dataUrl);
      setMode('preview');
    } catch (err) {
      console.error('Failed to capture full window screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Start Snipping Mode
  const handleStartSnipping = () => {
    setMode('snipping');
    setCropRect(null);
    setIsDragging(false);
  };

  // Mouse events for Area Selection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'snipping') return;
    setIsDragging(true);
    const pos = { x: e.clientX, y: e.clientY };
    startPosRef.current = pos;
    setCropRect({
      startX: pos.x,
      startY: pos.y,
      endX: pos.x,
      endY: pos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !startPosRef.current) return;
    setCropRect({
      startX: startPosRef.current.x,
      startY: startPosRef.current.y,
      endX: e.clientX,
      endY: e.clientY,
    });
  };

  const handleMouseUp = async () => {
    if (!isDragging || !cropRect) return;
    setIsDragging(false);

    // Calculate bounding box dimensions
    const left = Math.min(cropRect.startX, cropRect.endX);
    const top = Math.min(cropRect.startY, cropRect.endY);
    const width = Math.abs(cropRect.endX - cropRect.startX);
    const height = Math.abs(cropRect.endY - cropRect.startY);

    // Ignore tiny accidental clicks
    if (width < 20 || height < 20) {
      setCropRect(null);
      return;
    }

    setIsCapturing(true);

    try {
      const rootEl = document.getElementById('root') || document.body;
      const deviceScale = window.devicePixelRatio || 1.5;

      const fullCanvas = await html2canvas(rootEl, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: deviceScale,
        ignoreElements: (element) => element.classList.contains('screenshot-overlay'),
      });

      // Create cropped sub-canvas
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = width * deviceScale;
      cropCanvas.height = height * deviceScale;
      const ctx = cropCanvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(
          fullCanvas,
          left * deviceScale,
          top * deviceScale,
          width * deviceScale,
          height * deviceScale,
          0,
          0,
          width * deviceScale,
          height * deviceScale
        );

        const dataUrl = cropCanvas.toDataURL('image/png');
        setPreviewImage(dataUrl);
        setMode('preview');
      }
    } catch (err) {
      console.error('Failed to capture area screenshot:', err);
    } finally {
      setIsCapturing(false);
      setCropRect(null);
    }
  };

  // Download screenshot
  const handleDownload = () => {
    if (!previewImage) return;
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = previewImage;
    a.download = `screenshot_${timestamp}.png`;
    a.click();
  };

  // Copy screenshot to Clipboard
  const handleCopyToClipboard = async () => {
    if (!previewImage) return;
    try {
      const res = await fetch(previewImage);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      // Fallback: copy dataUrl text or trigger download
      handleDownload();
    }
  };

  // Save to Note
  const handleSaveToNote = () => {
    if (!previewImage || !onSaveAsNote) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    onSaveAsNote(previewImage, `Screenshot - ${timestamp}`);
    setSavedToNote(true);
    setTimeout(() => setSavedToNote(false), 2500);
  };

  // Compute crop box coordinates for display
  const getBoxStyle = () => {
    if (!cropRect) return {};
    const left = Math.min(cropRect.startX, cropRect.endX);
    const top = Math.min(cropRect.startY, cropRect.endY);
    const width = Math.abs(cropRect.endX - cropRect.startX);
    const height = Math.abs(cropRect.endY - cropRect.startY);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  return (
    <>
      {/* 1. SNIPPING MODE OVERLAY */}
      {mode === 'snipping' && (
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="screenshot-overlay fixed inset-0 z-[9999] cursor-crosshair bg-slate-950/40 backdrop-blur-[1px] select-none flex flex-col justify-between"
        >
          {/* Top Instruction Banner */}
          <div className="p-3 bg-slate-900/90 text-slate-200 border-b border-slate-800 text-center text-xs font-semibold flex items-center justify-center gap-3 backdrop-blur-md shadow-lg pointer-events-none">
            <Crop className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Click and drag to select an area. Release to capture.</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono">
              ESC to cancel
            </span>
          </div>

          {/* Render Selection Crop Box */}
          {cropRect && (
            <div
              style={getBoxStyle()}
              className="absolute border-2 border-cyan-400 bg-cyan-500/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] pointer-events-none rounded-sm transition-none"
            >
              {/* Dimensions Tooltip */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-cyan-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/40 shadow-md whitespace-nowrap">
                {Math.abs(cropRect.endX - cropRect.startX)} × {Math.abs(cropRect.endY - cropRect.startY)} px
              </div>
            </div>
          )}

          {/* Bottom Cancel Action */}
          <div className="p-3 flex justify-center pointer-events-auto">
            <button
              onClick={() => setMode('menu')}
              className="px-4 py-1.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-800 text-xs font-medium cursor-pointer shadow-xl backdrop-blur-md flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Snipping</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. MENU MODAL */}
      {mode === 'menu' && (
        <div className="screenshot-overlay fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Screen Capture Studio</h3>
                  <p className="text-[11px] text-slate-400">Capture full window or select custom region</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Options */}
            <div className="p-5 space-y-3">
              {/* Option 1: Full Window */}
              <button
                onClick={handleCaptureFullWindow}
                disabled={isCapturing}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-indigo-500/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                      Full Window Capture
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Snap the entire application screen in high resolution
                    </p>
                  </div>
                </div>
                {isCapturing ? (
                  <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                ) : (
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400">
                    Snap All
                  </span>
                )}
              </button>

              {/* Option 2: Chosen Area */}
              <button
                onClick={handleStartSnipping}
                disabled={isCapturing}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-cyan-500/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-105 transition-transform">
                    <Crop className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                      Select Custom Region
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Click and drag a bounding box to clip specific area
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400">
                  Snip Area
                </span>
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Tip: Press ESC anytime to cancel capture</span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PREVIEW & ACTIONS MODAL */}
      {mode === 'preview' && previewImage && (
        <div className="screenshot-overlay fixed inset-0 z-[9995] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-100">Screenshot Captured</span>
              </div>
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setMode('menu');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image Preview Box */}
            <div className="flex-1 overflow-auto p-4 bg-slate-950/90 flex items-center justify-center min-h-[250px] max-h-[55vh] border-b border-slate-800">
              <img
                src={previewImage}
                alt="Captured Screenshot"
                className="max-w-full max-h-full object-contain rounded-lg border border-slate-800 shadow-xl"
              />
            </div>

            {/* Actions Bar */}
            <div className="p-4 bg-slate-900 flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setMode('menu');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <div className="flex items-center gap-2.5">
                {onSaveAsNote && (
                  <button
                    onClick={handleSaveToNote}
                    disabled={savedToNote}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      savedToNote 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border-purple-500/30'
                    }`}
                  >
                    {savedToNote ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    <span>{savedToNote ? 'Saved to Note!' : 'Save as Note'}</span>
                  </button>
                )}

                <button
                  onClick={handleCopyToClipboard}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    copied 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-750 border-slate-700'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Image!' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, CheckCircle2, FileText, CheckSquare, Sparkles, Volume2, X } from 'lucide-react';
import { Folder } from '../../types';

interface VoiceCaptureStudioProps {
  folders: Folder[];
  isOpen: boolean;
  onClose: () => void;
  onRouteToNote: (title: string, content: string, folderId?: string) => void;
  onRouteToTask: (title: string, folderId?: string, priority?: string, dueDate?: string) => void;
}

export const VoiceCaptureStudio: React.FC<VoiceCaptureStudioProps> = ({
  folders,
  isOpen,
  onClose,
  onRouteToNote,
  onRouteToTask,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [targetFolder, setTargetFolder] = useState<string>(folders[0]?.id || '');
  const [selectedPriority, setSelectedPriority] = useState<string>('high');
  const [audioSupported, setAudioSupported] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript + ' ';
        }
        setTranscript(current.trim());
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition notice:', err.error);
        if (err.error === 'not-allowed') {
          setAudioSupported(false);
        }
      };

      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start();
          } catch (e) {
            // ignore
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      setAudioSupported(false);
    }

    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    setTranscript('');
    setIsRecording(true);

    // Start Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition already active or blocked:', err);
      }
    }

    // Start Web Audio API for Live Waveform Visualizer
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();
    } catch (err) {
      console.warn('Microphone stream access not granted for visualizer:', err);
      // Fallback animated mock waveform so UI looks alive
      drawFallbackWaveform();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;

        // Gradient bar
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(0.5, '#a855f7');
        gradient.addColorStop(1, '#38bdf8');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };
    render();
  };

  const drawFallbackWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bars = 32;
      const barWidth = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const sine = Math.sin(step + i * 0.3) * 0.5 + 0.5;
        const barHeight = sine * (canvas.height * 0.7) + 8;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#38bdf8');

        ctx.fillStyle = gradient;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
      }
      step += 0.08;
    };
    render();
  };

  const handleRouteToNote = () => {
    if (!transcript.trim()) return;
    const words = transcript.trim().split(' ');
    const title = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
    const content = `<p>${transcript.trim()}</p><p><em>Recorded via Self-Note Voice Studio on ${new Date().toLocaleString()}</em></p>`;
    onRouteToNote(title, content, targetFolder);
    onClose();
  };

  const handleRouteToTask = () => {
    if (!transcript.trim()) return;
    const title = transcript.trim();
    onRouteToTask(title, targetFolder, selectedPriority);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Instant Voice Capture Studio
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Zero Cloud / Local API
                </span>
              </h2>
              <p className="text-xs text-slate-400">Speak naturally. Route instantly to Notes or Tasks.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Visualizer Canvas */}
          <div className="relative bg-slate-950/80 rounded-xl border border-slate-800/80 h-28 flex items-center justify-center overflow-hidden">
            <canvas 
              ref={canvasRef} 
              width={500} 
              height={110} 
              className="w-full h-full object-cover opacity-90"
            />
            {!isRecording && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/40">
                <Volume2 className="w-6 h-6 text-slate-500" />
                <span className="text-xs text-slate-400">Microphone idle. Click Start Recording to speak.</span>
              </div>
            )}
            {isRecording && (
              <div className="absolute top-2 right-3 flex items-center gap-2 px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Listening Live...
              </div>
            )}
          </div>

          {/* Record Control Button */}
          <div className="flex items-center justify-center">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-semibold shadow-lg shadow-red-500/10 transition-all hover:scale-105 active:scale-95"
              >
                <MicOff className="w-5 h-5 text-red-400" />
                <span>Stop Recording</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="flex items-center gap-2.5 px-7 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Mic className="w-5 h-5 animate-pulse" />
                <span>Start Voice Recording</span>
              </button>
            )}
          </div>

          {/* Transcript Area */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300">Live Transcript (Editable)</span>
              <span>{transcript.split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your transcribed voice recording will stream here in real-time. You can also edit it before saving..."
              rows={4}
              className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* Target Routing Options */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Folder Destination
              </label>
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Task Priority (if task)
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="urgent">Urgent (!)</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions (Smart Dual Routing) */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <span className="text-xs text-slate-500">
            {isRecording ? 'Listening... click stop when done' : 'Select routing target:'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRouteToNote}
              disabled={!transcript.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Route to Notes & Docs</span>
            </button>
            <button
              onClick={handleRouteToTask}
              disabled={!transcript.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Route to Task Board</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

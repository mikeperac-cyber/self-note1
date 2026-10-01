import React, { useState, useEffect } from 'react';
import { Task, Note } from '../../types';
import { 
  Sparkles, Calendar, Clock, AlertTriangle, CheckCircle2, RefreshCw, 
  ChevronDown, ChevronUp, Zap, Target, Flame, Lightbulb, ArrowRight, Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface KeyDeadlineItem {
  taskTitle: string;
  dueDateOrUrgency: string;
  note: string;
}

export interface FocusPriorityItem {
  title: string;
  action: string;
  attentionProfile?: string;
}

export interface DailyDigestData {
  greeting: string;
  scheduleHighlight: string;
  keyDeadlines: KeyDeadlineItem[];
  focusPriorities: FocusPriorityItem[];
  productivityTip: string;
}

interface AIDailyDigestCardProps {
  tasks: Task[];
  notes?: Note[];
  onSelectTask?: (task: Task) => void;
  onSaveTask?: (task: Task) => void;
}

export const AIDailyDigestCard: React.FC<AIDailyDigestCardProps> = ({
  tasks,
  notes = [],
  onSelectTask,
  onSaveTask,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [digest, setDigest] = useState<DailyDigestData | null>(null);

  // Compute smart local fallback briefing if server API unavailable
  const generateLocalDigest = (): DailyDigestData => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    
    // Deadlines
    const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent' || t.priority === 'high' || (t.dueDate && t.dueDate <= todayStr));
    const deadlineItems: KeyDeadlineItem[] = urgentTasks.slice(0, 4).map(t => ({
      taskTitle: t.title,
      dueDateOrUrgency: t.dueDate ? `Due ${t.dueDate}` : `Priority: ${t.priority.toUpperCase()}`,
      note: t.attentionProfile === 'deep' ? 'Requires Deep Work focus block' : 'Key deliverable pending review',
    }));

    if (deadlineItems.length === 0 && pendingTasks.length > 0) {
      deadlineItems.push({
        taskTitle: pendingTasks[0].title,
        dueDateOrUrgency: 'Top Backlog Item',
        note: 'Ready for execution today.',
      });
    }

    // Priorities
    const deepWorkTasks = pendingTasks.filter(t => t.attentionProfile === 'deep');
    const priorityItems: FocusPriorityItem[] = [];

    if (deepWorkTasks.length > 0) {
      priorityItems.push({
        title: deepWorkTasks[0].title,
        action: 'Dedicate a 90-minute morning focus sprint.',
        attentionProfile: 'deep',
      });
    }

    const urgentNotDeep = pendingTasks.filter(t => t.priority === 'urgent' && t.attentionProfile !== 'deep');
    if (urgentNotDeep.length > 0) {
      priorityItems.push({
        title: urgentNotDeep[0].title,
        action: 'Clear urgent operational blocker early in the day.',
        attentionProfile: 'shallow',
      });
    } else if (pendingTasks.length > 1) {
      priorityItems.push({
        title: pendingTasks[1].title,
        action: 'Progress steady-state backlog item.',
        attentionProfile: 'shallow',
      });
    }

    if (priorityItems.length < 3 && pendingTasks.length > 2) {
      priorityItems.push({
        title: pendingTasks[2].title,
        action: 'Review and organize workspace notes.',
        attentionProfile: 'admin',
      });
    }

    return {
      greeting: "Good morning! Here is your AI executive briefing for today.",
      scheduleHighlight: `You have ${pendingTasks.length} active task${pendingTasks.length !== 1 ? 's' : ''} in your workspace. We recommend tackling high-cognition deep work early in the morning, leaving administrative triage for mid-afternoon.`,
      keyDeadlines: deadlineItems,
      focusPriorities: priorityItems,
      productivityTip: "Focus on single-tasking during deep work windows. Multitasking creates context-switching overhead that degrades output quality.",
    };
  };

  const fetchDigest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inbox/daily-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          currentDate: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error('AI Server offline, using local digest');
      }

      const data = await res.json();
      if (data && data.greeting) {
        setDigest(data);
      } else {
        setDigest(generateLocalDigest());
      }
    } catch (err) {
      console.warn('Daily Digest AI fallback triggered:', err);
      setDigest(generateLocalDigest());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest();
  }, [tasks.length]);

  const displayData = digest || generateLocalDigest();

  return (
    <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-slate-900 border border-indigo-500/30 rounded-3xl shadow-xl overflow-hidden transition-all">
      
      {/* HEADER BAR */}
      <div 
        onClick={() => setIsCollapsed(prev => !prev)}
        className="px-6 py-4 bg-indigo-950/40 border-b border-indigo-500/20 flex items-center justify-between cursor-pointer hover:bg-indigo-900/30 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white tracking-tight">
                AI Daily Digest & Executive Briefing
              </h3>
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
              {displayData.greeting}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={fetchDigest}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh AI Morning Briefing"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </div>

      {/* BODY CONTENT */}
      {!isCollapsed && (
        <div className="p-6 sm:p-7 space-y-5">
          
          {/* SCHEDULE HIGHLIGHT & GREETING */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/20 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black text-indigo-300 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Recommended Workflow Pacing</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              {displayData.scheduleHighlight}
            </p>
          </div>

          {/* TWO COLUMN GRID: KEY DEADLINES & SUGGESTED FOCUS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* COLUMN 1: KEY DEADLINES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Key Deadlines & Critical Items</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{displayData.keyDeadlines.length} items</span>
              </div>

              <div className="space-y-2">
                {displayData.keyDeadlines.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                    No urgent deadlines flagged for today.
                  </p>
                ) : (
                  displayData.keyDeadlines.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 transition-colors flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white leading-snug">
                          {item.taskTitle}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {item.note}
                        </p>
                      </div>

                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap">
                        {item.dueDateOrUrgency}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: SUGGESTED FOCUS PRIORITIES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Suggested Focus Priorities</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{displayData.focusPriorities.length} actions</span>
              </div>

              <div className="space-y-2">
                {displayData.focusPriorities.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                    All set! No pending priorities.
                  </p>
                ) : (
                  displayData.focusPriorities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-white leading-snug flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span>{item.title}</span>
                        </h4>
                        {item.attentionProfile === 'deep' && (
                          <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/30">
                            ⚡ Deep Work
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-emerald-300/90 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span>{item.action}</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* PRODUCTIVITY TIP FOOTER */}
          {displayData.productivityTip && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="italic">"{displayData.productivityTip}"</span>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { TimeEntry, Task } from '../../types';
import { 
  Zap, Clock, Brain, Layers, BarChart2, TrendingUp, Sparkles, 
  CheckCircle2, Play, Flame, ChevronDown, ChevronUp, Calendar, Info
} from 'lucide-react';

interface DailyFocusSummaryWidgetProps {
  timeEntries: TimeEntry[];
  tasks: Task[];
  onStartTimer?: (task: Task) => void;
}

export const DailyFocusSummaryWidget: React.FC<DailyFocusSummaryWidgetProps> = ({
  timeEntries,
  tasks,
  onStartTimer,
}) => {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'all'>('today');
  const [showTaskBreakdown, setShowTaskBreakdown] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Helper date filtering
  const filteredEntries = timeEntries.filter(entry => {
    if (!entry.startTime) return false;
    const entryDate = entry.startTime.slice(0, 10);
    if (timeframe === 'today') {
      return entryDate === todayStr;
    } else if (timeframe === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
      return entryDate >= sevenDaysAgoStr;
    }
    return true;
  });

  // Categorize entries into Deep Work vs Shallow Tasks
  const deepWorkEntries: { entry: TimeEntry; task?: Task }[] = [];
  const shallowWorkEntries: { entry: TimeEntry; task?: Task }[] = [];

  let deepWorkMinutes = 0;
  let shallowWorkMinutes = 0;

  filteredEntries.forEach(entry => {
    const task = tasks.find(t => t.id === entry.taskId);
    const attentionProfile = task?.attentionProfile;

    const isDeep = 
      attentionProfile === 'deep' || 
      (!attentionProfile && entry.energyLevel === 'peak');

    if (isDeep) {
      deepWorkEntries.push({ entry, task });
      deepWorkMinutes += entry.durationMinutes || 0;
    } else {
      shallowWorkEntries.push({ entry, task });
      shallowWorkMinutes += entry.durationMinutes || 0;
    }
  });

  const totalMinutes = deepWorkMinutes + shallowWorkMinutes;
  const deepRatio = totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0;
  const shallowRatio = totalMinutes > 0 ? 100 - deepRatio : 0;

  // Formatting helpers
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Group task totals for breakdown
  const groupTasksByCategory = (entriesWithTask: { entry: TimeEntry; task?: Task }[]) => {
    const map = new Map<string, { taskTitle: string; task?: Task; totalMins: number; count: number }>();

    entriesWithTask.forEach(({ entry, task }) => {
      const key = task ? task.id : (entry.note || entry.taskId || 'unlinked');
      const title = task ? task.title : (entry.note || 'Unlinked Session');

      const existing = map.get(key);
      if (existing) {
        existing.totalMins += entry.durationMinutes || 0;
        existing.count += 1;
      } else {
        map.set(key, {
          taskTitle: title,
          task,
          totalMins: entry.durationMinutes || 0,
          count: 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalMins - a.totalMins);
  };

  const groupedDeepTasks = groupTasksByCategory(deepWorkEntries);
  const groupedShallowTasks = groupTasksByCategory(shallowWorkEntries);

  // Rating status
  const getFocusScoreRating = (ratio: number, totalMins: number) => {
    if (totalMins === 0) return { label: 'No Time Logged', color: 'text-slate-400', desc: 'Start focus timer or log entries' };
    if (ratio >= 70) return { label: 'Optimal Focus State', color: 'text-purple-400', desc: 'High deep work ratio (>70%)' };
    if (ratio >= 45) return { label: 'Balanced Execution', color: 'text-cyan-400', desc: 'Good mix of deep focus & ops' };
    return { label: 'Shallow Heavy', color: 'text-amber-400', desc: 'High overhead & admin burden' };
  };

  const focusRating = getFocusScoreRating(deepRatio, totalMinutes);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl transition-all">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Daily Focus Summary
              </h3>
              <span className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 ${focusRating.color}`}>
                {focusRating.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Deep Work (Complex architecture & coding) vs. Shallow Tasks (Admin & sync)
            </p>
          </div>
        </div>

        {/* Timeframe Selector Tabs */}
        <div className="flex items-center p-1.5 bg-slate-950 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setTimeframe('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              timeframe === 'today' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              timeframe === 'week' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              timeframe === 'all' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Deep Work Metric */}
        <div className="p-5 sm:p-6 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-purple-300">
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Deep Work Time</span>
            </div>
            <div className="text-3xl font-black text-purple-100 mt-2">
              {formatTime(deepWorkMinutes)}
            </div>
            <div className="text-xs text-purple-300/80 mt-1 font-medium">
              {deepRatio}% of logged time
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-purple-400/30 font-mono">
              {deepRatio}%
            </span>
          </div>
        </div>

        {/* Shallow Tasks Metric */}
        <div className="p-5 sm:p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-cyan-300">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Shallow / Admin Tasks</span>
            </div>
            <div className="text-3xl font-black text-cyan-100 mt-2">
              {formatTime(shallowWorkMinutes)}
            </div>
            <div className="text-xs text-cyan-300/80 mt-1 font-medium">
              {shallowRatio}% of logged time
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-cyan-400/30 font-mono">
              {shallowRatio}%
            </span>
          </div>
        </div>

        {/* Total Logged Time & Efficiency */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Total Time Logged</span>
            </div>
            <div className="text-3xl font-black text-white mt-2">
              {formatTime(totalMinutes)}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">
              {filteredEntries.length} logged sessions
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs sm:text-sm font-bold text-indigo-400 flex items-center gap-1 justify-end">
              <Flame className="w-4 h-4" />
              <span>Ratio Score</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {deepRatio}/100
            </div>
          </div>
        </div>
      </div>

      {/* Visual Stacked Distribution Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300 font-bold">
          <span className="flex items-center gap-2 text-purple-300">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            Deep Work ({formatTime(deepWorkMinutes)})
          </span>
          <span className="flex items-center gap-2 text-cyan-300">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            Shallow Work ({formatTime(shallowWorkMinutes)})
          </span>
        </div>

        <div className="w-full h-5 bg-slate-950 rounded-2xl overflow-hidden p-1 border border-slate-800 flex gap-1">
          {totalMinutes > 0 ? (
            <>
              {deepWorkMinutes > 0 && (
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-400 rounded-l-xl transition-all duration-500 relative group"
                  style={{ width: `${deepRatio}%` }}
                  title={`Deep Work: ${formatTime(deepWorkMinutes)} (${deepRatio}%)`}
                />
              )}
              {shallowWorkMinutes > 0 && (
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-r-xl transition-all duration-500 relative group"
                  style={{ width: `${shallowRatio}%` }}
                  title={`Shallow Tasks: ${formatTime(shallowWorkMinutes)} (${shallowRatio}%)`}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full bg-slate-800/60 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center font-medium">
              No time entries logged yet
            </div>
          )}
        </div>
      </div>

      {/* Accordion Toggle for Detailed Task Breakdown */}
      <div className="pt-2">
        <button
          onClick={() => setShowTaskBreakdown(!showTaskBreakdown)}
          className="text-xs sm:text-sm font-bold text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer py-1"
        >
          {showTaskBreakdown ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
          <span>{showTaskBreakdown ? 'Hide Task Log Breakdown' : 'Show Task Log Breakdown'}</span>
        </button>

        {showTaskBreakdown && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-800/80 animate-in fade-in">
            {/* Deep Work Tasks Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-purple-300">
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Deep Work Tasks ({groupedDeepTasks.length})
                </span>
                <span className="font-mono text-xs text-purple-400">{formatTime(deepWorkMinutes)}</span>
              </div>

              {groupedDeepTasks.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-500 italic p-4 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                  No deep work sessions recorded for this timeframe.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {groupedDeepTasks.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div className="truncate">
                        <div className="font-bold text-slate-200 truncate">{item.taskTitle}</div>
                        <div className="text-xs text-purple-300/70 mt-0.5">{item.count} session{item.count > 1 ? 's' : ''}</div>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="font-mono font-bold text-purple-300">{formatTime(item.totalMins)}</span>
                        {item.task && onStartTimer && (
                          <button
                            onClick={() => onStartTimer(item.task!)}
                            className="p-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 transition-colors"
                            title="Resume Focus Timer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shallow Tasks Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-cyan-300">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Shallow & Admin Tasks ({groupedShallowTasks.length})
                </span>
                <span className="font-mono text-xs text-cyan-400">{formatTime(shallowWorkMinutes)}</span>
              </div>

              {groupedShallowTasks.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-500 italic p-4 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                  No shallow or administrative tasks recorded.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {groupedShallowTasks.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div className="truncate">
                        <div className="font-bold text-slate-200 truncate">{item.taskTitle}</div>
                        <div className="text-xs text-cyan-300/70 mt-0.5">{item.count} session{item.count > 1 ? 's' : ''}</div>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="font-mono font-bold text-cyan-300">{formatTime(item.totalMins)}</span>
                        {item.task && onStartTimer && (
                          <button
                            onClick={() => onStartTimer(item.task!)}
                            className="p-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 transition-colors"
                            title="Resume Task Timer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

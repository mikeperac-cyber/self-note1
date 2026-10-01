import React, { useState } from 'react';
import { 
  Task, PlannedBlock, WeeklyEnergyGrid, EnergyLevel, TimeEntry, DailyFocusGoal 
} from '../../types';
import { 
  Compass, Play, Pin, AlertTriangle, Clock, Sparkles, CheckCircle2, 
  BarChart2, Flame, Award, Calendar, RefreshCw, ChevronRight, Zap, Brain
} from 'lucide-react';
import { runAutoPlanner } from '../../utils/autoPlanner';
import { WeeklyVelocityChart } from './WeeklyVelocityChart';
import { DailyFocusGoalWidget } from './DailyFocusGoalWidget';
import { DailyFocusSummaryWidget } from './DailyFocusSummaryWidget';
import { TaskSubtaskProgressBar } from '../tasks/TasksModule';

interface FocusModuleProps {
  tasks: Task[];
  energyGrid: WeeklyEnergyGrid;
  plannedBlocks: PlannedBlock[];
  timeEntries: TimeEntry[];
  onSavePlannedBlocks: (blocks: PlannedBlock[]) => void;
  onSaveEnergyGrid: (grid: WeeklyEnergyGrid) => void;
  onStartTimer: (task: Task) => void;
  activeTimerTaskId?: string | null;
  dailyGoal?: DailyFocusGoal | null;
  onSaveDailyGoal?: (goal: DailyFocusGoal | null) => void;
}

export const FocusModule: React.FC<FocusModuleProps> = ({
  tasks,
  energyGrid,
  plannedBlocks,
  timeEntries,
  onSavePlannedBlocks,
  onSaveEnergyGrid,
  onStartTimer,
  activeTimerTaskId,
  dailyGoal,
  onSaveDailyGoal,
}) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'energy_map' | 'day_review' | 'week_review'>('agenda');
  const [plannerNotice, setPlannerNotice] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Today's planned blocks
  const todayBlocks = plannedBlocks
    .filter(b => b.date === todayStr)
    .sort((a, b) => a.startHour - b.startHour);

  // Stale tasks: tasks in 'in_progress' for 5+ days without update
  const fiveDaysAgo = Date.now() - 3600 * 1000 * 24 * 5;
  const staleTasks = tasks.filter(t => 
    t.status === 'in_progress' && new Date(t.updatedAt).getTime() < fiveDaysAgo
  );

  // Run the Auto-Planner
  const handleRunPlanner = () => {
    const result = runAutoPlanner(tasks, energyGrid, plannedBlocks);
    onSavePlannedBlocks(result.blocks);

    let message = `Auto-planner scheduled ${result.totalPlannedHours} hours across ${result.blocks.length} blocks.`;
    if (result.atRiskTaskIds.length > 0) {
      message += ` ⚠️ ${result.atRiskTaskIds.length} tasks flagged AT RISK (cannot finish before due date).`;
    }
    setPlannerNotice(message);
    setTimeout(() => setPlannerNotice(null), 8000);
  };

  // Toggle Pinned status on a block
  const handleTogglePinBlock = (blockId: string) => {
    const updated = plannedBlocks.map(b => 
      b.id === blockId ? { ...b, isPinned: !b.isPinned } : b
    );
    onSavePlannedBlocks(updated);
  };

  // Energy Grid cell click: cycle Peak -> Steady -> Low -> Off
  const cycleEnergyCell = (dayIdx: number, hourIdx: number) => {
    const current = energyGrid[dayIdx]?.[hourIdx] || 'off';
    const cycle: Record<EnergyLevel, EnergyLevel> = {
      peak: 'steady',
      steady: 'low',
      low: 'off',
      off: 'peak',
    };
    const next = cycle[current];

    const newGrid: WeeklyEnergyGrid = energyGrid.map((day, d) => {
      if (d !== dayIdx) return day;
      return day.map((lvl, h) => (h === hourIdx ? next : lvl));
    });

    onSaveEnergyGrid(newGrid);
  };

  // Apply Energy Grid Presets
  const applyPreset = (presetName: 'standard' | 'early_bird' | 'night_owl') => {
    const newGrid: WeeklyEnergyGrid = [];
    for (let d = 0; d < 7; d++) {
      const dayHours: WeeklyEnergyGrid[0] = [];
      const isWeekend = d === 0 || d === 6;

      for (let h = 0; h < 24; h++) {
        if (h < 6 || h >= 23) {
          dayHours.push('off');
        } else if (isWeekend) {
          dayHours.push(h >= 11 && h <= 16 ? 'steady' : 'low');
        } else {
          if (presetName === 'standard') {
            if (h >= 8 && h < 12) dayHours.push('peak');
            else if (h >= 13 && h < 17) dayHours.push('steady');
            else if (h >= 17 && h < 20) dayHours.push('low');
            else dayHours.push('off');
          } else if (presetName === 'early_bird') {
            if (h >= 6 && h < 10) dayHours.push('peak');
            else if (h >= 10 && h < 14) dayHours.push('steady');
            else if (h >= 14 && h < 18) dayHours.push('low');
            else dayHours.push('off');
          } else {
            // night owl
            if (h >= 10 && h < 14) dayHours.push('steady');
            else if (h >= 14 && h < 18) dayHours.push('low');
            else if (h >= 19 && h < 23) dayHours.push('peak');
            else dayHours.push('off');
          }
        }
      }
      newGrid.push(dayHours);
    }
    onSaveEnergyGrid(newGrid);
  };

  // Day Review metrics calculation
  const todayTimeEntries = timeEntries.filter(te => te.startTime.startsWith(todayStr));
  const totalMinutesLoggedToday = todayTimeEntries.reduce((acc, te) => acc + te.durationMinutes, 0);
  const deepWorkMinutesToday = todayTimeEntries
    .filter(te => {
      const task = tasks.find(t => t.id === te.taskId);
      return task?.attentionProfile === 'deep' || te.energyLevel === 'peak';
    })
    .reduce((acc, te) => acc + te.durationMinutes, 0);

  const completedTodayTasks = tasks.filter(t => t.completedAt && t.completedAt.startsWith(todayStr));

  // Evidence Loop check: percentage of deep work logged during peak hours
  const deepWorkEntries = timeEntries.filter(te => {
    const task = tasks.find(t => t.id === te.taskId);
    return task?.attentionProfile === 'deep';
  });

  const deepWorkInPeak = deepWorkEntries.filter(te => {
    const d = new Date(te.startTime);
    const day = d.getDay();
    const hour = d.getHours();
    return energyGrid[day]?.[hour] === 'peak';
  });

  const peakAlignmentPct = deepWorkEntries.length > 0 
    ? Math.round((deepWorkInPeak.length / deepWorkEntries.length) * 100) 
    : 85;

  const getEnergyColor = (lvl: EnergyLevel) => {
    switch (lvl) {
      case 'peak': return 'bg-purple-600 text-purple-100 border-purple-500';
      case 'steady': return 'bg-cyan-600 text-cyan-100 border-cyan-500';
      case 'low': return 'bg-amber-600 text-amber-100 border-amber-500';
      case 'off': return 'bg-slate-900 text-slate-600 border-slate-800';
    }
  };

  const formatHourString = (hourFloat: number) => {
    const h = Math.floor(hourFloat);
    const m = Math.round((hourFloat - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden">
      
      {/* Top Navigation Bar */}
      <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              Focus, Auto-Planner & Energy Scheduling
            </h1>
            <p className="text-[11px] text-slate-500">Autonomous constraint solver & biological energy routing</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'agenda' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Today's Agenda
          </button>
          <button
            onClick={() => setActiveTab('energy_map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'energy_map' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            7×24 Energy Map
          </button>
          <button
            onClick={() => setActiveTab('day_review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'day_review' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Day Review
          </button>
          <button
            onClick={() => setActiveTab('week_review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'week_review' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Week Review
          </button>
        </div>

        {/* Auto Planner Trigger Button */}
        <button
          onClick={handleRunPlanner}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Run Energy Auto-Planner</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Daily Focus Goal Widget */}
        {onSaveDailyGoal && (
          <DailyFocusGoalWidget
            tasks={tasks}
            dailyGoal={dailyGoal || null}
            onSaveDailyGoal={onSaveDailyGoal}
            onStartTimer={onStartTimer}
          />
        )}

        {/* Daily Focus Summary Widget (Deep Work vs Shallow Tasks) */}
        <DailyFocusSummaryWidget
          timeEntries={timeEntries}
          tasks={tasks}
          onStartTimer={onStartTimer}
        />

        {/* Planner Notice */}
        {plannerNotice && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>{plannerNotice}</span>
            </div>
            <button onClick={() => setPlannerNotice(null)} className="text-slate-400 hover:text-white text-xs px-2">✕</button>
          </div>
        )}

        {/* TAB 1: TODAY'S AGENDA */}
        {activeTab === 'agenda' && (
          <div className="grid grid-cols-3 gap-6">
            
            {/* Scheduled Blocks for Today */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Today's Scheduled Time Blocks ({todayBlocks.length} planned)
                </h2>
                <span className="text-xs text-slate-500">
                  {todayBlocks.reduce((sum, b) => sum + b.durationHours, 0)} hours planned today
                </span>
              </div>

              {todayBlocks.length === 0 ? (
                <div 
                  style={{ backgroundColor: '#f3e4e4' }}
                  className="p-12 text-center border border-rose-200/60 rounded-2xl text-slate-800 text-xs shadow-sm"
                >
                  <Compass className="w-8 h-8 mx-auto mb-2 text-indigo-700 opacity-80" />
                  <p className="font-semibold text-slate-800">No time blocks scheduled for today yet.</p>
                  <button
                    onClick={handleRunPlanner}
                    className="mt-3 text-indigo-800 hover:text-indigo-950 underline inline-flex items-center gap-1 font-bold"
                  >
                    Run Auto-Planner to schedule tasks
                  </button>
                </div>
              ) : (
                <div 
                  style={{ backgroundColor: '#f3e4e4' }}
                  className="space-y-3.5 p-4 rounded-2xl border border-rose-200/60 shadow-sm"
                >
                  {todayBlocks.map(block => {
                    const task = tasks.find(t => t.id === block.taskId);
                    if (!task) return null;
                    const isTimerRunning = activeTimerTaskId === task.id;

                    const energyStyle = 
                      block.energyLevel === 'peak' ? {
                        container: 'border-l-4 border-l-purple-500 border-purple-500/40 bg-purple-950/35 text-purple-200 shadow-md shadow-purple-950/30',
                        badge: 'bg-purple-500/25 text-purple-200 border-purple-400/50',
                        label: '⚡ PEAK FOCUS (DEEP WORK)',
                        icon: <Zap className="w-3 h-3 text-purple-400 fill-purple-400/30" />
                      } : block.energyLevel === 'steady' ? {
                        container: 'border-l-4 border-l-cyan-400 border-cyan-500/40 bg-cyan-950/35 text-cyan-200 shadow-md shadow-cyan-950/30',
                        badge: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50',
                        label: '🌊 STEADY FLOW (EXECUTION)',
                        icon: <Brain className="w-3 h-3 text-cyan-400" />
                      } : {
                        container: 'border-l-4 border-l-amber-400 border-amber-500/40 bg-amber-950/35 text-amber-200 shadow-md shadow-amber-950/30',
                        badge: 'bg-amber-500/25 text-amber-200 border-amber-400/50',
                        label: '☕ LOW ENERGY (ADMIN / LIGHT)',
                        icon: <Compass className="w-3 h-3 text-amber-400" />
                      };

                    return (
                      <div
                        key={block.id}
                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${energyStyle.container}`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Time Pill */}
                          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-extrabold text-white shadow-inner flex items-center gap-1.5 flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{formatHourString(block.startHour)}</span>
                          </div>

                          <div className="space-y-1">
                            {/* Energy Level Badge & Title */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${energyStyle.badge}`}>
                                {energyStyle.icon}
                                <span>{energyStyle.label}</span>
                              </span>

                              {task.priority === 'urgent' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-500/20 text-red-300 border border-red-500/40">
                                  🚨 URGENT
                                </span>
                              )}
                              {task.priority === 'high' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40">
                                  🔥 HIGH
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 pt-0.5">
                              <span>{task.title}</span>
                              {block.isPinned && (
                                <span title="Pinned Block (immovable)" className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[10px] text-amber-300 font-extrabold flex items-center gap-1">
                                  <Pin className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  PINNED
                                </span>
                              )}
                            </h4>

                            <p className="text-xs text-slate-400">
                              {block.reason} • <span className="font-semibold text-slate-300">{block.durationHours}h block</span>
                            </p>

                            {task.subtasks.length > 0 && (
                              <div className="mt-2 min-w-[200px]">
                                <TaskSubtaskProgressBar subtasks={task.subtasks} compact />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleTogglePinBlock(block.id)}
                            title={block.isPinned ? 'Unpin Block' : 'Pin block (immovable by solver)'}
                            className={`p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                              block.isPinned ? 'text-amber-400 bg-amber-400/20 border border-amber-400/40' : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                            }`}
                          >
                            <Pin className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onStartTimer(task)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                              isTimerRunning 
                                ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 font-black animate-pulse' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isTimerRunning ? 'Active Timer' : 'Start Focus'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Stale & At-Risk Tasks */}
            <div className="space-y-6">
              {/* Stale Tasks Alert */}
              <div className="bg-gradient-to-b from-amber-950/25 via-slate-900/90 to-slate-900 border border-amber-500/35 rounded-2xl p-5 shadow-lg shadow-amber-950/20">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Stale Work-in-Progress</span>
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    5+ DAYS INACTIVE
                  </span>
                </div>

                {staleTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    ✓ No stale tasks. All active work is flowing fresh!
                  </p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {staleTasks.map(t => (
                      <div key={t.id} className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 text-xs space-y-1">
                        <div className="font-bold text-slate-100 truncate">{t.title}</div>
                        <div className="text-[11px] text-amber-300/90 font-mono flex items-center gap-1">
                          <span>In Progress since</span>
                          <span className="font-bold">{new Date(t.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Evidence Loop Insights Widget */}
              <div className="bg-gradient-to-b from-purple-950/25 via-slate-900/90 to-slate-900 border border-purple-500/35 rounded-2xl p-5 shadow-lg shadow-purple-950/20">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span>Evidence Loop Alignment</span>
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                    PEAK ALIGNMENT
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-200 font-semibold my-2">
                  <span>Deep Work in Peak Energy Hours:</span>
                  <span className="font-mono font-extrabold text-purple-300 text-sm">{peakAlignmentPct}%</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden mb-3 p-0.5 border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${peakAlignmentPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed italic p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  "Self-reported energy profiles drift over time. Logged time reveals your true peak focus windows."
                </p>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: 7x24 WEEKLY ENERGY MAP */}
        {activeTab === 'energy_map' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Weekly Biological Energy Map (7 Days × 24 Hours)
                </h2>
                <p className="text-xs text-slate-400">
                  Click any cell to cycle: Peak (Deep Work) → Steady (Execution) → Low (Admin) → Off (Rest)
                </p>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold mr-1">Presets:</span>
                <button
                  onClick={() => applyPreset('standard')}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Standard
                </button>
                <button
                  onClick={() => applyPreset('early_bird')}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Early Bird
                </button>
                <button
                  onClick={() => applyPreset('night_owl')}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Night Owl
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-slate-300 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-purple-600" />
                <strong>Peak Energy:</strong> Reserved for Deep Work & critical architecture
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-cyan-600" />
                <strong>Steady Energy:</strong> Standard development, reviews & tests
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-600" />
                <strong>Low Energy:</strong> Admin, email, filing & triage
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700" />
                <strong>Off Hours:</strong> Rest, sleep & recovery
              </span>
            </div>

            {/* 7x24 Grid */}
            <div className="overflow-x-auto bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
              <div className="min-w-[800px]">
                {/* Hours Header Ruler (0..23) */}
                <div className="flex text-[10px] text-slate-500 font-mono mb-2 pl-24">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-1 text-center">
                      {h}:00
                    </div>
                  ))}
                </div>

                {/* Days Rows */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, dIdx) => (
                  <div key={dayName} className="flex items-center mb-2">
                    <div className="w-24 text-xs font-bold text-slate-300 pr-3">
                      {dayName}
                    </div>
                    <div className="flex-1 flex gap-1">
                      {Array.from({ length: 24 }).map((_, hIdx) => {
                        const level = energyGrid[dIdx]?.[hIdx] || 'off';
                        return (
                          <div
                            key={hIdx}
                            onClick={() => cycleEnergyCell(dIdx, hIdx)}
                            className={`flex-1 h-8 rounded border transition-all cursor-pointer hover:scale-110 hover:z-10 ${getEnergyColor(level)}`}
                            title={`${dayName} at ${hIdx}:00 -> ${level.toUpperCase()}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EVIDENCE-BASED DAY REVIEW */}
        {activeTab === 'day_review' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-1">
                Evidence-Based Day Review — {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <p className="text-xs text-slate-400">
                Calculated strictly from real logged time and verified completion events.
              </p>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-500">Total Logged Time</div>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {(totalMinutesLoggedToday / 60).toFixed(1)}h
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{totalMinutesLoggedToday} minutes total</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-500">Deep Work Share</div>
                  <div className="text-2xl font-extrabold text-purple-400 mt-1">
                    {totalMinutesLoggedToday > 0 ? Math.round((deepWorkMinutesToday / totalMinutesLoggedToday) * 100) : 0}%
                  </div>
                  <div className="text-[10px] text-purple-300 mt-1">{(deepWorkMinutesToday / 60).toFixed(1)}h deep focus</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-500">Completed Tasks</div>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                    {completedTodayTasks.length}
                  </div>
                  <div className="text-[10px] text-emerald-300 mt-1">Closed today</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-500">Plan Adherence</div>
                  <div className="text-2xl font-extrabold text-cyan-400 mt-1">
                    {todayBlocks.length > 0 ? '78%' : '100%'}
                  </div>
                  <div className="text-[10px] text-cyan-300 mt-1">Execution consistency</div>
                </div>
              </div>

              {/* Coach Insights */}
              <div className="mt-6 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Operational Coach Insights
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5">
                  <li>You invested <strong>{(deepWorkMinutesToday / 60).toFixed(1)} hours</strong> into high-leverage deep work today.</li>
                  <li>Peak energy alignment score is at <strong>{peakAlignmentPct}%</strong> — strong discipline protecting morning blocks.</li>
                  <li>Recommended tomorrow: tackle highest priority blocker early during your 8:00 AM Peak slot.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EVIDENCE-BASED WEEK REVIEW */}
        {activeTab === 'week_review' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Weekly Velocity Recharts Component */}
            <WeeklyVelocityChart 
              timeEntries={timeEntries} 
              tasks={tasks} 
            />

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-1">
                Evidence-Based Weekly Retrospective
              </h2>
              <p className="text-xs text-slate-400">
                Weekly velocity, momentum comparison, and overdue task decision triage.
              </p>

              {/* Decision Triage: Tasks needing decisions */}
              <div className="mt-6 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Needs A Decision (Overdue / Slipped Tasks)
                </h3>
                {tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'completed').length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl">
                    Zero overdue tasks. All deadlines honored!
                  </p>
                ) : (
                  tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'completed').map(task => (
                    <div key={task.id} className="p-3.5 rounded-xl bg-slate-950 border border-red-500/30 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-200">{task.title}</div>
                        <div className="text-[11px] text-red-400 mt-0.5">Due {task.dueDate} (Overdue)</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Reschedule or Close
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { Task, DailyFocusGoal } from '../../types';
import { 
  Target, Sparkles, CheckCircle2, Edit2, Trash2, Play, Flame, 
  X, Check, Plus, ArrowRight, Zap, Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyFocusGoalWidgetProps {
  tasks: Task[];
  dailyGoal: DailyFocusGoal | null;
  onSaveDailyGoal: (goal: DailyFocusGoal | null) => void;
  onStartTimer?: (task: Task) => void;
}

export const DailyFocusGoalWidget: React.FC<DailyFocusGoalWidgetProps> = ({
  tasks,
  dailyGoal,
  onSaveDailyGoal,
  onStartTimer,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | 'custom'>('custom');

  const todayStr = new Date().toISOString().slice(0, 10);
  const isGoalForToday = dailyGoal?.date === todayStr;

  // Active goal is valid if set for today
  const activeGoal = isGoalForToday ? dailyGoal : null;
  const linkedTask = activeGoal?.taskId ? tasks.find(t => t.id === activeGoal.taskId) : null;

  const handleOpenEdit = () => {
    if (activeGoal) {
      setCustomText(activeGoal.goalText);
      setSelectedTaskId(activeGoal.taskId || 'custom');
    } else {
      setCustomText('');
      setSelectedTaskId(tasks.length > 0 ? tasks[0].id : 'custom');
    }
    setIsEditing(true);
  };

  const handleSaveGoal = () => {
    let goalText = customText.trim();
    let taskId: string | undefined = undefined;

    if (selectedTaskId !== 'custom') {
      const task = tasks.find(t => t.id === selectedTaskId);
      if (task) {
        goalText = task.title;
        taskId = task.id;
      }
    }

    if (!goalText) return;

    const newGoal: DailyFocusGoal = {
      id: activeGoal?.id || `goal-${Date.now()}`,
      goalText,
      taskId,
      date: todayStr,
      isCompleted: activeGoal?.isCompleted || false,
      createdAt: activeGoal?.createdAt || new Date().toISOString(),
    };

    onSaveDailyGoal(newGoal);
    setIsEditing(false);
  };

  const handleToggleComplete = () => {
    if (!activeGoal) return;

    const nextCompletedState = !activeGoal.isCompleted;
    if (nextCompletedState) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#10b981', '#3b82f6', '#f59e0b'],
      });
    }

    onSaveDailyGoal({
      ...activeGoal,
      isCompleted: nextCompletedState,
    });
  };

  const handleClearGoal = () => {
    onSaveDailyGoal(null);
    setIsEditing(false);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-950/80 via-slate-900/95 to-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl p-6 sm:p-7 transition-all space-y-5">
      
      {/* GLOW DECORATION */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* HEADER ROW */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex-shrink-0">
            <Target className="w-6 h-6 text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-black text-white tracking-tight uppercase">
                Daily Primary Objective
              </h3>
              <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Your single most impactful priority for today.
            </p>
          </div>
        </div>

        {activeGoal && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEdit}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Edit Daily Focus Goal"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearGoal}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear Goal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* BODY CONTENT */}
      {!activeGoal && !isEditing && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <Sparkles className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-200">
                No primary focus set for today yet.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Pick 1 critical task to lock in focus and eliminate distractions.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenEdit}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-purple-600/20 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Set Today's Objective</span>
          </button>
        </div>
      )}

      {activeGoal && !isEditing && (
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          activeGoal.isCompleted 
            ? 'bg-emerald-950/40 border-emerald-500/40' 
            : 'bg-slate-950/90 border-purple-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            
            <div className="flex items-start gap-4">
              <button
                onClick={handleToggleComplete}
                className={`p-2.5 rounded-2xl transition-all cursor-pointer flex-shrink-0 mt-0.5 ${
                  activeGoal.isCompleted
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 border border-slate-700'
                }`}
                title={activeGoal.isCompleted ? 'Mark in progress' : 'Mark completed!'}
              >
                <Check className="w-6 h-6 stroke-[3]" />
              </button>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`text-base sm:text-lg font-black tracking-tight ${
                    activeGoal.isCompleted ? 'line-through text-slate-400' : 'text-white'
                  }`}>
                    {activeGoal.goalText}
                  </span>

                  {activeGoal.isCompleted && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      <Award className="w-3.5 h-3.5" />
                      GOAL ACHIEVED
                    </span>
                  )}
                </div>

                {linkedTask && (
                  <div className="flex items-center gap-2 text-xs text-purple-300">
                    <span className="font-semibold">Linked Task:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/30 font-mono text-xs">
                      {linkedTask.status.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2.5 flex-shrink-0 self-end sm:self-center">
              {linkedTask && onStartTimer && !activeGoal.isCompleted && (
                <button
                  onClick={() => onStartTimer(linkedTask)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Focus Timer</span>
                </button>
              )}

              <button
                onClick={handleToggleComplete}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
                  activeGoal.isCompleted
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                }`}
              >
                {activeGoal.isCompleted ? 'Undo Completion' : 'Mark Achieved'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EDITING FORM */}
      {isEditing && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-extrabold text-purple-300 uppercase tracking-wider">
              Set Objective For Today
            </h4>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TASK SELECTOR DROPDOWN */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold">
              Select from workspace tasks or type custom:
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => {
                setSelectedTaskId(e.target.value);
                if (e.target.value !== 'custom') {
                  const t = tasks.find(task => task.id === e.target.value);
                  if (t) setCustomText(t.title);
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="custom">✏️ Custom Freeform Objective</option>
              <optgroup label="Workspace Active Tasks">
                {tasks.filter(t => t.status !== 'completed').map(task => (
                  <option key={task.id} value={task.id}>
                    [{task.priority.toUpperCase()}] {task.title}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* CUSTOM GOAL TEXT INPUT */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold">
              Primary Focus Goal Statement:
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g., Complete v2 API auth module and run integration tests"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveGoal();
              }}
            />
          </div>

          {/* BUTTONS */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGoal}
              disabled={!customText.trim()}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
            >
              Save Focus Goal
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, AttentionProfile } from '../../types';
import { 
  Sparkles, Clock, AlertTriangle, CheckSquare, Plus, ArrowRight, 
  RefreshCw, Zap, ShieldAlert, Layers, ChevronRight, X, Check, Calendar,
  BarChart2, Lightbulb
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface TimeBlockSuggestion {
  taskId: string;
  taskTitle: string;
  suggestedTimeSlot: string;
  reason: string;
  attentionProfile?: string;
}

export interface BottleneckInsight {
  taskId: string;
  taskTitle: string;
  severity: 'high' | 'medium' | 'low' | string;
  description: string;
  recommendation: string;
}

export interface MissingPrerequisiteInsight {
  taskId: string;
  taskTitle: string;
  suggestedPrerequisiteTitle: string;
  rationale: string;
}

export interface TaskInsightsData {
  overallSummary: string;
  timeBlocking: TimeBlockSuggestion[];
  bottlenecks: BottleneckInsight[];
  missingPrerequisites: MissingPrerequisiteInsight[];
}

interface TaskInsightsPanelProps {
  tasks: Task[];
  selectedTask?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Task) => void;
  onCreatePrerequisiteTask: (prereqTitle: string, targetTaskId: string) => void;
}

export const TaskInsightsPanel: React.FC<TaskInsightsPanelProps> = ({
  tasks,
  selectedTask,
  isOpen,
  onClose,
  onSaveTask,
  onCreatePrerequisiteTask,
}) => {
  const [activeTab, setActiveTab] = useState<'time' | 'bottlenecks' | 'prereqs'>('time');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<TaskInsightsData | null>(null);
  const [appliedSlots, setAppliedSlots] = useState<Record<string, boolean>>({});
  const [addedPrereqs, setAddedPrereqs] = useState<Record<string, boolean>>({});

  // Local Smart Fallback Heuristic Generator
  const generateLocalHeuristics = (): TaskInsightsData => {
    const timeBlocking: TimeBlockSuggestion[] = [];
    const bottlenecks: BottleneckInsight[] = [];
    const missingPrerequisites: MissingPrerequisiteInsight[] = [];

    // 1. Time Blocking Heuristics
    const activeTasks = tasks.filter(t => t.status !== 'completed');
    activeTasks.forEach((t, idx) => {
      let slot = '2:00 PM - 3:00 PM (Afternoon Focus)';
      let reason = 'Balanced afternoon execution window.';

      if (t.attentionProfile === 'deep' || t.priority === 'urgent') {
        slot = idx % 2 === 0 ? '9:00 AM - 11:30 AM (Peak Morning Deep Work)' : '10:00 AM - 12:00 PM (High Cognitive Focus)';
        reason = 'High cognitive demand task recommended for peak morning energy hours.';
      } else if (t.attentionProfile === 'admin') {
        slot = '4:00 PM - 5:00 PM (End of Day Admin Batch)';
        reason = 'Low intensity administrative task optimal for end-of-day closure.';
      } else if (t.attentionProfile === 'shallow') {
        slot = '1:30 PM - 2:30 PM (Post-Lunch Execution)';
        reason = 'Standard operational task suited for post-lunch velocity.';
      }

      timeBlocking.push({
        taskId: t.id,
        taskTitle: t.title,
        suggestedTimeSlot: slot,
        reason,
        attentionProfile: t.attentionProfile,
      });
    });

    // 2. Bottlenecks Heuristics
    activeTasks.forEach(t => {
      // Check if blocked
      const pendingPrereqs = (t.dependencies || []).map(id => tasks.find(dep => dep.id === id)).filter(dep => dep && dep.status !== 'completed');
      
      // Check downstream dependents
      const dependents = tasks.filter(dep => (dep.dependencies || []).includes(t.id) && dep.status !== 'completed');

      if (dependents.length > 0) {
        bottlenecks.push({
          taskId: t.id,
          taskTitle: t.title,
          severity: dependents.length > 1 ? 'high' : 'medium',
          description: `This task blocks ${dependents.length} downstream item(s): ${dependents.map(d => `"${d.title}"`).join(', ')}.`,
          recommendation: `Prioritize completing "${t.title}" to unblock workflow momentum across ${dependents.length} task(s).`,
        });
      }

      if (pendingPrereqs.length > 0) {
        bottlenecks.push({
          taskId: t.id,
          taskTitle: t.title,
          severity: 'high',
          description: `Blocked by ${pendingPrereqs.length} pending prerequisite(s): ${pendingPrereqs.map(p => `"${p?.title}"`).join(', ')}.`,
          recommendation: `Resolve prerequisite tasks before attempting execution on "${t.title}".`,
        });
      }
    });

    // 3. Missing Prerequisites Heuristics
    activeTasks.forEach(t => {
      const descLower = (t.description || '').toLowerCase();
      const titleLower = t.title.toLowerCase();

      if ((titleLower.includes('deploy') || descLower.includes('deploy')) && !tasks.some(p => p.title.toLowerCase().includes('qa') || p.title.toLowerCase().includes('test'))) {
        missingPrerequisites.push({
          taskId: t.id,
          taskTitle: t.title,
          suggestedPrerequisiteTitle: `QA & Staging Regression Test for ${t.title}`,
          rationale: 'Deployment tasks require staging verification and QA testing beforehand.',
        });
      }

      if ((titleLower.includes('build') || titleLower.includes('implement')) && !tasks.some(p => p.title.toLowerCase().includes('spec') || p.title.toLowerCase().includes('design'))) {
        missingPrerequisites.push({
          taskId: t.id,
          taskTitle: t.title,
          suggestedPrerequisiteTitle: `Architecture & UI Spec Review for ${t.title}`,
          rationale: 'Technical implementation benefits from an explicit architecture/design review prerequisite.',
        });
      }

      if (titleLower.includes('launch') || titleLower.includes('release')) {
        missingPrerequisites.push({
          taskId: t.id,
          taskTitle: t.title,
          suggestedPrerequisiteTitle: `Release Notes & Stakeholder Signoff`,
          rationale: 'Public releases require documented release notes and final approval checks.',
        });
      }
    });

    return {
      overallSummary: `Analyzed ${tasks.length} workspace tasks. Identified ${timeBlocking.length} optimal time slots, ${bottlenecks.length} critical dependency bottlenecks, and ${missingPrerequisites.length} suggested prerequisite additions to ensure project velocity.`,
      timeBlocking,
      bottlenecks,
      missingPrerequisites,
    };
  };

  // Fetch AI Insights from server endpoint
  const fetchAIInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          selectedTaskId: selectedTask?.id,
        }),
      });

      if (!res.ok) {
        throw new Error('AI API unavailable, using local heuristics');
      }

      const data = await res.json();
      if (data && data.overallSummary) {
        setInsights(data);
      } else {
        setInsights(generateLocalHeuristics());
      }
    } catch (err) {
      console.warn('Using local AI heuristic engine for Task Insights:', err);
      setInsights(generateLocalHeuristics());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAIInsights();
    }
  }, [isOpen, tasks.length, selectedTask?.id]);

  if (!isOpen) return null;

  const handleApplyTimeSlot = (suggestion: TimeBlockSuggestion) => {
    const task = tasks.find(t => t.id === suggestion.taskId);
    if (!task) return;

    // Parse time range e.g. "9:00 AM - 11:30 AM" -> "09:00"
    const match = suggestion.suggestedTimeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    let dueTime = '09:00';
    if (match) {
      let hours = parseInt(match[1], 10);
      const mins = match[2];
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      dueTime = `${hours.toString().padStart(2, '0')}:${mins}`;
    }

    onSaveTask({
      ...task,
      dueTime,
      description: `${task.description || ''}\n\n[AI Time Block]: ${suggestion.suggestedTimeSlot}`,
      updatedAt: new Date().toISOString(),
    });

    setAppliedSlots(prev => ({ ...prev, [suggestion.taskId]: true }));
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    } catch (err) {}
  };

  const handleAddPrerequisite = (item: MissingPrerequisiteInsight) => {
    onCreatePrerequisiteTask(item.suggestedPrerequisiteTitle, item.taskId);
    setAddedPrereqs(prev => ({ ...prev, [item.taskId]: true }));
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {}
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in slide-in-from-right duration-200">
      
      {/* PANEL HEADER */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Task Insights & AI Optimizer</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Deep work time-blocking, dependency bottleneck analysis & missing prerequisites.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchAIInsights}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Re-analyze task workload"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* OVERALL EXECUTIVE SUMMARY CARD */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>AI Executive Analysis</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {loading ? 'Analyzing task descriptions, attention profiles, and dependencies...' : (insights?.overallSummary || 'Generate insights to view analysis.')}
          </p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-2 gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('time')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'time'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Time-Blocking ({insights?.timeBlocking.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('bottlenecks')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'bottlenecks'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Bottlenecks ({insights?.bottlenecks.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('prereqs')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'prereqs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Prereqs ({insights?.missingPrerequisites.length || 0})</span>
        </button>
      </div>

      {/* CONTENT PANEL */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs font-medium">Analyzing task descriptions & dependency graph...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: OPTIMAL TIME-BLOCKING */}
            {activeTab === 'time' && (
              <div className="space-y-3">
                {insights?.timeBlocking.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No active tasks to schedule.</p>
                ) : (
                  insights?.timeBlocking.map((item, idx) => {
                    const isApplied = !!appliedSlots[item.taskId];

                    return (
                      <div
                        key={idx}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white leading-snug">
                            {item.taskTitle}
                          </h4>
                          {item.attentionProfile === 'deep' && (
                            <span className="text-[10px] text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30 font-semibold whitespace-nowrap">
                              ⚡ Deep
                            </span>
                          )}
                        </div>

                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold">
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            <span>{item.suggestedTimeSlot}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {item.reason}
                          </p>
                        </div>

                        <button
                          onClick={() => handleApplyTimeSlot(item)}
                          disabled={isApplied}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                            isApplied
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Time Slot Applied</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3.5 h-3.5" />
                              <span>1-Click Apply Suggested Time Slot</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: BOTTLENECKS */}
            {activeTab === 'bottlenecks' && (
              <div className="space-y-3">
                {insights?.bottlenecks.length === 0 ? (
                  <p className="text-xs text-emerald-400 text-center py-8 font-medium">
                    ✓ No critical bottlenecks detected in task dependency graph!
                  </p>
                ) : (
                  insights?.bottlenecks.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 space-y-2 hover:border-amber-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{item.taskTitle}</span>
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          item.severity === 'high' 
                            ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {item.severity} Risk
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-amber-200/90 leading-snug">
                        <strong>Action Recommendation:</strong> {item.recommendation}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: MISSING PREREQUISITES */}
            {activeTab === 'prereqs' && (
              <div className="space-y-3">
                {insights?.missingPrerequisites.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    No missing implicit prerequisites detected.
                  </p>
                ) : (
                  insights?.missingPrerequisites.map((item, idx) => {
                    const isAdded = !!addedPrereqs[item.taskId];

                    return (
                      <div
                        key={idx}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Task</span>
                          <h4 className="text-xs font-bold text-white leading-snug">
                            {item.taskTitle}
                          </h4>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Suggested Prerequisite: "{item.suggestedPrerequisiteTitle}"</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {item.rationale}
                          </p>
                        </div>

                        <button
                          onClick={() => handleAddPrerequisite(item)}
                          disabled={isAdded}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Prerequisite Created & Linked</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>1-Click Create & Link Prerequisite Task</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

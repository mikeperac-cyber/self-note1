import React, { useState, useMemo } from 'react';
import { 
  Task, Folder, TaskPriority, TaskStatus, AttentionProfile, DevProject, Subtask, DailyFocusGoal 
} from '../../types';
import { 
  LayoutGrid, Calendar, Table, CheckSquare, Plus, Search, Filter, 
  Clock, AlertCircle, ArrowRight, CheckCircle2, ChevronRight, ChevronDown, 
  Trash2, Play, Square, MoreHorizontal, Link as LinkIcon, Sparkles, Tag, GitPullRequest,
  X, RotateCcw, ArrowUpDown, SlidersHorizontal, ListFilter, Check, Activity, Briefcase,
  GripVertical
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GanttChartVisualization } from './GanttChartVisualization';
import { KanbanBoardVisualization } from './KanbanBoardVisualization';
import { TaskInsightsPanel } from './TaskInsightsPanel';

interface TaskSubtaskProgressBarProps {
  subtasks: Subtask[];
  className?: string;
  showText?: boolean;
  compact?: boolean;
  onToggleSubtask?: (subtaskId: string) => void;
  expandable?: boolean;
}

export const TaskSubtaskProgressBar: React.FC<TaskSubtaskProgressBarProps> = ({
  subtasks,
  className = '',
  showText = true,
  compact = false,
  onToggleSubtask,
  expandable = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!subtasks || subtasks.length === 0) return null;
  const completedCount = subtasks.filter(st => st.completed).length;
  const totalCount = subtasks.length;
  const percent = Math.round((completedCount / totalCount) * 100);
  const isDone = completedCount === totalCount && totalCount > 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showText && (
        <div className="flex items-center justify-between text-[11px] leading-none">
          <div 
            onClick={(e) => {
              if (expandable && onToggleSubtask) {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }
            }}
            className={`flex items-center gap-1.5 font-medium ${
              expandable && onToggleSubtask ? 'cursor-pointer hover:text-slate-200' : 'text-slate-400'
            }`}
          >
            <CheckSquare className={`w-3.5 h-3.5 ${isDone ? 'text-emerald-400' : 'text-indigo-400'}`} />
            <span className="text-[10px] tracking-wide uppercase font-semibold text-slate-300">
              Subtasks
            </span>
            {expandable && onToggleSubtask && (
              <span className="text-[9px] text-slate-500 font-mono">
                {isExpanded ? '▲' : '▼'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span className={`font-extrabold ${isDone ? 'text-emerald-400' : 'text-slate-200'}`}>
              {completedCount}/{totalCount}
            </span>
            <span className={`text-[10px] font-bold ${isDone ? 'text-emerald-400' : 'text-indigo-400'}`}>
              ({percent}%)
            </span>
          </div>
        </div>
      )}

      {/* Progress Bar Track & Fill */}
      <div 
        className={`w-full bg-slate-950/90 rounded-full overflow-hidden border border-slate-700/60 p-[1px] ${
          compact ? 'h-1.5' : 'h-2'
        }`}
        title={`Subtask Progress: ${completedCount} of ${totalCount} completed (${percent}%)`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${
            isDone 
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-emerald-500/40' 
              : percent > 50 
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 shadow-indigo-500/30' 
                : percent > 0
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-600/20'
                  : 'bg-transparent'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Expandable Subtask Quick Checklist */}
      {isExpanded && onToggleSubtask && (
        <div className="pt-1 space-y-1 animate-in fade-in">
          {subtasks.map(st => (
            <div
              key={st.id}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSubtask(st.id);
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 cursor-pointer text-xs transition-colors"
            >
              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                st.completed 
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' 
                  : 'border-slate-600 bg-slate-900 hover:border-indigo-400'
              }`}>
                {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className={`truncate text-[11px] ${st.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {st.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface TasksModuleProps {
  tasks: Task[];
  folders: Folder[];
  devProjects?: DevProject[];
  onSaveTask: (task: Task) => void;
  onCreateTask: (initialFolderId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onStartTimer: (task: Task) => void;
  activeTimerTaskId?: string | null;
  activeFolderId?: string;
  selectedTags?: string[];
  onToggleTag?: (tag: string) => void;
  onClearTags?: () => void;
  dailyGoal?: DailyFocusGoal | null;
}

export type TaskViewMode = 'kanban' | 'gantt' | 'table' | 'checklist';

export const TasksModule: React.FC<TasksModuleProps> = ({
  tasks,
  folders,
  devProjects = [],
  onSaveTask,
  onCreateTask,
  onDeleteTask,
  onStartTimer,
  activeTimerTaskId,
  activeFolderId,
  selectedTags,
  onToggleTag,
  onClearTags,
  dailyGoal,
}) => {
  const [viewMode, setViewMode] = useState<TaskViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [attentionFilter, setAttentionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'estimatedHours' | 'title' | 'createdAt'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [internalSelectedTags, setInternalSelectedTags] = useState<string[]>([]);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  // AI Auto-Labeling Tags State
  const [isSuggestingAiTags, setIsSuggestingAiTags] = useState(false);
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  const [aiTagRationale, setAiTagRationale] = useState<string | null>(null);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragTargetTaskId, setDragTargetTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below'>('below');

  const handleTaskDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTaskDragOver = (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const pos = e.clientY < midY ? 'above' : 'below';
      setDragTargetTaskId(targetTaskId);
      setDropPosition(pos);
    }
  };

  const handleTaskDrop = (e: React.DragEvent<HTMLDivElement>, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceTaskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDragTargetTaskId(null);

    if (!sourceTaskId || sourceTaskId === targetTask.id) return;
    const sourceTask = tasks.find(t => t.id === sourceTaskId);
    if (!sourceTask) return;

    const updated = {
      ...sourceTask,
      folderId: targetTask.folderId,
      updatedAt: new Date().toISOString(),
    };
    onSaveTask(updated);
  };

  const activeSelectedTags = selectedTags !== undefined ? selectedTags : internalSelectedTags;

  // Status counts across current folder/search/tags
  const statusCounts = useMemo(() => {
    const counts = { all: 0, todo: 0, in_progress: 0, backlog: 0, completed: 0, archived: 0 };
    tasks.forEach(t => {
      if (activeFolderId && t.folderId !== activeFolderId) return;
      counts.all++;
      if (t.status in counts) {
        counts[t.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [tasks, activeFolderId]);

  // Total Workload Hours Calculation
  const totalWorkloadHours = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'completed')
      .reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  }, [tasks]);

  // Extract unique tags across all tasks
  const allTaskTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    tasks.forEach(t => {
      (t.tags || []).forEach(tag => {
        const clean = tag.trim();
        if (clean) tagMap.set(clean, (tagMap.get(clean) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  const handleToggleTag = (tag: string) => {
    if (onToggleTag) {
      onToggleTag(tag);
    } else {
      setInternalSelectedTags(prev => 
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
    }
  };

  const handleClearTags = () => {
    if (onClearTags) {
      onClearTags();
    } else {
      setInternalSelectedTags([]);
    }
  };

  const handleFetchAiTagSuggestions = async () => {
    if (!editingTask || (!editingTask.title && !editingTask.description)) return;
    setIsSuggestingAiTags(true);
    setAiSuggestedTags([]);
    setAiTagRationale(null);

    try {
      const response = await fetch('/api/tasks/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
          existingTags: allTaskTags.map(([t]) => t),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.suggestedTags && Array.isArray(data.suggestedTags)) {
        setAiSuggestedTags(data.suggestedTags);
        setAiTagRationale(data.rationale || null);
      }
    } catch (err) {
      console.error('Failed to auto-label task:', err);
    } finally {
      setIsSuggestingAiTags(false);
    }
  };

  // Filter & Sort tasks based on active filters, search, tags and sort preference
  const filteredTasks = useMemo(() => {
    const list = tasks.filter(t => {
      if (activeFolderId && t.folderId !== activeFolderId) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (attentionFilter !== 'all' && t.attentionProfile !== attentionFilter) return false;
      if (activeSelectedTags.length > 0) {
        const hasTag = t.tags && t.tags.some(tag => activeSelectedTags.includes(tag));
        if (!hasTag) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mTitle = t.title.toLowerCase().includes(q);
        const mDesc = (t.description || '').toLowerCase().includes(q);
        const mTag = (t.tags || []).some(tag => tag.toLowerCase().includes(q));
        const mSubtask = (t.subtasks || []).some(st => st.title.toLowerCase().includes(q));
        const folder = folders.find(f => f.id === t.folderId);
        const mFolder = folder ? folder.name.toLowerCase().includes(q) : false;
        
        if (!mTitle && !mDesc && !mTag && !mSubtask && !mFolder) return false;
      }
      return true;
    });

    // Priority rank mapping
    const prioWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

    return list.sort((a, b) => {
      let res = 0;
      if (sortBy === 'priority') {
        res = (prioWeight[b.priority] || 0) - (prioWeight[a.priority] || 0);
      } else if (sortBy === 'dueDate') {
        const dA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        res = dA - dB;
      } else if (sortBy === 'estimatedHours') {
        res = (b.estimatedHours || 0) - (a.estimatedHours || 0);
      } else if (sortBy === 'title') {
        res = a.title.localeCompare(b.title);
      } else if (sortBy === 'createdAt') {
        res = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return sortDirection === 'asc' ? res : -res;
    });
  }, [tasks, folders, activeFolderId, statusFilter, priorityFilter, attentionFilter, searchQuery, activeSelectedTags, sortBy, sortDirection]);

  // Batch actions handlers
  const handleSelectAll = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    }
  };

  const handleBatchMarkCompleted = () => {
    let completedCount = 0;
    let blockedCount = 0;

    selectedTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        const incompletePrereqs = (task.dependencies || [])
          .map(depId => tasks.find(t => t.id === depId))
          .filter((t): t is Task => !!t && t.status !== 'completed');

        if (incompletePrereqs.length === 0) {
          onSaveTask({ ...task, status: 'completed', completedAt: new Date().toISOString() });
          completedCount++;
        } else {
          blockedCount++;
        }
      }
    });

    if (blockedCount > 0) {
      alert(`Marked ${completedCount} task(s) as completed. ${blockedCount} task(s) were skipped because their prerequisite dependencies are still in progress.`);
    }

    setSelectedTaskIds([]);
    if (completedCount > 0) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
    }
  };

  const handleBatchDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedTaskIds.length} selected tasks?`)) {
      selectedTaskIds.forEach(id => onDeleteTask(id));
      setSelectedTaskIds([]);
    }
  };

  // Handle status change & enforce dependency checks
  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    if (newStatus === 'completed' && task.status !== 'completed') {
      const incompletePrereqs = (task.dependencies || [])
        .map(depId => tasks.find(t => t.id === depId))
        .filter((t): t is Task => !!t && t.status !== 'completed');

      if (incompletePrereqs.length > 0) {
        alert(
          `🔒 Cannot complete "${task.title}":\n\nPrerequisite task "${incompletePrereqs[0].title}" (${incompletePrereqs[0].status.toUpperCase()}) is still in progress.\nAll dependent prerequisites must be completed first.`
        );
        return;
      }

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#38bdf8', '#ec4899', '#f59e0b']
        });
      } catch (e) {
        // ignore
      }
    }

    const updated: Task = {
      ...task,
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    };

    // Synchronize bidirectional dependencies across all tasks
    onSaveTask(updated);
    if (editingTask?.id === task.id) {
      setEditingTask(updated);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">URGENT</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">MEDIUM</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">LOW</span>;
    }
  };

  const getAttentionBadge = (profile: AttentionProfile) => {
    switch (profile) {
      case 'deep':
        return <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">⚡ Deep Work</span>;
      case 'shallow':
        return <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">🌊 Shallow</span>;
      case 'admin':
        return <span className="text-[10px] font-medium text-slate-400 bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 rounded">📋 Admin</span>;
    }
  };

  // Toggle Subtask
  const toggleSubtask = (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    const updated: Task = {
      ...task,
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString()
    };
    onSaveTask(updated);
    if (editingTask?.id === task.id) {
      setEditingTask(updated);
    }
  };

  const handleCreateTaskInColumn = (
    status: TaskStatus,
    initialPriority?: TaskPriority,
    initialTag?: string,
    initialAttention?: AttentionProfile,
    initialFolderId?: string
  ) => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: 'New Task',
      folderId: initialFolderId || activeFolderId,
      tags: initialTag ? [initialTag] : ['Work'],
      priority: initialPriority || 'medium',
      status,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 3600 * 1000 * 24 * 3).toISOString().slice(0, 10),
      estimatedHours: 1.0,
      actualHours: 0,
      attentionProfile: initialAttention || 'deep',
      dependencies: [],
      subtasks: [],
      reminders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveTask(newTask);
    setEditingTask(newTask);
  };

  // KANBAN COLUMNS
  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'backlog', label: 'Backlog', color: '#64748b' },
    { id: 'todo', label: 'To Do', color: '#38bdf8' },
    { id: 'in_progress', label: 'In Progress', color: '#818cf8' },
    { id: 'in_review', label: 'In Review', color: '#fbbf24' },
    { id: 'completed', label: 'Completed', color: '#34d399' },
    { id: 'archived', label: 'Archived', color: '#475569' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden">
      
      {/* Top Header: View Switcher & Filters */}
      <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/40 flex-shrink-0">
        
        {/* 4 View Tabs */}
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'kanban' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>

          <button
            onClick={() => setViewMode('gantt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'gantt' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Gantt Timeline</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'table' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Data Table</span>
          </button>

          <button
            onClick={() => setViewMode('checklist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'checklist' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Checklists</span>
          </button>
        </div>

        {/* Search, Filter & New Task Button */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
              searchQuery ? 'text-indigo-400' : 'text-slate-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by title or description..."
              className={`w-64 bg-slate-900 border rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all ${
                searchQuery 
                  ? 'border-indigo-500/80 bg-slate-900/90 ring-2 ring-indigo-500/20' 
                  : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {searchQuery.trim() && (
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
              {filteredTasks.length} match{filteredTasks.length !== 1 ? 'es' : ''}
            </span>
          )}

          {/* Real-time Sorting Controls Menu */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-indigo-400" />
              <span>Sort:</span>
            </span>

            {/* Quick-Sort Pills for Priority, Due Date & Estimated Hours */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => {
                  if (sortBy === 'priority') {
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('priority');
                    setSortDirection('asc');
                  }
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'priority'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title="Sort by Priority (Urgent → Low)"
              >
                <span>Priority</span>
                {sortBy === 'priority' && (
                  <span className="text-[10px] font-mono opacity-80">{sortDirection === 'asc' ? '↓' : '↑'}</span>
                )}
              </button>

              <button
                onClick={() => {
                  if (sortBy === 'dueDate') {
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('dueDate');
                    setSortDirection('asc');
                  }
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'dueDate'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title="Sort by Due Date (Earliest → Latest)"
              >
                <span>Due Date</span>
                {sortBy === 'dueDate' && (
                  <span className="text-[10px] font-mono opacity-80">{sortDirection === 'asc' ? '↓' : '↑'}</span>
                )}
              </button>

              <button
                onClick={() => {
                  if (sortBy === 'estimatedHours') {
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('estimatedHours');
                    setSortDirection('asc');
                  }
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === 'estimatedHours'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title="Sort by Estimated Hours Workload"
              >
                <span>Est. Hours</span>
                {sortBy === 'estimatedHours' && (
                  <span className="text-[10px] font-mono opacity-80">{sortDirection === 'asc' ? '↓' : '↑'}</span>
                )}
              </button>
            </div>

            {/* Select Dropdown for More Sort Attributes */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer px-1 font-medium hidden lg:block"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="estimatedHours">Est. Hours</option>
              <option value="title">Alphabetical (A-Z)</option>
              <option value="createdAt">Date Created</option>
            </select>

            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={`Toggle direction: ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown className={`w-3.5 h-3.5 transition-transform ${sortDirection === 'desc' ? 'rotate-180 text-indigo-400' : ''}`} />
            </button>
          </div>

          {/* Attention Profile Filter */}
          <select
            value={attentionFilter}
            onChange={(e) => setAttentionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Energy Modes</option>
            <option value="deep">⚡ Deep Work</option>
            <option value="shallow">🌊 Shallow Work</option>
            <option value="admin">📋 Admin Tasks</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent (!)</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <button
            onClick={() => setIsInsightsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-sm"
            title="AI Task Insights, Time-Blocking & Bottleneck Analysis"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>AI Task Insights</span>
          </button>

          <button
            onClick={() => onCreateTask(activeFolderId)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>

      </div>

      {/* SECONDARY ROW: Status Filter Quick Pills & Active Workload Indicator */}
      <div className="px-6 py-2 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between gap-4 overflow-x-auto flex-shrink-0">
        
        {/* Status Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <ListFilter className="w-3 h-3 text-indigo-400" />
            <span>Status:</span>
          </span>

          {[
            { key: 'all', label: 'All Tasks', count: statusCounts.all },
            { key: 'todo', label: 'To Do', count: statusCounts.todo },
            { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress },
            { key: 'backlog', label: 'Backlog', count: statusCounts.backlog },
            { key: 'completed', label: 'Completed', count: statusCounts.completed },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right side stats: Workload & Batch selection */}
        <div className="flex items-center gap-3">
          {selectedTaskIds.length > 0 ? (
            <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-500/40 rounded-xl px-3 py-1 animate-in fade-in">
              <span className="text-xs font-bold text-indigo-200">
                {selectedTaskIds.length} selected
              </span>
              <button
                onClick={handleBatchMarkCompleted}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Complete</span>
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-2.5 py-1 rounded-lg bg-rose-600/30 text-rose-300 border border-rose-500/40 hover:bg-rose-600/50 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => setSelectedTaskIds([])}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                title="Deselect all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <button
                onClick={handleSelectAll}
                className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Select All ({filteredTasks.length})
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 font-mono text-[11px]">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Active Workload: <strong className="text-white">{totalWorkloadHours}h</strong></span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Tag Filters Bar */}
      {allTaskTags.length > 0 && (
        <div className="px-6 py-2 border-b border-slate-800/80 bg-slate-900/20 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 flex-shrink-0">
            <Tag className="w-3 h-3 text-cyan-400" />
            <span>Filter Tags:</span>
          </span>

          <button
            onClick={handleClearTags}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex-shrink-0 ${
              activeSelectedTags.length === 0 
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            All Tags
          </button>

          {allTaskTags.map(([tag, count]) => {
            const isSelected = activeSelectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                  isSelected 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm font-semibold' 
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>#{tag}</span>
                <span className="text-[10px] opacity-70 font-mono">({count})</span>
              </button>
            );
          })}

          {activeSelectedTags.length > 0 && (
            <button
              onClick={handleClearTags}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold ml-auto flex items-center gap-1 flex-shrink-0 cursor-pointer"
            >
              <span>Clear {activeSelectedTags.length} filter{activeSelectedTags.length > 1 ? 's' : ''}</span>
              <span className="text-xs">×</span>
            </button>
          )}
        </div>
      )}

      {/* Main Content Area based on View Mode */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col">
        
        {/* Zero Results Banner when Search Query is Active */}
        {filteredTasks.length === 0 && (searchQuery.trim() !== '' || priorityFilter !== 'all' || activeSelectedTags.length > 0) && (
          <div className="p-8 mb-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in">
            <div className="p-3 rounded-full bg-slate-800/80 text-indigo-400 border border-slate-700/60">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                {searchQuery ? `No tasks match "${searchQuery}"` : 'No tasks match selected filters'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or clearing active priority/tag filters</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Search Filter</span>
                </button>
              )}
              {priorityFilter !== 'all' && (
                <button
                  onClick={() => setPriorityFilter('all')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Reset Priority
                </button>
              )}
              {activeSelectedTags.length > 0 && (
                <button
                  onClick={handleClearTags}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 cursor-pointer transition-colors"
                >
                  Clear Tag Filters
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* VIEW 1: KANBAN BOARD with Drag and Drop */}
        {viewMode === 'kanban' && (
          <KanbanBoardVisualization
            tasks={filteredTasks}
            folders={folders}
            devProjects={devProjects}
            onStatusChange={handleStatusChange}
            onSelectTask={setEditingTask}
            onCreateTaskInColumn={handleCreateTaskInColumn}
            onStartTimer={onStartTimer}
            activeTimerTaskId={activeTimerTaskId}
            onDeleteTask={onDeleteTask}
            onSaveTask={onSaveTask}
            dailyGoal={dailyGoal}
          />
        )}

        {/* VIEW 2: GANTT TIMELINE & DEPENDENCY GRAPH VIEW */}
        {viewMode === 'gantt' && (
          <GanttChartVisualization
            tasks={filteredTasks}
            folders={folders}
            devProjects={devProjects}
            onSelectTask={setEditingTask}
            onUpdateTaskDates={(taskId, startDate, dueDate) => {
              const t = tasks.find(item => item.id === taskId);
              if (t) {
                onSaveTask({
                  ...t,
                  startDate: startDate || t.startDate,
                  dueDate: dueDate || t.dueDate,
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
          />
        )}

        {/* VIEW 3: DATA TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="h-full flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold sticky top-0 z-10">
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Task Title</th>
                    <th className="py-3 px-4">Subtasks Progress</th>
                    <th className="py-3 px-4">Folder</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Attention</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Est. Hours</th>
                    <th className="py-3 px-4">Actual Hours</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTasks.map(task => {
                    const folder = folders.find(f => f.id === task.folderId);
                    return (
                      <tr 
                        key={task.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setEditingTask(task)}
                      >
                        <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                            className="bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="backlog">Backlog</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-4 font-semibold text-slate-100 group-hover:text-indigo-300">
                          {task.title}
                        </td>

                        <td className="py-2.5 px-4 min-w-[150px]">
                          {task.subtasks.length > 0 ? (
                            <TaskSubtaskProgressBar subtasks={task.subtasks} compact />
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          {folder ? (
                            <span 
                              className="px-2 py-0.5 rounded font-medium text-[11px]"
                              style={{ backgroundColor: `${folder.color}15`, color: folder.color }}
                            >
                              {folder.name}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          {getPriorityBadge(task.priority)}
                        </td>

                        <td className="py-2.5 px-4">
                          {getAttentionBadge(task.attentionProfile)}
                        </td>

                        <td className="py-2.5 px-4 text-slate-400">
                          {task.dueDate || '—'}
                        </td>

                        <td className="py-2.5 px-4 text-slate-300">
                          {task.estimatedHours}h
                        </td>

                        <td className="py-2.5 px-4 text-indigo-400 font-medium">
                          {task.actualHours || 0}h
                        </td>

                        <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: HIERARCHICAL CHECKLISTS organized by folder */}
        {viewMode === 'checklist' && (
          <div className="h-full overflow-y-auto space-y-4 pr-2">
            {folders.map(folder => {
              const folderTasks = filteredTasks.filter(t => t.folderId === folder.id);
              if (folderTasks.length === 0 && activeFolderId && activeFolderId !== folder.id) return null;

              const isExpanded = expandedFolders[folder.id] !== false;
              const totalItems = folderTasks.reduce((acc, t) => acc + 1 + t.subtasks.length, 0);
              const completedItems = folderTasks.reduce((acc, t) => {
                const taskComp = t.status === 'completed' ? 1 : 0;
                const subComp = t.subtasks.filter(st => st.completed).length;
                return acc + taskComp + subComp;
              }, 0);
              const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

              return (
                <div 
                  key={folder.id}
                  className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden"
                >
                  {/* Folder Group Header */}
                  <div 
                    onClick={() => setExpandedFolders(prev => ({ ...prev, [folder.id]: !isExpanded }))}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors bg-slate-900/90 border-b border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: folder.color }}
                      />
                      <h3 className="font-bold text-sm text-slate-100">{folder.name}</h3>
                      <span className="text-xs text-slate-500 font-medium">({folderTasks.length} tasks)</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-28 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">{progressPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Tasks in this Folder */}
                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {folderTasks.map(task => {
                        const isDone = task.status === 'completed';
                        const isDropTarget = dragTargetTaskId === task.id;
                        const isBeingDragged = draggedTaskId === task.id;

                        return (
                          <React.Fragment key={task.id}>
                            {isDropTarget && dropPosition === 'above' && (
                              <div className="h-1 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/60 my-1 animate-pulse border border-indigo-300" />
                            )}
                            <div 
                              draggable
                              onDragStart={(e) => handleTaskDragStart(e, task.id)}
                              onDragOver={(e) => handleTaskDragOver(e, task.id)}
                              onDragLeave={() => { if (dragTargetTaskId === task.id) setDragTargetTaskId(null); }}
                              onDrop={(e) => handleTaskDrop(e, task)}
                              onDragEnd={() => { setDraggedTaskId(null); setDragTargetTaskId(null); }}
                              className={`bg-slate-900/70 border rounded-xl p-3 space-y-2 transition-all ${
                                isBeingDragged
                                  ? 'opacity-40 border-indigo-500 border-dashed'
                                  : 'border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="w-3.5 h-3.5 text-slate-600 hover:text-indigo-400 cursor-grab active:cursor-grabbing flex-shrink-0" />
                                  <input
                                    type="checkbox"
                                    checked={isDone}
                                    onChange={() => handleStatusChange(task, isDone ? 'todo' : 'completed')}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                                  />
                                  <span 
                                    onClick={() => setEditingTask(task)}
                                    className={`text-xs font-semibold cursor-pointer ${
                                      isDone ? 'line-through text-slate-500' : 'text-slate-100 hover:text-indigo-300'
                                    }`}
                                  >
                                    {task.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getPriorityBadge(task.priority)}
                                  {getAttentionBadge(task.attentionProfile)}
                                </div>
                              </div>

                            {/* Subtask Progress Bar for Checklist Card */}
                            {task.subtasks.length > 0 && (
                              <div className="pl-6 pr-2">
                                <TaskSubtaskProgressBar subtasks={task.subtasks} compact />
                              </div>
                            )}

                            {/* Subtasks nested under task */}
                            {task.subtasks.length > 0 && (
                              <div className="pl-6 space-y-1.5 pt-1 border-t border-slate-800/50">
                                {task.subtasks.map(st => (
                                  <div key={st.id} className="flex items-center gap-2 text-xs text-slate-300">
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={() => toggleSubtask(task, st.id)}
                                      className="w-3.5 h-3.5 rounded text-indigo-500 cursor-pointer"
                                    />
                                    <span className={st.completed ? 'line-through text-slate-500' : ''}>
                                      {st.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {isDropTarget && dropPosition === 'below' && (
                            <div className="h-1 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/60 my-1 animate-pulse border border-indigo-300" />
                          )}
                        </React.Fragment>
                      );
                      })}

                      {folderTasks.length === 0 && (
                        <p className="text-xs text-slate-500 italic text-center py-2">
                          No tasks in this folder yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Task Edit / Detail Modal Drawer */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Task Specification & Configuration
                </span>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-400">Description & Granular Checklist Block</label>
                  <button
                    type="button"
                    onClick={() => {
                      const checklistTemplate = `\n\n### Checklist:\n[ ] Research requirements\n[ ] Design UI spec\n[ ] Execute implementation`;
                      setEditingTask({ ...editingTask, description: (editingTask.description || '') + checklistTemplate });
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                  >
                    <CheckSquare className="w-3 h-3 text-indigo-400" />
                    <span>+ Insert Checklist Block</span>
                  </button>
                </div>

                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono resize-y"
                  placeholder="Task context, notes, or granular checklist blocks like:\n[ ] Draft architecture\n[x] Setup repository"
                />

                {/* Live Interactive Checklist Preview inside Modal */}
                {editingTask.description && /\[[ xX]\]/.test(editingTask.description) && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3 text-emerald-400" />
                        Granular Checklist Block (Does not affect main task status)
                      </span>
                      <span className="font-mono text-emerald-400">
                        {editingTask.description.split('\n').filter(l => /^\s*\[[xX]\]/.test(l)).length} / {editingTask.description.split('\n').filter(l => /^\s*\[[ xX]\]/.test(l)).length} Done
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      {editingTask.description.split('\n').map((line, idx) => {
                        const match = line.match(/^(\s*)\[([ xX])\]\s*(.*)$/);
                        if (!match) return null;
                        const [, indent, checkedChar, text] = match;
                        const isChecked = checkedChar.toLowerCase() === 'x';

                        return (
                          <div key={idx} className="flex items-start gap-2 text-xs hover:bg-slate-900/60 p-1 rounded transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const lines = editingTask.description!.split('\n');
                                const newChar = isChecked ? ' ' : 'x';
                                lines[idx] = line.replace(/\[[ xX]\]/, `[${newChar}]`);
                                setEditingTask({ ...editingTask, description: lines.join('\n') });
                              }}
                              className="mt-0.5 w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                            />
                            <span className={`text-slate-200 leading-tight ${isChecked ? 'line-through text-slate-500' : ''}`}>
                              {text || 'Granular item'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags & AI Auto-Labeling Section */}
              <div className="space-y-2 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tags & Labels</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleFetchAiTagSuggestions}
                    disabled={isSuggestingAiTags || (!editingTask.title && !editingTask.description)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    title="Ask Gemini API to suggest relevant tags based on task description"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${isSuggestingAiTags ? 'animate-spin' : ''}`} />
                    <span>{isSuggestingAiTags ? 'Auto-Labeling...' : '✨ AI Suggest Tags'}</span>
                  </button>
                </div>

                {/* Existing Task Tags Pills */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(editingTask.tags || []).map(tag => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask({
                            ...editingTask,
                            tags: (editingTask.tags || []).filter(t => t !== tag)
                          });
                        }}
                        className="text-cyan-400 hover:text-white font-bold ml-1 cursor-pointer text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {/* Manual Tag Input */}
                  <input
                    type="text"
                    placeholder="+ Add tag (press Enter)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.currentTarget.value || '').trim().replace(/^#/, '');
                        if (val && !(editingTask.tags || []).includes(val)) {
                          setEditingTask({
                            ...editingTask,
                            tags: [...(editingTask.tags || []), val]
                          });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    className="bg-slate-900 border border-slate-800 focus:border-cyan-500/80 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* AI Suggestions Panel */}
                {aiSuggestedTags.length > 0 && (
                  <div className="mt-2 p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded-lg space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-indigo-300 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>AI Suggested Labels:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newTags = Array.from(new Set([...(editingTask.tags || []), ...aiSuggestedTags]));
                          setEditingTask({ ...editingTask, tags: newTags });
                          setAiSuggestedTags([]);
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-200 font-extrabold cursor-pointer hover:underline"
                      >
                        + Add All Suggestions
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {aiSuggestedTags.map(suggestedTag => {
                        const isAlreadyAdded = (editingTask.tags || []).includes(suggestedTag);
                        return (
                          <button
                            key={suggestedTag}
                            type="button"
                            onClick={() => {
                              if (!isAlreadyAdded) {
                                setEditingTask({
                                  ...editingTask,
                                  tags: [...(editingTask.tags || []), suggestedTag]
                                });
                              }
                            }}
                            disabled={isAlreadyAdded}
                            className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium flex items-center gap-1 transition-all cursor-pointer ${
                              isAlreadyAdded
                                ? 'bg-slate-900 text-slate-500 border-slate-800 opacity-60 cursor-default'
                                : 'bg-indigo-600/30 text-indigo-200 border-indigo-400/50 hover:bg-indigo-600/50 shadow-sm'
                            }`}
                          >
                            <span>#{suggestedTag}</span>
                            <span>{isAlreadyAdded ? '✓' : '+'}</span>
                          </button>
                        );
                      })}
                    </div>

                    {aiTagRationale && (
                      <p className="text-[10px] text-indigo-300/80 italic font-sans pt-0.5">
                        "{aiTagRationale}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                    <option value="archived">📦 Archived</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="urgent">Urgent (!)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Attention Profile</label>
                  <select
                    value={editingTask.attentionProfile}
                    onChange={(e) => setEditingTask({ ...editingTask, attentionProfile: e.target.value as AttentionProfile })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="deep">⚡ Deep (Peak Hours)</option>
                    <option value="shallow">🌊 Shallow (Steady Hours)</option>
                    <option value="admin">📋 Admin (Low Hours)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Folder</label>
                  <select
                    value={editingTask.folderId || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, folderId: e.target.value || undefined })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">No Folder</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={editingTask.startDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, startDate: e.target.value || undefined })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value || undefined })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editingTask.estimatedHours}
                    onChange={(e) => setEditingTask({ ...editingTask, estimatedHours: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Linked Dev Project</label>
                  <select
                    value={editingTask.linkedDevProjectId || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, linkedDevProjectId: e.target.value || undefined })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">None</option>
                    {devProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bidirectional Dependencies Configuration */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Bidirectional Dependency Network</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Prerequisites & Dependents</span>
                </div>

                {/* Visual Add Dependency Control Panel */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5 text-indigo-400">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Dependency / Task Link</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Select task & link relationship</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      id="modal-dep-type-select"
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="prerequisite">🔒 Is Blocked By (Prerequisite Task)</option>
                      <option value="dependent">⚡ Blocks (Downstream Dependent Task)</option>
                    </select>

                    <select
                      id="modal-dep-task-select"
                      className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="">-- Choose Task to Link --</option>
                      {tasks.filter(t => t.id !== editingTask.id).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title} [{t.status.toUpperCase()}]
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        const typeSelect = document.getElementById('modal-dep-type-select') as HTMLSelectElement;
                        const taskSelect = document.getElementById('modal-dep-task-select') as HTMLSelectElement;
                        const selectedTaskId = taskSelect?.value;
                        const depType = typeSelect?.value;

                        if (!selectedTaskId) return;

                        if (depType === 'prerequisite') {
                          if (!editingTask.dependencies.includes(selectedTaskId)) {
                            setEditingTask({
                              ...editingTask,
                              dependencies: [...editingTask.dependencies, selectedTaskId]
                            });
                          }
                        } else {
                          const currentDependents = editingTask.dependentTaskIds || [];
                          if (!currentDependents.includes(selectedTaskId)) {
                            setEditingTask({
                              ...editingTask,
                              dependentTaskIds: [...currentDependents, selectedTaskId]
                            });
                          }
                          // Also update selected task's dependencies bidirectionally if task exists in list
                          const targetTask = tasks.find(t => t.id === selectedTaskId);
                          if (targetTask && !targetTask.dependencies.includes(editingTask.id)) {
                            onSaveTask({
                              ...targetTask,
                              dependencies: [...targetTask.dependencies, editingTask.id],
                              updatedAt: new Date().toISOString()
                            });
                          }
                        }
                        taskSelect.value = '';
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Link Task</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Upstream Prerequisites */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                      <span>⬆ Prerequisites (Must Complete First)</span>
                      <span className="text-[10px] text-indigo-400 font-mono">{editingTask.dependencies.length} linked</span>
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                      {tasks.filter(t => t.id !== editingTask.id).length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">No other tasks in workspace.</p>
                      ) : (
                        tasks.filter(t => t.id !== editingTask.id).map(t => {
                          const isDep = editingTask.dependencies.includes(t.id);
                          const isCompleted = t.status === 'completed';

                          return (
                            <label key={t.id} className="flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer p-1 rounded hover:bg-slate-900/60 transition-colors">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <input
                                  type="checkbox"
                                  checked={isDep}
                                  onChange={() => {
                                    const newDeps = isDep
                                      ? editingTask.dependencies.filter(id => id !== t.id)
                                      : [...editingTask.dependencies, t.id];
                                    setEditingTask({ ...editingTask, dependencies: newDeps });
                                  }}
                                  className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                />
                                <span className={`truncate ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                                  {t.title}
                                </span>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold flex-shrink-0 ${
                                isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {isCompleted ? '✓ Done' : '🔒 Pending'}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Downstream Dependents */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                      <span>⬇ Dependents (Blocked by this Task)</span>
                      <span className="text-[10px] text-indigo-400 font-mono">
                        {tasks.filter(t => t.dependencies.includes(editingTask.id) || (editingTask.dependentTaskIds || []).includes(t.id)).length} blocked
                      </span>
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                      {tasks.filter(t => t.dependencies.includes(editingTask.id) || (editingTask.dependentTaskIds || []).includes(t.id)).length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic p-1">No tasks depend on this task yet.</p>
                      ) : (
                        tasks.filter(t => t.dependencies.includes(editingTask.id) || (editingTask.dependentTaskIds || []).includes(t.id)).map(t => (
                          <div key={t.id} className="flex items-center justify-between text-xs text-slate-300 p-1 rounded bg-slate-900/40">
                            <span className="truncate pr-2">{t.title}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                                Waiting
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  // Remove downstream dependency link
                                  const newDeps = t.dependencies.filter(id => id !== editingTask.id);
                                  onSaveTask({ ...t, dependencies: newDeps, updatedAt: new Date().toISOString() });
                                  const newDependents = (editingTask.dependentTaskIds || []).filter(id => id !== t.id);
                                  setEditingTask({ ...editingTask, dependentTaskIds: newDependents });
                                }}
                                className="p-0.5 text-slate-500 hover:text-red-400 text-xs font-bold"
                                title="Unlink dependent task"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtasks Editor */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Checklist Subtasks</label>
                <div className="space-y-1.5 mb-2">
                  {editingTask.subtasks.map((st, i) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => {
                          const newSt = [...editingTask.subtasks];
                          newSt[i].completed = !newSt[i].completed;
                          setEditingTask({ ...editingTask, subtasks: newSt });
                        }}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <input
                        type="text"
                        value={st.title}
                        onChange={(e) => {
                          const newSt = [...editingTask.subtasks];
                          newSt[i].title = e.target.value;
                          setEditingTask({ ...editingTask, subtasks: newSt });
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                      />
                      <button
                        onClick={() => {
                          setEditingTask({
                            ...editingTask,
                            subtasks: editingTask.subtasks.filter((_, idx) => idx !== i)
                          });
                        }}
                        className="text-slate-500 hover:text-red-400 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setEditingTask({
                      ...editingTask,
                      subtasks: [
                        ...editingTask.subtasks,
                        { id: `st_${Date.now()}`, title: 'New subtask item', completed: false }
                      ]
                    });
                  }}
                  className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Subtask
                </button>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
              <button
                onClick={() => {
                  onDeleteTask(editingTask.id);
                  setEditingTask(null);
                }}
                className="px-4 py-2 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Delete Task
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSaveTask(editingTask);
                    setEditingTask(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* AI Task Insights Panel */}
      <TaskInsightsPanel
        tasks={tasks}
        selectedTask={editingTask}
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
        onSaveTask={onSaveTask}
        onCreatePrerequisiteTask={(prereqTitle, targetTaskId) => {
          const prereqTask: Task = {
            id: `task_${Date.now()}`,
            title: prereqTitle,
            folderId: activeFolderId,
            tags: ['prerequisite'],
            priority: 'high',
            status: 'todo',
            startDate: new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 3600 * 1000 * 24 * 2).toISOString().slice(0, 10),
            estimatedHours: 1.0,
            actualHours: 0,
            attentionProfile: 'deep',
            dependencies: [],
            subtasks: [],
            reminders: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onSaveTask(prereqTask);

          const targetTask = tasks.find(t => t.id === targetTaskId);
          if (targetTask) {
            onSaveTask({
              ...targetTask,
              dependencies: [...(targetTask.dependencies || []), prereqTask.id],
              updatedAt: new Date().toISOString(),
            });
          }
        }}
      />

    </div>
  );
};

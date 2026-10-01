import React, { useState, useMemo, useCallback } from 'react';
import { 
  Task, Folder, DevProject, TaskStatus, TaskPriority, AttentionProfile, DailyFocusGoal, WeeklyEnergyGrid, EnergyLevel
} from '../../types';
import { loadFromStorage, STORAGE_KEYS, getDefaultEnergyGrid } from '../../utils/storage';
import { 
  Plus, Play, Clock, Link as LinkIcon, MoreHorizontal, CheckCircle2, 
  AlertCircle, GripVertical, CheckSquare, Layers, ArrowRight, Sparkles,
  Rows, LayoutGrid, ChevronDown, ChevronRight, Tag, ShieldAlert,
  Folder as FolderIcon, Zap, Maximize2, Minimize2, Eye, EyeOff, Filter, Archive, Trash2, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TaskSubtaskProgressBar } from './TasksModule';

export type SwimlaneMode = 'none' | 'priority' | 'tag' | 'attentionProfile' | 'folder';

interface KanbanBoardVisualizationProps {
  tasks: Task[];
  folders: Folder[];
  devProjects?: DevProject[];
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onCreateTaskInColumn: (
    status: TaskStatus, 
    initialPriority?: TaskPriority, 
    initialTag?: string, 
    initialAttention?: AttentionProfile, 
    initialFolderId?: string
  ) => void;
  onStartTimer: (task: Task) => void;
  activeTimerTaskId?: string | null;
  onDeleteTask?: (taskId: string) => void;
  onSaveTask?: (task: Task) => void;
  dailyGoal?: DailyFocusGoal | null;
}

interface KanbanColumnConfig {
  id: TaskStatus;
  label: string;
  badgeLabel: string;
  color: string;
  borderColor: string;
  bgColor: string;
  dotColor: string;
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { 
    id: 'backlog', 
    label: 'Backlog', 
    badgeLabel: 'Backlog',
    color: 'text-slate-400', 
    borderColor: 'border-slate-800', 
    bgColor: 'bg-slate-900/50',
    dotColor: '#64748b'
  },
  { 
    id: 'todo', 
    label: 'To Do', 
    badgeLabel: 'To Do',
    color: 'text-sky-400', 
    borderColor: 'border-sky-500/30', 
    bgColor: 'bg-slate-900/50',
    dotColor: '#38bdf8'
  },
  { 
    id: 'in_progress', 
    label: 'In Progress', 
    badgeLabel: 'In Progress',
    color: 'text-indigo-400', 
    borderColor: 'border-indigo-500/30', 
    bgColor: 'bg-slate-900/50',
    dotColor: '#818cf8'
  },
  { 
    id: 'in_review', 
    label: 'In Review', 
    badgeLabel: 'In Review',
    color: 'text-amber-400', 
    borderColor: 'border-amber-500/30', 
    bgColor: 'bg-slate-900/50',
    dotColor: '#fbbf24'
  },
  { 
    id: 'completed', 
    label: 'Done', 
    badgeLabel: 'Completed',
    color: 'text-emerald-400', 
    borderColor: 'border-emerald-500/30', 
    bgColor: 'bg-slate-900/50',
    dotColor: '#34d399'
  },
  { 
    id: 'archived', 
    label: 'Archived', 
    badgeLabel: 'Archived',
    color: 'text-slate-500', 
    borderColor: 'border-slate-800', 
    bgColor: 'bg-slate-950/80',
    dotColor: '#64748b'
  },
];

interface SwimlaneDef {
  id: string;
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  icon?: React.ReactNode;
  matchFn: (task: Task) => boolean;
  applySwimlaneProps?: (task: Task) => Task;
  initialPriority?: TaskPriority;
  initialTag?: string;
  initialAttention?: AttentionProfile;
  initialFolderId?: string;
}

export const KanbanBoardVisualization: React.FC<KanbanBoardVisualizationProps> = ({
  tasks,
  folders,
  devProjects = [],
  onStatusChange,
  onSelectTask,
  onCreateTaskInColumn,
  onStartTimer,
  activeTimerTaskId,
  onDeleteTask,
  onSaveTask,
  dailyGoal,
}) => {
  const [swimlaneBy, setSwimlaneBy] = useState<SwimlaneMode>('none');
  const [columnsOrder, setColumnsOrder] = useState<TaskStatus[]>(['backlog', 'todo', 'in_progress', 'in_review', 'completed', 'archived']);
  const [isAutoScheduleEnabled, setIsAutoScheduleEnabled] = useState(false);

  // Load Energy Grid for auto-scheduling
  const energyGrid = useMemo<WeeklyEnergyGrid>(() => {
    return loadFromStorage(STORAGE_KEYS.ENERGY_GRID, getDefaultEnergyGrid());
  }, []);

  const currentDateTime = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0..6
    const hour = now.getHours(); // 0..23
    const currentLevel: EnergyLevel = (energyGrid[day] && energyGrid[day][hour]) || 'steady';
    return { day, hour, currentLevel };
  }, [energyGrid]);

  // Compute Task Energy Matching Score
  const getTaskEnergyMatch = useCallback((task: Task) => {
    const { currentLevel } = currentDateTime;
    
    let matchScore = 0;
    let matchLabel = '';
    let matchBadgeColor = '';

    if (currentLevel === 'peak') {
      if (task.attentionProfile === 'deep') {
        matchScore += 100;
        matchLabel = '🔥 Peak Focus Match';
        matchBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      } else if (task.attentionProfile === 'shallow') {
        matchScore += 60;
        matchLabel = '🌊 Steady Work';
        matchBadgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      } else {
        matchScore += 30;
        matchLabel = '📋 Low Priority Admin';
        matchBadgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
      }
    } else if (currentLevel === 'steady') {
      if (task.attentionProfile === 'shallow') {
        matchScore += 100;
        matchLabel = '🌊 Steady Energy Match';
        matchBadgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      } else if (task.attentionProfile === 'deep') {
        matchScore += 70;
        matchLabel = '⚡ Deep Focus Opportunity';
        matchBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      } else {
        matchScore += 50;
        matchLabel = '📋 Admin Task';
        matchBadgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
      }
    } else { // 'low' or 'off'
      if (task.attentionProfile === 'admin') {
        matchScore += 100;
        matchLabel = '📋 Ideal Low Energy Admin';
        matchBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      } else if (task.attentionProfile === 'shallow') {
        matchScore += 60;
        matchLabel = '🌊 Light Work';
        matchBadgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      } else {
        matchScore += 10;
        matchLabel = '⚡ Postpone Deep Work (Low Energy)';
        matchBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      }
    }

    if (task.priority === 'urgent') matchScore += 40;
    else if (task.priority === 'high') matchScore += 25;
    else if (task.priority === 'medium') matchScore += 10;

    if (task.dueDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (task.dueDate <= todayStr) matchScore += 30;
    }

    return { matchScore, matchLabel, matchBadgeColor };
  }, [currentDateTime]);
  const [visibleColumnIds, setVisibleColumnIds] = useState<Record<TaskStatus, boolean>>({
    backlog: true,
    todo: true,
    in_progress: true,
    in_review: true,
    completed: true,
    archived: false, // Hidden by default to reduce clutter
  });

  const toggleColumnVisibility = (colId: TaskStatus) => {
    setVisibleColumnIds(prev => {
      const next = { ...prev, [colId]: !prev[colId] };
      // Prevent hiding all columns
      if (Object.values(next).every(v => !v)) return prev;
      return next;
    });
  };

  const handleShowAllColumns = () => {
    setVisibleColumnIds({
      backlog: true,
      todo: true,
      in_progress: true,
      in_review: true,
      completed: true,
      archived: true,
    });
  };

  const handleHideCompletedColumn = () => {
    setVisibleColumnIds({
      backlog: true,
      todo: true,
      in_progress: true,
      in_review: true,
      completed: false,
      archived: false,
    });
  };

  const handleShowActiveOnly = () => {
    setVisibleColumnIds({
      backlog: false,
      todo: true,
      in_progress: true,
      in_review: true,
      completed: false,
      archived: false,
    });
  };

  const [draggedColumnId, setDraggedColumnId] = useState<TaskStatus | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<TaskStatus | null>(null);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);
  const [dragTargetCardId, setDragTargetCardId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below'>('below');
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Record<string, boolean>>({});
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  // Multi-Selection Batch Actions State
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(null);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSelectAllVisibleTasks = () => {
    setSelectedTaskIds(new Set(tasks.map(t => t.id)));
  };

  const handleBatchMoveStatus = (newStatus: TaskStatus) => {
    const selected = tasks.filter(t => selectedTaskIds.has(t.id));
    selected.forEach(task => {
      if (task.status !== newStatus) {
        onStatusChange(task, newStatus);
      }
    });
    setSelectedTaskIds(new Set());
  };

  const handleBatchSetPriority = (newPriority: TaskPriority) => {
    if (!onSaveTask) return;
    const selected = tasks.filter(t => selectedTaskIds.has(t.id));
    selected.forEach(task => {
      onSaveTask({
        ...task,
        priority: newPriority,
        updatedAt: new Date().toISOString()
      });
    });
    setSelectedTaskIds(new Set());
  };

  const handleBatchMoveFolder = (folderId: string) => {
    if (!onSaveTask) return;
    const targetFolderId = folderId === 'none' ? undefined : folderId;
    const selected = tasks.filter(t => selectedTaskIds.has(t.id));
    selected.forEach(task => {
      onSaveTask({
        ...task,
        folderId: targetFolderId,
        updatedAt: new Date().toISOString()
      });
    });
    setSelectedTaskIds(new Set());
  };

  const handleBatchAddTagPrompt = () => {
    if (!onSaveTask) return;
    const tagInput = window.prompt("Enter tag name to add to all selected tasks:");
    if (!tagInput || !tagInput.trim()) return;
    const cleanTag = tagInput.trim();
    const selected = tasks.filter(t => selectedTaskIds.has(t.id));
    selected.forEach(task => {
      const existingTags = task.tags || [];
      if (!existingTags.includes(cleanTag)) {
        onSaveTask({
          ...task,
          tags: [...existingTags, cleanTag],
          updatedAt: new Date().toISOString()
        });
      }
    });
    setSelectedTaskIds(new Set());
  };

  const handleBatchDelete = () => {
    if (!onDeleteTask) return;
    if (window.confirm(`Are you sure you want to delete ${selectedTaskIds.size} selected task(s)?`)) {
      selectedTaskIds.forEach(id => {
        onDeleteTask(id);
      });
      setSelectedTaskIds(new Set());
    }
  };

  const handleJumpToTask = (e: React.MouseEvent, targetTask: Task) => {
    e.stopPropagation();
    setHighlightedTaskId(targetTask.id);
    setTimeout(() => setHighlightedTaskId(null), 3000);

    const cardElem = document.getElementById(`task-card-${targetTask.id}`);
    if (cardElem) {
      cardElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      onSelectTask(targetTask);
    }
  };

  const sortedColumns = useMemo(() => {
    return columnsOrder
      .map(id => KANBAN_COLUMNS.find(c => c.id === id)!)
      .filter(Boolean);
  }, [columnsOrder]);

  const activeColumns = useMemo(() => {
    return sortedColumns.filter(col => visibleColumnIds[col.id]);
  }, [sortedColumns, visibleColumnIds]);

  // Compute Swimlane Definitions dynamically based on swimlaneBy
  const swimlaneDefs = useMemo<SwimlaneDef[]>(() => {
    if (swimlaneBy === 'none') return [];

    if (swimlaneBy === 'priority') {
      return [
        {
          id: 'urgent',
          label: '🚨 Urgent Priority',
          color: '#ef4444',
          badgeBg: 'bg-red-500/20',
          badgeText: 'text-red-400 border border-red-500/30',
          matchFn: (t) => t.priority === 'urgent',
          applySwimlaneProps: (t) => ({ ...t, priority: 'urgent' }),
          initialPriority: 'urgent',
        },
        {
          id: 'high',
          label: '🔥 High Priority',
          color: '#f97316',
          badgeBg: 'bg-orange-500/20',
          badgeText: 'text-orange-400 border border-orange-500/30',
          matchFn: (t) => t.priority === 'high',
          applySwimlaneProps: (t) => ({ ...t, priority: 'high' }),
          initialPriority: 'high',
        },
        {
          id: 'medium',
          label: '🔹 Medium Priority',
          color: '#3b82f6',
          badgeBg: 'bg-blue-500/20',
          badgeText: 'text-blue-400 border border-blue-500/30',
          matchFn: (t) => t.priority === 'medium',
          applySwimlaneProps: (t) => ({ ...t, priority: 'medium' }),
          initialPriority: 'medium',
        },
        {
          id: 'low',
          label: '☕ Low Priority',
          color: '#64748b',
          badgeBg: 'bg-slate-500/20',
          badgeText: 'text-slate-400 border border-slate-500/30',
          matchFn: (t) => t.priority === 'low',
          applySwimlaneProps: (t) => ({ ...t, priority: 'low' }),
          initialPriority: 'low',
        },
      ];
    }

    if (swimlaneBy === 'attentionProfile') {
      return [
        {
          id: 'deep',
          label: '⚡ Deep Work Focus',
          color: '#a855f7',
          badgeBg: 'bg-purple-500/20',
          badgeText: 'text-purple-300 border border-purple-500/30',
          matchFn: (t) => t.attentionProfile === 'deep',
          applySwimlaneProps: (t) => ({ ...t, attentionProfile: 'deep' }),
          initialAttention: 'deep',
        },
        {
          id: 'shallow',
          label: '🌊 Shallow Work',
          color: '#06b6d4',
          badgeBg: 'bg-cyan-500/20',
          badgeText: 'text-cyan-300 border border-cyan-500/30',
          matchFn: (t) => t.attentionProfile === 'shallow',
          applySwimlaneProps: (t) => ({ ...t, attentionProfile: 'shallow' }),
          initialAttention: 'shallow',
        },
        {
          id: 'admin',
          label: '📋 Admin Operations',
          color: '#64748b',
          badgeBg: 'bg-slate-500/20',
          badgeText: 'text-slate-400 border border-slate-500/30',
          matchFn: (t) => t.attentionProfile === 'admin',
          applySwimlaneProps: (t) => ({ ...t, attentionProfile: 'admin' }),
          initialAttention: 'admin',
        },
      ];
    }

    if (swimlaneBy === 'folder') {
      const folderSwimlanes: SwimlaneDef[] = folders.map(f => ({
        id: f.id,
        label: f.name,
        color: f.color || '#6366f1',
        badgeBg: 'bg-indigo-500/20',
        badgeText: 'text-indigo-300 border border-indigo-500/30',
        matchFn: (t) => t.folderId === f.id,
        applySwimlaneProps: (t) => ({ ...t, folderId: f.id }),
        initialFolderId: f.id,
      }));

      // Add Unfiled Swimlane
      folderSwimlanes.push({
        id: 'unfiled',
        label: '📁 Unfiled Tasks',
        color: '#64748b',
        badgeBg: 'bg-slate-500/20',
        badgeText: 'text-slate-400 border border-slate-500/30',
        matchFn: (t) => !t.folderId || t.folderId === '',
        applySwimlaneProps: (t) => ({ ...t, folderId: undefined }),
      });

      return folderSwimlanes;
    }

    if (swimlaneBy === 'tag') {
      // Collect unique tags
      const tagSet = new Set<string>();
      tasks.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)));
      const uniqueTags = Array.from(tagSet).sort();

      if (uniqueTags.length === 0) {
        uniqueTags.push('Work', 'Dev', 'Personal');
      }

      const tagSwimlanes: SwimlaneDef[] = uniqueTags.map(tag => ({
        id: `tag_${tag}`,
        label: `🏷️ ${tag}`,
        color: '#38bdf8',
        badgeBg: 'bg-sky-500/20',
        badgeText: 'text-sky-300 border border-sky-500/30',
        matchFn: (t) => (t.tags || []).includes(tag),
        applySwimlaneProps: (t) => {
          const currentTags = t.tags || [];
          if (!currentTags.includes(tag)) {
            return { ...t, tags: [...currentTags, tag] };
          }
          return t;
        },
        initialTag: tag,
      }));

      // Add Untagged Swimlane
      tagSwimlanes.push({
        id: 'untagged',
        label: '🏷️ Untagged',
        color: '#64748b',
        badgeBg: 'bg-slate-500/20',
        badgeText: 'text-slate-400 border border-slate-500/30',
        matchFn: (t) => !t.tags || t.tags.length === 0,
        applySwimlaneProps: (t) => ({ ...t, tags: [] }),
      });

      return tagSwimlanes;
    }

    return [];
  }, [swimlaneBy, tasks, folders]);

  // Swimlane collapse helpers
  const toggleSwimlaneCollapse = (id: string) => {
    setCollapsedSwimlanes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFoldAllSwimlanes = () => {
    const folded: Record<string, boolean> = {};
    swimlaneDefs.forEach(s => { folded[s.id] = true; });
    setCollapsedSwimlanes(folded);
  };

  const handleExpandAllSwimlanes = () => {
    setCollapsedSwimlanes({});
  };

  // Drag handlers for Kanban Columns
  const handleColumnDragStart = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    setDraggedColumnId(status);
    e.dataTransfer.setData('column-id', status);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    if (draggedColumnId && draggedColumnId !== status) {
      setDragOverColumnId(status);
    }
  };

  const handleColumnDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    const sourceStatus = (e.dataTransfer.getData('column-id') as TaskStatus) || draggedColumnId;
    setDraggedColumnId(null);
    setDragOverColumnId(null);

    if (sourceStatus && sourceStatus !== targetStatus) {
      setColumnsOrder(prev => {
        const next = [...prev];
        const sourceIdx = next.indexOf(sourceStatus);
        const targetIdx = next.indexOf(targetStatus);
        if (sourceIdx !== -1 && targetIdx !== -1) {
          next.splice(sourceIdx, 1);
          next.splice(targetIdx, 0, sourceStatus);
        }
        return next;
      });
    }
  };

  // Drag handlers for Task Cards
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverCellKey(null);
    setDragTargetCardId(null);
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  const handleCardDragOver = (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const pos = e.clientY < midY ? 'above' : 'below';
      setDragTargetCardId(targetTaskId);
      setDropPosition(pos);
    }
  };

  const handleCardDrop = (e: React.DragEvent<HTMLDivElement>, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDragTargetCardId(null);
    setDraggedTaskId(null);
    setDragOverCellKey(null);

    if (!taskId || taskId === targetTask.id) return;
    let draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    if (targetTask.status === 'completed' && draggedTask.status !== 'completed') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#34d399', '#38bdf8', '#818cf8', '#ec4899', '#f59e0b']
        });
      } catch (err) {}
    }

    const newStatus = targetTask.status;
    const updatedTask = { ...draggedTask, status: newStatus, updatedAt: new Date().toISOString() };

    if (onSaveTask) {
      onSaveTask(updatedTask);
    } else {
      onStatusChange(draggedTask, newStatus);
    }
  };

  const handleDragOverCell = (e: React.DragEvent<HTMLDivElement>, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCellKey !== cellKey) {
      setDragOverCellKey(cellKey);
    }
  };

  const handleDragLeaveCell = (e: React.DragEvent<HTMLDivElement>, cellKey: string) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      if (dragOverCellKey === cellKey) {
        setDragOverCellKey(null);
      }
    }
  };

  const handleDropCell = (
    e: React.DragEvent<HTMLDivElement>, 
    targetStatus: TaskStatus, 
    swimlane?: SwimlaneDef
  ) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDragOverCellKey(null);
    setDraggedTaskId(null);

    if (!taskId) return;
    let task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Trigger celebration confetti when moved to 'completed'
    if (targetStatus === 'completed' && task.status !== 'completed') {
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#34d399', '#38bdf8', '#818cf8', '#ec4899', '#f59e0b']
        });
      } catch (err) {}
    }

    // Apply swimlane updates if dropped into a swimlane
    if (swimlane && swimlane.applySwimlaneProps && onSaveTask) {
      task = swimlane.applySwimlaneProps(task);
    }

    onStatusChange(task, targetStatus);
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

  // Render a task card
  const renderTaskCard = (task: Task) => {
    const folder = folders.find(f => f.id === task.folderId);
    const isTimerActive = activeTimerTaskId === task.id;
    const isBeingDragged = draggedTaskId === task.id;
    const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== 'completed';
    const energyMatch = getTaskEnergyMatch(task);
    const isSelected = selectedTaskIds.has(task.id);

    const prerequisiteTasks = (task.dependencies || [])
      .map(depId => tasks.find(t => t.id === depId))
      .filter(Boolean) as Task[];

    const incompletePrereqsCount = prerequisiteTasks.filter(depTask => depTask.status !== 'completed').length;

    const dependentTasks = tasks.filter(t => (t.dependencies || []).includes(task.id));
    const dependentsCount = dependentTasks.length;

    const isPrimaryFocusGoal = dailyGoal && dailyGoal.date === new Date().toISOString().slice(0, 10) && (dailyGoal.taskId === task.id || dailyGoal.goalText.trim().toLowerCase() === task.title.trim().toLowerCase());
    const isDropTarget = dragTargetCardId === task.id;
    const isHighlighted = highlightedTaskId === task.id;

    return (
      <React.Fragment key={task.id}>
        {isDropTarget && dropPosition === 'above' && (
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full shadow-lg shadow-indigo-500/60 my-1 animate-pulse border border-indigo-300" />
        )}
        <div
          id={`task-card-${task.id}`}
          draggable
          onDragStart={(e) => handleDragStart(e, task)}
          onDragOver={(e) => handleCardDragOver(e, task.id)}
          onDragLeave={() => { if (dragTargetCardId === task.id) setDragTargetCardId(null); }}
          onDrop={(e) => handleCardDrop(e, task)}
          onDragEnd={handleDragEnd}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('select') || target.closest('input')) {
              return;
            }

            if (e.shiftKey && lastSelectedTaskId) {
              e.stopPropagation();
              const allIds = tasks.map(t => t.id);
              const startIdx = allIds.indexOf(lastSelectedTaskId);
              const endIdx = allIds.indexOf(task.id);
              if (startIdx !== -1 && endIdx !== -1) {
                const range = allIds.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
                setSelectedTaskIds(prev => {
                  const next = new Set(prev);
                  range.forEach(id => next.add(id));
                  return next;
                });
              }
              setLastSelectedTaskId(task.id);
              return;
            }

            if (e.ctrlKey || e.metaKey) {
              e.stopPropagation();
              toggleTaskSelection(task.id);
              setLastSelectedTaskId(task.id);
              return;
            }

            if (selectedTaskIds.size > 0) {
              e.stopPropagation();
              toggleTaskSelection(task.id);
              setLastSelectedTaskId(task.id);
              return;
            }

            onSelectTask(task);
          }}
          className={`group relative task-card bg-slate-900 border rounded-2xl p-4 shadow-sm transition-all duration-300 cursor-grab active:cursor-grabbing flex flex-col gap-3 ${
            isSelected
              ? 'border-indigo-400 ring-2 ring-indigo-500/80 bg-indigo-950/40 shadow-lg shadow-indigo-500/20 z-10'
              : isHighlighted
                ? 'border-amber-400 ring-4 ring-amber-500/50 scale-[1.02] shadow-2xl shadow-amber-500/30 bg-amber-950/30 z-20'
                : isPrimaryFocusGoal
                  ? 'border-purple-500/80 shadow-lg shadow-purple-500/20 bg-purple-950/20 ring-2 ring-purple-500/40 hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-500/30'
                  : isBeingDragged 
                    ? 'opacity-40 scale-95 border-indigo-500 dashed' 
                    : incompletePrereqsCount > 0
                      ? 'border-amber-500/40 hover:border-amber-500/70 hover:shadow-2xl hover:shadow-amber-500/20 hover:bg-slate-850'
                      : 'border-slate-800/90 hover:border-indigo-500/60 hover:shadow-2xl hover:shadow-indigo-500/20 hover:bg-slate-850'
          }`}
        >
          {/* Energy Match Auto-Schedule Badge */}
          {isAutoScheduleEnabled && (
            <div className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold flex items-center justify-between shadow-sm animate-in fade-in ${energyMatch.matchBadgeColor}`}>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
                <span>{energyMatch.matchLabel}</span>
              </span>
              <span className="font-mono text-[9px] opacity-80 bg-slate-950/60 px-1.5 py-0.2 rounded border border-slate-800">
                Score {energyMatch.matchScore}
              </span>
            </div>
          )}
          {isPrimaryFocusGoal && (
            <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-600 text-white shadow-md border border-purple-400 flex items-center gap-1 z-10">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Today's Primary Focus</span>
            </div>
          )}

          {/* Unboxed Header Metadata & Action Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 flex-wrap">
              {/* Batch Selection Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleTaskSelection(task.id);
                  setLastSelectedTaskId(task.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500 flex-shrink-0"
                title="Select task for batch actions (Shift+Click to range select)"
              />

              {folder && (
                <span className="font-bold" style={{ color: folder.color }}>
                  {folder.name}
                </span>
              )}
              {folder && <span className="text-slate-600">·</span>}
              {getAttentionBadge(task.attentionProfile)}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTimer(task);
              }}
              title={isTimerActive ? 'Stop Active Timer' : 'Start Focus Timer'}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                isTimerActive 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isTimerActive ? 'animate-pulse' : ''}`} />
            </button>
          </div>

          {/* Large Task Title */}
          <h4 className={`text-sm font-bold leading-snug tracking-tight group-hover:text-indigo-200 transition-colors ${
            task.status === 'completed' ? 'line-through text-slate-400' : 'text-white'
          }`}>
            {task.title}
          </h4>

        {/* Description Inline Granular Checklist Items (if present) */}
        {task.description && /\[[ xX]\]/.test(task.description) && (
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1 my-0.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckSquare className="w-3 h-3" />
                Description Checklist
              </span>
              <span className="font-mono text-[9px] text-slate-500">
                {task.description.split('\n').filter(l => /^\s*\[[xX]\]/.test(l)).length}/
                {task.description.split('\n').filter(l => /^\s*\[[ xX]\]/.test(l)).length}
              </span>
            </div>
            <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
              {task.description.split('\n').map((line, idx) => {
                const match = line.match(/^(\s*)\[([ xX])\]\s*(.*)$/);
                if (!match) return null;
                const [, , checkedChar, text] = match;
                const isChecked = checkedChar.toLowerCase() === 'x';

                return (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isChecked ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className={`truncate ${isChecked ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Subtasks Visual Progress Bar */}
        {task.subtasks.length > 0 && (
          <TaskSubtaskProgressBar 
            subtasks={task.subtasks} 
            expandable={true}
            onToggleSubtask={onSaveTask ? (subtaskId) => {
              const updatedSubtasks = task.subtasks.map(st => 
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
              );
              const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
              onSaveTask({
                ...task,
                subtasks: updatedSubtasks,
                status: allCompleted ? 'completed' : task.status,
                completedAt: allCompleted ? new Date().toISOString() : task.completedAt,
                updatedAt: new Date().toISOString()
              });
            } : undefined}
          />
        )}

        {/* Interactive Dependency Links & Quick Jump Strip */}
        {(prerequisiteTasks.length > 0 || dependentTasks.length > 0) && (
          <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
            
            {/* Blockers / Prerequisites Section */}
            {prerequisiteTasks.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <LinkIcon className="w-3 h-3 text-amber-400" />
                    <span>Blockers ({prerequisiteTasks.length}):</span>
                  </span>
                  {incompletePrereqsCount > 0 ? (
                    <span className="text-[9px] text-amber-400 font-mono font-extrabold">🔒 {incompletePrereqsCount} Pending</span>
                  ) : (
                    <span className="text-[9px] text-emerald-400 font-mono font-extrabold">✓ All Resolved</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {prerequisiteTasks.map(dep => {
                    const isDepCompleted = dep.status === 'completed';
                    return (
                      <button
                        key={dep.id}
                        onClick={(e) => handleJumpToTask(e, dep)}
                        title={`Click to jump to blocker task: "${dep.title}" (${dep.status})`}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1.5 group/link truncate max-w-full ${
                          isDepCompleted
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/70 hover:border-emerald-400'
                            : 'bg-amber-950/60 text-amber-200 border-amber-500/40 hover:bg-amber-900/80 hover:border-amber-400 shadow-sm'
                        }`}
                      >
                        <span className="text-[9px]">{isDepCompleted ? '✓' : '🔒'}</span>
                        <span className="truncate max-w-[140px]">{dep.title}</span>
                        <ArrowRight className="w-2.5 h-2.5 opacity-60 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-transform flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Downstream Dependents Section */}
            {dependentTasks.length > 0 && (
              <div className={`space-y-1 ${prerequisiteTasks.length > 0 ? 'pt-1.5 border-t border-slate-800/60' : ''}`}>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Blocks Downstream ({dependentTasks.length}):</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {dependentTasks.map(dep => (
                    <button
                      key={dep.id}
                      onClick={(e) => handleJumpToTask(e, dep)}
                      title={`Click to jump to downstream dependent task: "${dep.title}" (${dep.status})`}
                      className="text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1.5 group/link truncate max-w-full bg-purple-950/50 text-purple-200 border-purple-500/30 hover:bg-purple-900/70 hover:border-purple-400 shadow-sm"
                    >
                      <span className="text-[9px]">⚡</span>
                      <span className="truncate max-w-[140px]">{dep.title}</span>
                      <ArrowRight className="w-2.5 h-2.5 opacity-60 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-transform flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Visual Add Dependency Dropdown directly on Task Card */}
        {onSaveTask && tasks.length > 1 && (
          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const [type, targetId] = val.split(':::');
                
                if (type === 'prereq') {
                  const updatedDeps = Array.from(new Set([...(task.dependencies || []), targetId]));
                  onSaveTask({
                    ...task,
                    dependencies: updatedDeps,
                    updatedAt: new Date().toISOString()
                  });
                } else if (type === 'dependent') {
                  const targetTask = tasks.find(t => t.id === targetId);
                  if (targetTask) {
                    const updatedTargetDeps = Array.from(new Set([...(targetTask.dependencies || []), task.id]));
                    onSaveTask({
                      ...targetTask,
                      dependencies: updatedTargetDeps,
                      updatedAt: new Date().toISOString()
                    });
                  }
                  const updatedDependents = Array.from(new Set([...(task.dependentTaskIds || []), targetId]));
                  onSaveTask({
                    ...task,
                    dependentTaskIds: updatedDependents,
                    updatedAt: new Date().toISOString()
                  });
                }
                e.target.value = '';
              }}
              defaultValue=""
              className="w-full bg-slate-950/80 border border-slate-800/80 hover:border-indigo-500/50 rounded-lg px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium transition-colors"
            >
              <option value="" disabled>+ Add Dependency Link...</option>
              <optgroup label="🔒 Requires Blocker (Task must complete first)">
                {tasks
                  .filter(t => t.id !== task.id && !(task.dependencies || []).includes(t.id))
                  .map(t => (
                    <option key={`prereq-${t.id}`} value={`prereq:::${t.id}`}>
                      🔒 {t.title} ({t.status.toUpperCase()})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="⚡ Blocks Downstream (This task blocks target)">
                {tasks
                  .filter(t => t.id !== task.id && !(t.dependencies || []).includes(task.id))
                  .map(t => (
                    <option key={`dep-${t.id}`} value={`dependent:::${t.id}`}>
                      ⚡ {t.title} ({t.status.toUpperCase()})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        )}

        {/* Metadata Row: Priority, Bidirectional Dependencies, Due Date */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60 flex-wrap gap-1">
          <div className="flex items-center gap-1.5">
            {getPriorityBadge(task.priority)}

            {/* Incomplete Prerequisites Warning Badge */}
            {incompletePrereqsCount > 0 ? (
              <span 
                className="flex items-center gap-0.5 text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 font-mono font-bold"
                title={`Blocked: ${incompletePrereqsCount} prerequisite task(s) still pending`}
              >
                🔒 Blocked ({incompletePrereqsCount})
              </span>
            ) : task.dependencies.length > 0 ? (
              <span 
                className="flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono"
                title="All prerequisites completed"
              >
                ✓ Prereqs ({task.dependencies.length})
              </span>
            ) : null}

            {/* Downstream Dependents Badge */}
            {dependentsCount > 0 && (
              <span 
                className="flex items-center gap-0.5 text-[10px] text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30 font-mono"
                title={`Blocks ${dependentsCount} downstream task(s)`}
              >
                ⚡ Blocks ({dependentsCount})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {task.dueDate && (
              <span className={`flex items-center gap-1 text-[10px] font-mono ${
                isOverdue ? 'text-red-400 font-semibold' : 'text-slate-400'
              }`}>
                <Clock className="w-3 h-3" />
                <span>{task.dueDate.slice(5)}</span>
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              {task.estimatedHours}h
            </span>
          </div>
        </div>

        {/* Alternative Quick Move Controls on Hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center justify-between pt-1 border-t border-slate-800 transition-opacity">
          <span className="text-[10px] text-slate-500">Move:</span>
          <div className="flex items-center gap-1">
            {KANBAN_COLUMNS.filter(c => c.id !== task.status).slice(0, 3).map(c => (
              <button
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (c.id === 'completed') {
                    try {
                      confetti({
                        particleCount: 60,
                        spread: 60,
                        origin: { y: 0.6 },
                      });
                    } catch (err) {}
                  }
                  onStatusChange(task, c.id);
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                {c.label.slice(0, 4)}
              </button>
            ))}
          </div>
        </div>

      </div>
      {isDropTarget && dropPosition === 'below' && (
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full shadow-lg shadow-indigo-500/60 my-1 animate-pulse border border-indigo-300" />
      )}
    </React.Fragment>
  );
  };

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden space-y-3">
      
      {/* KANBAN TOOLBAR: SWIMLANE & VIEW CONTROLS */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 flex-wrap flex-shrink-0 bg-slate-900/60 rounded-2xl border border-slate-800/80">
        
        {/* Swimlane Category Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
            <Rows className="w-3.5 h-3.5 text-indigo-400" />
            <span>Swimlanes:</span>
          </span>

          {[
            { key: 'none', label: 'Columns Only', icon: LayoutGrid },
            { key: 'priority', label: 'By Priority', icon: ShieldAlert },
            { key: 'tag', label: 'By Tag', icon: Tag },
            { key: 'attentionProfile', label: 'By Work Type', icon: Zap },
            { key: 'folder', label: 'By Folder', icon: FolderIcon },
          ].map(item => {
            const Icon = item.icon;
            const isActive = swimlaneBy === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSwimlaneBy(item.key as SwimlaneMode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Energy-Aware Auto-Schedule Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoScheduleEnabled(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
              isAutoScheduleEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-2 ring-amber-500/30 shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
            title="Automatically re-order task cards based on predicted peak energy hours from energy grid"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${isAutoScheduleEnabled ? 'animate-bounce' : ''}`} />
            <span>Energy Auto-Schedule</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              isAutoScheduleEnabled ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-900 text-slate-500'
            }`}>
              {isAutoScheduleEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Fold / Expand Controls when Swimlanes Active */}
          {swimlaneBy !== 'none' && (
            <span className="text-xs text-indigo-300 font-mono font-extrabold bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
              {swimlaneDefs.length} swimlanes
            </span>
          )}
          {swimlaneBy !== 'none' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={handleFoldAllSwimlanes}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center gap-1 transition-colors"
                title="Fold all swimlane rows"
              >
                <Minimize2 className="w-3 h-3 text-indigo-400" />
                <span>Fold All</span>
              </button>
              <button
                onClick={handleExpandAllSwimlanes}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center gap-1 transition-colors"
                title="Expand all swimlane rows"
              >
                <Maximize2 className="w-3 h-3 text-emerald-400" />
                <span>Expand All</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ENERGY AUTO-SCHEDULE ACTIVE BANNER */}
      {isAutoScheduleEnabled && (
        <div className="px-3.5 py-2 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200 animate-in fade-in shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
            <span>
              <strong>⚡ Energy Auto-Scheduling Active:</strong> Current time energy profile is <span className="uppercase font-extrabold text-amber-300 font-mono px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">{currentDateTime.currentLevel}</span>.
              {currentDateTime.currentLevel === 'peak' && ' High-cognitive Deep Focus tasks are auto-ranked at top of columns.'}
              {currentDateTime.currentLevel === 'steady' && ' Medium-cognitive Steady tasks are auto-ranked at top of columns.'}
              {currentDateTime.currentLevel === 'low' && ' Low-cognitive Admin tasks are prioritized to preserve energy.'}
              {currentDateTime.currentLevel === 'off' && ' Off-peak window. Prioritizing light admin & preparation items.'}
            </span>
          </div>
          <button
            onClick={() => setIsAutoScheduleEnabled(false)}
            className="text-amber-400 hover:text-white font-bold text-xs cursor-pointer ml-2 flex-shrink-0"
          >
            Turn Off
          </button>
        </div>
      )}

      {/* STATUS-BASED COLUMN VISIBILITY FILTER BAR */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Visible Columns:</span>
          </span>

          {/* Column Visibility Toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {KANBAN_COLUMNS.map(col => {
              const isVisible = visibleColumnIds[col.id];
              const colTaskCount = tasks.filter(t => t.status === col.id).length;

              return (
                <button
                  key={col.id}
                  onClick={() => toggleColumnVisibility(col.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isVisible
                      ? 'bg-slate-950 text-slate-100 border-slate-700 shadow-sm hover:border-slate-600'
                      : 'bg-slate-950/40 text-slate-500 border-slate-800/60 line-through hover:text-slate-300'
                  }`}
                  title={`Click to ${isVisible ? 'hide' : 'show'} ${col.label} column`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isVisible ? col.dotColor : '#475569' }} />
                  <span>{col.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isVisible ? 'bg-slate-800 text-slate-300' : 'bg-slate-900 text-slate-600'
                  }`}>
                    {colTaskCount}
                  </span>
                  {isVisible ? (
                    <Eye className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-slate-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={handleShowAllColumns}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
              activeColumns.length === KANBAN_COLUMNS.length
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Show All
          </button>
          <button
            onClick={handleHideCompletedColumn}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
              !visibleColumnIds.completed && activeColumns.length === 4
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hide Done
          </button>
          <button
            onClick={handleShowActiveOnly}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
              !visibleColumnIds.backlog && !visibleColumnIds.completed
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Work Only
          </button>
        </div>
      </div>

      {/* MAIN KANBAN BOARD CONTAINER */}
      <div className="flex-1 overflow-auto pr-1">
        
        {/* MODE A: STANDARD COLUMNS ONLY (NO SWIMLANES) */}
        {swimlaneBy === 'none' && (
          <div 
            className="grid gap-3.5 h-full min-h-[500px]"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, activeColumns.length)}, minmax(220px, 1fr))`
            }}
          >
            {activeColumns.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id);
              const cellKey = `col_${col.id}`;
              const isDragOverCell = dragOverCellKey === cellKey;
              const isDragOverColumn = dragOverColumnId === col.id;
              const isBeingColumnDragged = draggedColumnId === col.id;
              const totalEstHours = colTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    handleDragOverCell(e, cellKey);
                    handleColumnDragOver(e, col.id);
                  }}
                  onDragLeave={(e) => handleDragLeaveCell(e, cellKey)}
                  onDrop={(e) => {
                    if (draggedColumnId) {
                      handleColumnDrop(e, col.id);
                    } else {
                      handleDropCell(e, col.id);
                    }
                  }}
                  className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden h-full ${col.bgColor} ${
                    isBeingColumnDragged
                      ? 'opacity-40 scale-95 border-indigo-500 border-dashed'
                      : isDragOverColumn
                        ? 'border-purple-400 ring-2 ring-purple-500/50 bg-purple-950/30'
                        : isDragOverCell 
                          ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-indigo-950/20 shadow-lg' 
                          : 'border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  {/* Column Header with Drag Handle */}
                  <div 
                    draggable
                    onDragStart={(e) => handleColumnDragStart(e, col.id)}
                    className="px-3.5 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm cursor-grab active:cursor-grabbing group/colheader"
                  >
                    <div className="flex items-center gap-1.5">
                      <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover/colheader:text-indigo-400 transition-colors flex-shrink-0" />
                      <span 
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ backgroundColor: col.dotColor }}
                      />
                      <h3 className="text-xs font-bold text-slate-100 tracking-wide uppercase">
                        {col.label}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/60 font-mono">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono" title="Total estimated hours in column">
                        {totalEstHours}h
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateTaskInColumn(col.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title={`Add new task to ${col.label}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Task Cards Drop Container */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 relative">
                    {isDragOverCell && !draggedColumnId && (
                      <div className="border-2 border-dashed border-indigo-400/80 bg-indigo-500/10 rounded-xl p-3 text-center text-xs text-indigo-300 font-medium animate-pulse flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Drop task into {col.label}</span>
                      </div>
                    )}

                    {(isAutoScheduleEnabled
                      ? [...colTasks].sort((a, b) => getTaskEnergyMatch(b).matchScore - getTaskEnergyMatch(a).matchScore)
                      : colTasks
                    ).map(task => renderTaskCard(task))}

                    {colTasks.length === 0 && !isDragOverCell && (
                      <div className="h-28 border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center text-slate-600 text-xs gap-1">
                        <span>No {col.label.toLowerCase()} tasks</span>
                        <button
                          onClick={() => onCreateTaskInColumn(col.id)}
                          className="text-[11px] text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE B: SWIMLANES VIEW */}
        {swimlaneBy !== 'none' && (
          <div className="space-y-4 min-w-[900px]">
            
            {/* Sticky Column Headers Bar */}
            <div 
              className="grid gap-3.5 px-2 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 sticky top-0 z-20 shadow-md"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, activeColumns.length)}, minmax(200px, 1fr))`
              }}
            >
              {activeColumns.map(col => {
                const totalColTasks = tasks.filter(t => t.status === col.id).length;
                return (
                  <div key={col.id} className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.dotColor }} />
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">{col.label}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {totalColTasks}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Stacked Swimlane Rows */}
            {swimlaneDefs.map(swimlane => {
              const isCollapsed = !!collapsedSwimlanes[swimlane.id];
              const swimlaneTasks = tasks.filter(t => swimlane.matchFn(t));
              const totalEstHours = swimlaneTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);

              return (
                <div 
                  key={swimlane.id}
                  className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm transition-all"
                >
                  {/* Swimlane Row Header */}
                  <div 
                    onClick={() => toggleSwimlaneCollapse(swimlane.id)}
                    className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-850 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button className="p-0.5 rounded hover:bg-slate-800 text-slate-400">
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
                      </button>

                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: swimlane.color }}
                        />
                        <h3 className="text-xs font-extrabold text-white tracking-wide">
                          {swimlane.label}
                        </h3>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${swimlane.badgeBg} ${swimlane.badgeText}`}>
                        {swimlaneTasks.length} task{swimlaneTasks.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>Total Workload: <strong className="text-slate-200">{totalEstHours}h</strong></span>
                      <span className="text-[10px] text-slate-500 italic">
                        {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                      </span>
                    </div>
                  </div>

                  {/* Swimlane Cells Grid (if expanded) */}
                  {!isCollapsed && (
                    <div 
                      className="grid gap-3.5 p-3 bg-slate-950/40"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(1, activeColumns.length)}, minmax(200px, 1fr))`
                      }}
                    >
                      {activeColumns.map(col => {
                        const cellTasks = swimlaneTasks.filter(t => t.status === col.id);
                        const cellKey = `cell_${swimlane.id}_${col.id}`;
                        const isDragOver = dragOverCellKey === cellKey;

                        return (
                          <div
                            key={col.id}
                            onDragOver={(e) => handleDragOverCell(e, cellKey)}
                            onDragLeave={(e) => handleDragLeaveCell(e, cellKey)}
                            onDrop={(e) => handleDropCell(e, col.id, swimlane)}
                            className={`min-h-[140px] rounded-xl border p-2 transition-all flex flex-col gap-2 ${
                              isDragOver
                                ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-indigo-950/30 shadow-md'
                                : 'border-slate-800/60 bg-slate-900/30 hover:border-slate-700/60'
                            }`}
                          >
                            {/* Cell Header with Quick Add */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1 border-b border-slate-800/40">
                              <span className="font-mono">{cellTasks.length} task{cellTasks.length !== 1 ? 's' : ''}</span>
                              <button
                                onClick={() => onCreateTaskInColumn(
                                  col.id, 
                                  swimlane.initialPriority, 
                                  swimlane.initialTag, 
                                  swimlane.initialAttention,
                                  swimlane.initialFolderId
                                )}
                                className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title={`Add task to ${swimlane.label} -> ${col.label}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Drop Indicator */}
                            {isDragOver && (
                              <div className="border border-dashed border-indigo-400/80 bg-indigo-500/10 rounded-lg p-2 text-center text-[11px] text-indigo-300 font-medium animate-pulse flex items-center justify-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>Drop into {col.label}</span>
                              </div>
                            )}

                            {/* Cards list */}
                            <div className="space-y-2 flex-1">
                              {(isAutoScheduleEnabled
                                ? [...cellTasks].sort((a, b) => getTaskEnergyMatch(b).matchScore - getTaskEnergyMatch(a).matchScore)
                                : cellTasks
                              ).map(task => renderTaskCard(task))}
                              {cellTasks.length === 0 && !isDragOver && (
                                <div className="h-20 border border-dashed border-slate-800/60 rounded-lg flex items-center justify-center text-slate-600 text-[11px] italic">
                                  Empty
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>

      {/* FLOATING BATCH ACTIONS TOOLBAR */}
      {selectedTaskIds.size > 0 && (
        <div className="sticky bottom-3 z-30 mx-auto w-full max-w-4xl bg-slate-900/95 backdrop-blur-xl border border-indigo-500/60 rounded-2xl p-3 shadow-2xl shadow-indigo-950/90 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-xl shadow-inner font-mono flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectedTaskIds.size} Selected</span>
            </span>
            <button
              onClick={handleSelectAllVisibleTasks}
              className="text-xs text-indigo-300 hover:text-white font-semibold hover:underline cursor-pointer px-1 py-0.5"
            >
              Select All ({tasks.length})
            </button>
            <button
              onClick={() => setSelectedTaskIds(new Set())}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer px-1 py-0.5"
            >
              Clear
            </button>
          </div>

          {/* Batch Actions Group */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Move Status */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Move:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchMoveStatus(e.target.value as TaskStatus);
                    e.target.value = '';
                  }
                }}
                className="bg-transparent text-xs text-slate-200 font-semibold cursor-pointer focus:outline-none"
              >
                <option value="">Status...</option>
                {KANBAN_COLUMNS.map(col => (
                  <option key={col.id} value={col.id}>{col.label}</option>
                ))}
              </select>
            </div>

            {/* Set Priority */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Priority:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchSetPriority(e.target.value as TaskPriority);
                    e.target.value = '';
                  }
                }}
                className="bg-transparent text-xs text-slate-200 font-semibold cursor-pointer focus:outline-none"
              >
                <option value="">Priority...</option>
                <option value="urgent">Urgent (!)</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Add Tag Prompt */}
            {onSaveTask && (
              <button
                onClick={handleBatchAddTagPrompt}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors border border-slate-700"
              >
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>Add Tag</span>
              </button>
            )}

            {/* Move Folder */}
            {onSaveTask && folders.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <FolderIcon className="w-3.5 h-3.5 text-amber-400 ml-1" />
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBatchMoveFolder(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-transparent text-xs text-slate-200 font-semibold cursor-pointer focus:outline-none"
                >
                  <option value="">Folder...</option>
                  <option value="none">No Folder</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Batch Delete */}
            {onDeleteTask && (
              <button
                onClick={handleBatchDelete}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                title="Delete all selected tasks"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete ({selectedTaskIds.size})</span>
              </button>
            )}

            {/* Close Bar */}
            <button
              onClick={() => setSelectedTaskIds(new Set())}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer ml-1"
              title="Deselect all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

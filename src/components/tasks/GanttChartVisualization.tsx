import React, { useState, useMemo, useRef } from 'react';
import { Task, Folder, DevProject, TaskPriority, AttentionProfile } from '../../types';
import { 
  Calendar, ChevronLeft, ChevronRight, Link as LinkIcon, AlertTriangle, 
  CheckCircle2, Clock, ZoomIn, ZoomOut, Layers, Eye, Filter, ArrowRight,
  Sparkles, CheckSquare, GitPullRequest, Info
} from 'lucide-react';

interface GanttChartVisualizationProps {
  tasks: Task[];
  folders: Folder[];
  devProjects?: DevProject[];
  onSelectTask: (task: Task) => void;
  onUpdateTaskDates?: (taskId: string, startDate?: string, dueDate?: string) => void;
}

type ZoomLevel = 'days' | 'weeks' | 'months';

export const GanttChartVisualization: React.FC<GanttChartVisualizationProps> = ({
  tasks,
  folders,
  devProjects = [],
  onSelectTask,
}) => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('days');
  const [offsetDays, setOffsetDays] = useState<number>(-3); // Start 3 days before today
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const [showDependenciesOnly, setShowDependenciesOnly] = useState<boolean>(false);
  const [highlightCriticalPath, setHighlightCriticalPath] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Filter tasks based on project / folder selectors
  const displayedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterProject !== 'all' && t.linkedDevProjectId !== filterProject) return false;
      if (filterFolder !== 'all' && t.folderId !== filterFolder) return false;
      if (showDependenciesOnly && t.dependencies.length === 0 && !tasks.some(other => other.dependencies.includes(t.id))) {
        return false;
      }
      return true;
    });
  }, [tasks, filterProject, filterFolder, showDependenciesOnly]);

  // Compute timeline parameters based on Zoom Level
  const { timelineColumns, dayWidth, totalWidth, startDateObj } = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + offsetDays);

    const cols: {
      key: string;
      dateStr: string;
      label: string;
      subLabel: string;
      isToday: boolean;
      isWeekend: boolean;
      startDate: Date;
      endDate: Date;
    }[] = [];

    const todayStr = new Date().toISOString().slice(0, 10);
    let numCols = 21;
    let width = 64;

    if (zoomLevel === 'days') {
      numCols = 24;
      width = 68;
      for (let i = 0; i < numCols; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        cols.push({
          key: dateStr,
          dateStr,
          label: d.toLocaleDateString([], { weekday: 'short' }),
          subLabel: String(d.getDate()),
          isToday: dateStr === todayStr,
          isWeekend,
          startDate: new Date(d),
          endDate: new Date(d),
        });
      }
    } else if (zoomLevel === 'weeks') {
      numCols = 12;
      width = 110;
      for (let i = 0; i < numCols; i++) {
        const start = new Date(base);
        start.setDate(base.getDate() + i * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const dateStr = start.toISOString().slice(0, 10);
        const isCurrentWeek = new Date() >= start && new Date() <= end;

        cols.push({
          key: `w_${dateStr}`,
          dateStr,
          label: `W${getWeekNumber(start)}`,
          subLabel: `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
          isToday: isCurrentWeek,
          isWeekend: false,
          startDate: start,
          endDate: end,
        });
      }
    } else {
      // months
      numCols = 6;
      width = 160;
      for (let i = 0; i < numCols; i++) {
        const start = new Date(base.getFullYear(), base.getMonth() + i, 1);
        const end = new Date(base.getFullYear(), base.getMonth() + i + 1, 0);
        const dateStr = start.toISOString().slice(0, 10);
        const isCurrentMonth = new Date().getMonth() === start.getMonth() && new Date().getFullYear() === start.getFullYear();

        cols.push({
          key: `m_${dateStr}`,
          dateStr,
          label: start.toLocaleDateString([], { month: 'short' }),
          subLabel: String(start.getFullYear()),
          isToday: isCurrentMonth,
          isWeekend: false,
          startDate: start,
          endDate: end,
        });
      }
    }

    return {
      timelineColumns: cols,
      dayWidth: width,
      totalWidth: numCols * width,
      startDateObj: base,
    };
  }, [zoomLevel, offsetDays]);

  function getWeekNumber(d: Date): number {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  }

  // Navigation handlers
  const handleNavPrev = () => {
    setOffsetDays(prev => prev - (zoomLevel === 'days' ? 7 : zoomLevel === 'weeks' ? 21 : 60));
  };
  const handleNavNext = () => {
    setOffsetDays(prev => prev + (zoomLevel === 'days' ? 7 : zoomLevel === 'weeks' ? 21 : 60));
  };
  const handleNavToday = () => {
    setOffsetDays(-3);
  };

  // Convert date string YYYY-MM-DD to X coordinate in pixels
  const getXForDate = (dateStr?: string): number => {
    if (!dateStr) return 0;
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    if (zoomLevel === 'days') {
      const diffDays = (targetDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays * dayWidth;
    } else if (zoomLevel === 'weeks') {
      const diffDays = (targetDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24);
      return (diffDays / 7) * dayWidth;
    } else {
      // months: approximate
      const diffDays = (targetDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24);
      return (diffDays / 30.4) * dayWidth;
    }
  };

  // Identify dependencies and conflicts
  const dependencyLinks = useMemo(() => {
    const links: {
      fromTaskId: string;
      toTaskId: string;
      fromIdx: number;
      toIdx: number;
      isConflict: boolean;
      sx: number;
      sy: number;
      tx: number;
      ty: number;
    }[] = [];

    displayedTasks.forEach((task, toIdx) => {
      task.dependencies.forEach(depId => {
        const fromIdx = displayedTasks.findIndex(t => t.id === depId);
        if (fromIdx === -1) return;

        const fromTask = displayedTasks[fromIdx];
        const fromEndStr = fromTask.dueDate || fromTask.startDate || new Date().toISOString().slice(0, 10);
        const toStartStr = task.startDate || task.dueDate || new Date().toISOString().slice(0, 10);

        // Conflict check: if predecessor end date is AFTER successor start date!
        const isConflict = fromEndStr > toStartStr;

        const fromX = getXForDate(fromEndStr) + dayWidth;
        const toX = getXForDate(toStartStr);

        const sy = 40 + fromIdx * 44 + 18;
        const ty = 40 + toIdx * 44 + 18;

        links.push({
          fromTaskId: depId,
          toTaskId: task.id,
          fromIdx,
          toIdx,
          isConflict,
          sx: 280 + fromX,
          sy,
          tx: 280 + toX,
          ty,
        });
      });
    });

    return links;
  }, [displayedTasks, dayWidth, zoomLevel, startDateObj]);

  // Highlight check for dependency chains
  const isTaskInActiveChain = (taskId: string) => {
    if (!hoveredTaskId) return false;
    if (hoveredTaskId === taskId) return true;
    const hovered = tasks.find(t => t.id === hoveredTaskId);
    if (!hovered) return false;
    // Check if this task is a prerequisite of hovered task
    if (hovered.dependencies.includes(taskId)) return true;
    // Check if hovered task is a prerequisite of this task
    const thisTask = tasks.find(t => t.id === taskId);
    if (thisTask && thisTask.dependencies.includes(hoveredTaskId)) return true;
    return false;
  };

  // Timeline Statistics
  const stats = useMemo(() => {
    const total = displayedTasks.length;
    const completed = displayedTasks.filter(t => t.status === 'completed').length;
    const withDeps = displayedTasks.filter(t => t.dependencies.length > 0).length;
    const conflicts = dependencyLinks.filter(l => l.isConflict).length;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, withDeps, conflicts, progressPct };
  }, [displayedTasks, dependencyLinks]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden border border-slate-800 rounded-2xl shadow-xl">
      
      {/* 1. TIMELINE TOOLBAR & CONTROLS */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
        
        {/* Navigation & Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handleNavPrev}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNavToday}
              className="px-2.5 py-0.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNavNext}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Buttons (Days / Weeks / Months) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setZoomLevel('days')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                zoomLevel === 'days' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Days
            </button>
            <button
              onClick={() => setZoomLevel('weeks')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                zoomLevel === 'weeks' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weeks
            </button>
            <button
              onClick={() => setZoomLevel('months')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                zoomLevel === 'months' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Months
            </button>
          </div>
        </div>

        {/* Filters & Toggles */}
        <div className="flex items-center gap-2.5">
          {/* Linked Project filter */}
          {devProjects.length > 0 && (
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="all">All Projects</option>
              {devProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Folder filter */}
          <select
            value={filterFolder}
            onChange={(e) => setFilterFolder(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="all">All Folders</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* Only Dependencies toggle */}
          <button
            onClick={() => setShowDependenciesOnly(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showDependenciesOnly 
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Only display tasks with dependencies"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Dependencies ({stats.withDeps})</span>
          </button>
        </div>

      </div>

      {/* 2. STATS & CONFLICT ALERT BAR */}
      <div className="px-5 py-2 border-b border-slate-800/80 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tracking <strong>{stats.total}</strong> Tasks</span>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats.completed} Completed ({stats.progressPct}%)</span>
          </span>
          <span className="flex items-center gap-1.5 text-indigo-300">
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{dependencyLinks.length} Dependency Arrows</span>
          </span>
        </div>

        {stats.conflicts > 0 ? (
          <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 font-semibold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{stats.conflicts} Schedule Conflict (Predecessor ends after successor)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <span>Tip: Hover any task to highlight its prerequisite chain</span>
          </div>
        )}
      </div>

      {/* 3. MAIN GANTT CHART BODY (LEFT TASK LIST + RIGHT SCROLLABLE TIMELINE) */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative bg-slate-950 select-none"
      >
        <div 
          className="relative min-w-max pb-24"
          style={{ width: totalWidth + 280 }}
        >
          
          {/* Header Row: Task Column Title + Date Columns */}
          <div className="flex border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-30 h-10 shadow-sm">
            {/* Frozen Left Column Title */}
            <div className="w-[280px] flex-shrink-0 px-4 flex items-center justify-between border-r border-slate-800 text-xs font-bold text-slate-300 tracking-wide uppercase bg-slate-900 sticky left-0 z-40">
              <span>Task & Precedence</span>
              <span className="text-[10px] text-slate-500 font-mono">Hours</span>
            </div>

            {/* Date Rulers */}
            <div className="flex" style={{ width: totalWidth }}>
              {timelineColumns.map(col => (
                <div
                  key={col.key}
                  style={{ width: dayWidth }}
                  className={`flex flex-col items-center justify-center border-r border-slate-800/60 text-center transition-colors ${
                    col.isToday 
                      ? 'bg-indigo-500/15 text-indigo-300 font-bold border-indigo-500/30' 
                      : col.isWeekend 
                        ? 'bg-slate-950/60 text-slate-500' 
                        : 'text-slate-400'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-tight">
                    {col.label}
                  </span>
                  <span className={`text-[11px] font-mono leading-none ${col.isToday ? 'text-indigo-400 font-extrabold' : 'text-slate-300'}`}>
                    {col.subLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SVG OVERLAY FOR BEZIER ARROWS */}
          <svg
            className="absolute inset-0 pointer-events-none z-20"
            style={{ 
              width: totalWidth + 280, 
              height: Math.max(300, displayedTasks.length * 44 + 60) 
            }}
          >
            <defs>
              {/* Normal Blue Arrowhead */}
              <marker
                id="gantt-arrow-normal"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#818cf8" />
              </marker>

              {/* Conflict / Warning Red Arrowhead */}
              <marker
                id="gantt-arrow-conflict"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#f87171" />
              </marker>

              {/* Highlight Glow Arrowhead */}
              <marker
                id="gantt-arrow-highlight"
                markerWidth="9"
                markerHeight="7"
                refX="8"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 9 3.5, 0 7" fill="#38bdf8" />
              </marker>
            </defs>

            {/* Background Grid Lines for Weekends and Today */}
            {timelineColumns.map((col, cIdx) => {
              const xPos = 280 + cIdx * dayWidth;
              if (col.isToday) {
                return (
                  <line
                    key={`today_line_${col.key}`}
                    x1={xPos + dayWidth / 2}
                    y1={0}
                    x2={xPos + dayWidth / 2}
                    y2={displayedTasks.length * 44 + 60}
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    className="opacity-70"
                  />
                );
              }
              return null;
            })}

            {/* Bezier Curves */}
            {dependencyLinks.map(link => {
              const isHovered = hoveredTaskId === link.fromTaskId || hoveredTaskId === link.toTaskId;
              const strokeColor = link.isConflict ? '#f87171' : isHovered ? '#38bdf8' : '#818cf8';
              const strokeWidth = isHovered ? 2.5 : 1.5;
              const markerId = link.isConflict ? 'gantt-arrow-conflict' : isHovered ? 'gantt-arrow-highlight' : 'gantt-arrow-normal';

              // Calculate control points for smooth S-curve
              const deltaX = Math.abs(link.tx - link.sx);
              const controlOffset = Math.max(30, deltaX * 0.45);
              const cx1 = link.sx + controlOffset;
              const cx2 = link.tx - controlOffset;

              return (
                <g key={`link_${link.fromTaskId}_${link.toTaskId}`}>
                  <path
                    d={`M ${link.sx} ${link.sy} C ${cx1} ${link.sy}, ${cx2} ${link.ty}, ${link.tx} ${link.ty}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={link.isConflict ? '4,4' : undefined}
                    markerEnd={`url(#${markerId})`}
                    className={`transition-all duration-200 ${isHovered ? 'opacity-100 filter drop-shadow' : 'opacity-60'}`}
                  />
                </g>
              );
            })}
          </svg>

          {/* TASK ROWS */}
          <div className="relative z-10 divide-y divide-slate-800/40">
            {displayedTasks.map((task, idx) => {
              const folder = folders.find(f => f.id === task.folderId);
              const isDone = task.status === 'completed';
              const isInChain = isTaskInActiveChain(task.id);
              const isHovered = hoveredTaskId === task.id;

              // Task dates calculation
              const defaultToday = new Date().toISOString().slice(0, 10);
              const taskStart = task.startDate || task.dueDate || defaultToday;
              const taskEnd = task.dueDate || task.startDate || defaultToday;

              // Compute X and Width
              const barLeft = 280 + Math.max(0, getXForDate(taskStart));
              const endX = 280 + Math.max(0, getXForDate(taskEnd)) + dayWidth;
              const barWidth = Math.max(dayWidth * 0.95, endX - barLeft);

              // Subtasks count
              const completedSubtasks = task.subtasks.filter(st => st.completed).length;
              const totalSubtasks = task.subtasks.length;
              const subtaskPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : isDone ? 100 : 0;

              // Color gradient per attention profile & status
              const barGradient = 
                isDone ? 'from-emerald-600 via-teal-600 to-emerald-500 border-emerald-400/40 shadow-emerald-500/10' :
                task.attentionProfile === 'deep' ? 'from-purple-600 via-indigo-600 to-indigo-500 border-indigo-400/40 shadow-indigo-500/10' :
                task.attentionProfile === 'shallow' ? 'from-cyan-600 via-blue-600 to-cyan-500 border-cyan-400/40 shadow-cyan-500/10' :
                'from-slate-700 to-slate-600 border-slate-500/40';

              return (
                <div
                  key={task.id}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                  className={`flex items-center h-11 transition-colors group relative ${
                    isHovered ? 'bg-slate-800/60' : isInChain ? 'bg-slate-900/40' : 'hover:bg-slate-900/30'
                  }`}
                >
                  {/* FROZEN LEFT COLUMN: Task Name, Status & Hours */}
                  <div 
                    onClick={() => onSelectTask(task)}
                    className="w-[280px] flex-shrink-0 px-4 h-full flex items-center justify-between border-r border-slate-800 bg-slate-950/95 sticky left-0 z-30 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span 
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isDone ? 'bg-emerald-400' :
                          task.priority === 'urgent' ? 'bg-red-400' :
                          task.priority === 'high' ? 'bg-orange-400' :
                          'bg-indigo-400'
                        }`} 
                      />
                      <span className={`text-xs font-semibold truncate ${
                        isDone ? 'line-through text-slate-500' : isHovered ? 'text-indigo-300' : 'text-slate-200'
                      }`}>
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px] text-slate-400">
                      {task.dependencies.length > 0 && (
                        <span 
                          className="flex items-center gap-0.5 text-[10px] text-indigo-400 bg-indigo-500/15 px-1 rounded border border-indigo-500/30"
                          title={`Depends on ${task.dependencies.length} tasks`}
                        >
                          <LinkIcon className="w-2.5 h-2.5" />
                          <span>{task.dependencies.length}</span>
                        </span>
                      )}
                      <span>{task.estimatedHours}h</span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: GANTT BAR */}
                  <div
                    onClick={() => onSelectTask(task)}
                    style={{ left: barLeft, width: barWidth }}
                    className={`absolute h-8 rounded-xl bg-gradient-to-r ${barGradient} border text-white text-xs font-semibold shadow-md flex items-center px-3 justify-between cursor-pointer transition-all duration-150 z-20 overflow-hidden ${
                      isHovered ? 'ring-2 ring-indigo-400 scale-[1.01] brightness-110' : ''
                    }`}
                    title={`${task.title} | ${taskStart} → ${taskEnd} | ${task.estimatedHours}h (${task.status})`}
                  >
                    {/* Left: Title + Priority tag */}
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="truncate drop-shadow-sm">{task.title}</span>
                      {folder && (
                        <span 
                          className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase opacity-90 hidden sm:inline"
                          style={{ backgroundColor: `${folder.color}35`, color: '#ffffff' }}
                        >
                          {folder.name.slice(0, 8)}
                        </span>
                      )}
                    </div>

                    {/* Right: Subtasks micro progress counter */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono flex-shrink-0 opacity-90">
                      {totalSubtasks > 0 && (
                        <span className="bg-black/30 px-1.5 py-0.5 rounded text-emerald-300 font-bold">
                          {completedSubtasks}/{totalSubtasks}
                        </span>
                      )}
                      <span>{task.estimatedHours}h</span>
                    </div>

                    {/* Subtasks Progress Bar bottom fill */}
                    {totalSubtasks > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                        <div 
                          className="h-full bg-emerald-300 transition-all duration-300"
                          style={{ width: `${subtaskPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {displayedTasks.length === 0 && (
              <div className="p-16 text-center text-slate-500 text-xs">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-400" />
                <p>No tasks matching the selected Gantt filters.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 4. FOOTER LEGEND */}
      <div className="px-6 py-2.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600" />
            <span>Deep Work</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600" />
            <span>Shallow</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600" />
            <span>Completed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-400" />
            <span>Bezier Dependency Link</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-400 border-b border-dashed border-red-400" />
            <span>Schedule Conflict</span>
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
          Click any task bar to inspect full dependencies, recurrence & reminders.
        </div>
      </div>

    </div>
  );
};

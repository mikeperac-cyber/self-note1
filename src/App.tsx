import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, Note, Task, SheetData, DevProject, 
  PlannedBlock, WeeklyEnergyGrid, TimeEntry, TaskActivity, AppModule, DailyFocusGoal 
} from './types';
import { 
  initializeStorage, loadFromStorage, saveToStorage, STORAGE_KEYS, 
  DEFAULT_FOLDERS, DEFAULT_NOTES, DEFAULT_TASKS, DEFAULT_SHEETS, 
  DEFAULT_DEV_PROJECTS, getDefaultEnergyGrid, exportFullBackup, restoreFullBackup,
  clearAllDemoData
} from './utils/storage';
import { FOLDER_ICONS } from './components/modals/FolderManagerModal';
import { NotesModule } from './components/notes/NotesModule';
import { TasksModule } from './components/tasks/TasksModule';
import { SheetsModule } from './components/sheets/SheetsModule';
import { DevHubModule } from './components/devhub/DevHubModule';
import { FocusModule } from './components/focus/FocusModule';
import { GlobalInboxModule } from './components/inbox/GlobalInboxModule';
import { VoiceCaptureStudio } from './components/voice/VoiceCaptureStudio';
import { QuickCaptureModal } from './components/quickcapture/QuickCaptureModal';
import { CommandPalette } from './components/modals/CommandPalette';
import { FolderManagerModal } from './components/modals/FolderManagerModal';
import { SessionReportModal, SessionReportData } from './components/modals/SessionReportModal';
import { FloatingWindowOverlay } from './components/floating/FloatingWindowOverlay';
import { ScreenshotTool } from './components/screenshot/ScreenshotTool';
import { WindowsTitlebar } from './components/desktop/WindowsTitlebar';
import { BreadcrumbsBar } from './components/navigation/BreadcrumbsBar';

import { 
  FileText, CheckSquare, FileSpreadsheet, Terminal, Compass, Inbox,
  Mic, Zap, Search, Bell, Settings, Download, Upload, Plus, 
  Folder as FolderIcon, Play, Square, Layers, Sparkles, ExternalLink,
  Laptop, ShieldAlert, Clock, Tag, Sun, Moon, Camera,
  Pin, PinOff, PanelLeft, PanelLeftClose, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal,
  Trash2, X, Cloud, BarChart3, GripVertical
} from 'lucide-react';

export default function App() {
  // Initialize storage once on mount
  useEffect(() => {
    initializeStorage();
  }, []);

  // Application Data States
  const [folders, setFolders] = useState<Folder[]>(() => loadFromStorage(STORAGE_KEYS.FOLDERS, DEFAULT_FOLDERS));
  const [notes, setNotes] = useState<Note[]>(() => loadFromStorage(STORAGE_KEYS.NOTES, DEFAULT_NOTES));
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage(STORAGE_KEYS.TASKS, DEFAULT_TASKS));
  const [sheets, setSheets] = useState<SheetData[]>(() => loadFromStorage(STORAGE_KEYS.SHEETS, DEFAULT_SHEETS));
  const [devProjects, setDevProjects] = useState<DevProject[]>(() => loadFromStorage(STORAGE_KEYS.DEV_PROJECTS, DEFAULT_DEV_PROJECTS));
  const [plannedBlocks, setPlannedBlocks] = useState<PlannedBlock[]>(() => loadFromStorage(STORAGE_KEYS.PLANNED_BLOCKS, []));
  const [energyGrid, setEnergyGrid] = useState<WeeklyEnergyGrid>(() => loadFromStorage(STORAGE_KEYS.ENERGY_GRID, getDefaultEnergyGrid()));
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => loadFromStorage(STORAGE_KEYS.TIME_ENTRIES, []));
  const [dailyGoal, setDailyGoal] = useState<DailyFocusGoal | null>(() => loadFromStorage(STORAGE_KEYS.DAILY_FOCUS_GOAL, null));
  const [viewDensity, setViewDensity] = useState<'spacious' | 'compact'>(() => {
    return (localStorage.getItem('app_view_density') as 'spacious' | 'compact') || 'spacious';
  });

  useEffect(() => {
    localStorage.setItem('app_view_density', viewDensity);
  }, [viewDensity]);

  const handleSaveDailyGoal = (goal: DailyFocusGoal | null) => {
    setDailyGoal(goal);
    saveToStorage(STORAGE_KEYS.DAILY_FOCUS_GOAL, goal);
  };

  // Theme State (Dark / Light / Eye Comfort)
  const [theme, setTheme] = useState<'dark' | 'light' | 'eye-comfort'>(() => {
    return (localStorage.getItem('app_theme') as 'dark' | 'light' | 'eye-comfort') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'eye-comfort');
    document.body.classList.remove('dark', 'light', 'eye-comfort');

    if (theme === 'light') {
      root.classList.add('light');
      document.body.classList.add('light');
    } else if (theme === 'eye-comfort') {
      root.classList.add('eye-comfort', 'dark');
      document.body.classList.add('eye-comfort', 'dark');
    } else {
      root.classList.add('dark');
      document.body.classList.add('dark');
    }
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === 'dark') return 'eye-comfort';
      if (prev === 'eye-comfort') return 'light';
      return 'dark';
    });
  };

  // Sidebar Pin/Unpin State
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_sidebar_pinned');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('app_sidebar_pinned', JSON.stringify(isSidebarPinned));
  }, [isSidebarPinned]);

  const toggleSidebarPin = () => {
    setIsSidebarPinned(prev => !prev);
  };
  const [activeModule, setActiveModule] = useState<AppModule>('tasks');
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Unique tags across tasks with count
  const allTaskTags = React.useMemo(() => {
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
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  // Tag Grouping Mode, Search Query & Collapse State
  const [tagGroupingMode, setTagGroupingMode] = useState<'frequency' | 'category' | 'cloud' | 'stats'>('frequency');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [collapsedTagGroups, setCollapsedTagGroups] = useState<Record<string, boolean>>({});
  const [isTagQuickMode, setIsTagQuickMode] = useState(false);

  // Persisted Custom Tag Reordering State per Category Group
  const [customTagOrders, setCustomTagOrders] = useState<Record<string, string[]>>(() => {
    return loadFromStorage('selfnote_custom_tag_order_v1', {});
  });

  useEffect(() => {
    saveToStorage('selfnote_custom_tag_order_v1', customTagOrders);
  }, [customTagOrders]);

  // Drag to Reorder Tags State & Handlers
  const [draggedTagInfo, setDraggedTagInfo] = useState<{ groupId: string; tag: string } | null>(null);
  const [dragOverTagInfo, setDragOverTagInfo] = useState<{ groupId: string; tag: string } | null>(null);

  const handleTagDragStart = (e: React.DragEvent, groupId: string, tag: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ groupId, tag }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTagInfo({ groupId, tag });
  };

  const handleTagDragOver = (e: React.DragEvent, groupId: string, targetTag: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTagInfo && draggedTagInfo.groupId === groupId && draggedTagInfo.tag !== targetTag) {
      setDragOverTagInfo({ groupId, tag: targetTag });
    }
  };

  const handleTagDrop = (e: React.DragEvent, groupId: string, targetTag: string, currentGroupTags: [string, number][]) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTagInfo || draggedTagInfo.groupId !== groupId) return;
    const sourceTag = draggedTagInfo.tag;
    if (sourceTag === targetTag) return;

    const currentTagNames = currentGroupTags.map(([t]) => t);
    const fromIndex = currentTagNames.indexOf(sourceTag);
    const toIndex = currentTagNames.indexOf(targetTag);

    if (fromIndex !== -1 && toIndex !== -1) {
      const newOrder = [...currentTagNames];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);

      setCustomTagOrders(prev => ({
        ...prev,
        [groupId]: newOrder,
      }));
    }

    setDraggedTagInfo(null);
    setDragOverTagInfo(null);
  };

  const handleTagDragEnd = () => {
    setDraggedTagInfo(null);
    setDragOverTagInfo(null);
  };

  const toggleTagGroupCollapse = (groupId: string) => {
    setCollapsedTagGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Comprehensive Tag Usage Statistics across Notes & Tasks
  const tagStatsData = React.useMemo(() => {
    const tagMap = new Map<string, { taskCount: number; noteCount: number }>();

    // Count in Tasks
    tasks.forEach(t => {
      (t.tags || []).forEach(tag => {
        const clean = tag.trim();
        if (!clean) return;
        const current = tagMap.get(clean) || { taskCount: 0, noteCount: 0 };
        current.taskCount += 1;
        tagMap.set(clean, current);
      });
    });

    // Count in Notes
    notes.forEach(n => {
      (n.tags || []).forEach(tag => {
        const clean = tag.trim();
        if (!clean) return;
        const current = tagMap.get(clean) || { taskCount: 0, noteCount: 0 };
        current.noteCount += 1;
        tagMap.set(clean, current);
      });
    });

    const items = Array.from(tagMap.entries()).map(([tag, { taskCount, noteCount }]) => ({
      tag,
      taskCount,
      noteCount,
      totalCount: taskCount + noteCount,
    })).sort((a, b) => b.totalCount - a.totalCount);

    const maxTotalCount = items.length > 0 ? Math.max(...items.map(i => i.totalCount), 1) : 1;
    const grandTotalOccurrences = items.reduce((sum, i) => sum + i.totalCount, 0);

    return { items, maxTotalCount, grandTotalOccurrences };
  }, [tasks, notes]);

  // Filtered tag stats by search query
  const filteredTagStats = React.useMemo(() => {
    if (!tagSearchQuery.trim()) return tagStatsData.items;
    const query = tagSearchQuery.toLowerCase().trim();
    return tagStatsData.items.filter(item => item.tag.toLowerCase().includes(query));
  }, [tagStatsData.items, tagSearchQuery]);

  // Filtered tags based on search query
  const filteredTaskTags = React.useMemo(() => {
    if (!tagSearchQuery.trim()) return allTaskTags;
    const query = tagSearchQuery.toLowerCase().trim();
    return allTaskTags.filter(([tag]) => tag.toLowerCase().includes(query));
  }, [allTaskTags, tagSearchQuery]);

  // Max and Min tag counts for Tag Cloud font size scaling
  const { maxTagCount, minTagCount } = React.useMemo(() => {
    if (filteredTaskTags.length === 0) return { maxTagCount: 1, minTagCount: 1 };
    const counts = filteredTaskTags.map(([, count]) => count);
    return {
      maxTagCount: Math.max(...counts, 1),
      minTagCount: Math.min(...counts, 1),
    };
  }, [filteredTaskTags]);

  // Global Keyboard Shortcuts for Tag Selection (Press 'T' then 1-9 or Alt+1-9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focused in input/textarea/contentEditable
      const target = e.target as HTMLElement;
      if (
        target && 
        (target.tagName === 'INPUT' || 
         target.tagName === 'TEXTAREA' || 
         target.isContentEditable)
      ) {
        return;
      }

      // 'T' or 't' key toggles Tag Quick Mode
      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsTagQuickMode(prev => !prev);
        return;
      }

      // Escape exits Tag Quick Mode
      if (e.key === 'Escape' && isTagQuickMode) {
        setIsTagQuickMode(false);
        return;
      }

      // Check for number key 1-9 or 0
      const isNumberKey = /^[0-9]$/.test(e.key);
      const isAltNumber = e.altKey && isNumberKey;

      if ((isTagQuickMode && isNumberKey) || isAltNumber) {
        const num = parseInt(e.key, 10);
        // Map 1 -> index 0, 2 -> index 1, ... 9 -> index 8, 0 -> index 9
        const targetIndex = num === 0 ? 9 : num - 1;

        if (filteredTaskTags[targetIndex]) {
          e.preventDefault();
          const targetTag = filteredTaskTags[targetIndex][0];
          handleToggleTag(targetTag);
          // Turn off quick mode after selecting a tag
          setIsTagQuickMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTagQuickMode, filteredTaskTags]);

  // Grouped Tags Calculation (By Frequency or By Category with custom drag order)
  const groupedTags = React.useMemo(() => {
    let rawGroups: { id: string; title: string; tags: [string, number][] }[] = [];

    if (tagGroupingMode === 'frequency') {
      const frequent = filteredTaskTags.filter(([, count]) => count >= 3);
      const regular = filteredTaskTags.filter(([, count]) => count === 2);
      const rare = filteredTaskTags.filter(([, count]) => count === 1);

      rawGroups = [
        { id: 'frequent', title: '🔥 Frequent (3+)', tags: frequent },
        { id: 'regular', title: '🔹 Regular (2)', tags: regular },
        { id: 'rare', title: '☕ Rare (1)', tags: rare },
      ].filter(g => g.tags.length > 0);
    } else {
      const workKeywords = ['work', 'project', 'dev', 'code', 'feature', 'bug', 'api', 'design', 'client', 'sprint', 'urgent', 'build', 'release', 'launch', 'vercel', 'react', 'ts'];
      const opsKeywords = ['admin', 'finance', 'billing', 'legal', 'meeting', 'ops', 'inbox', 'capture', 'review', 'audit', 'task', 'doc'];

      const workTags: [string, number][] = [];
      const opsTags: [string, number][] = [];
      const generalTags: [string, number][] = [];

      filteredTaskTags.forEach(([tag, count]) => {
        const lower = tag.toLowerCase();
        if (workKeywords.some(k => lower.includes(k))) {
          workTags.push([tag, count]);
        } else if (opsKeywords.some(k => lower.includes(k))) {
          opsTags.push([tag, count]);
        } else {
          generalTags.push([tag, count]);
        }
      });

      rawGroups = [
        { id: 'work', title: '💼 Work & Dev', tags: workTags },
        { id: 'ops', title: '📋 Admin & Ops', tags: opsTags },
        { id: 'general', title: '🌱 General & Ideas', tags: generalTags },
      ].filter(g => g.tags.length > 0);
    }

    // Apply custom persisted tag ordering per group if present
    return rawGroups.map(group => {
      const savedOrder = customTagOrders[group.id];
      if (!savedOrder || savedOrder.length === 0) return group;

      const sortedTags = [...group.tags].sort((a, b) => {
        const indexA = savedOrder.indexOf(a[0]);
        const indexB = savedOrder.indexOf(b[0]);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      });

      return { ...group, tags: sortedTags };
    });
  }, [filteredTaskTags, tagGroupingMode, customTagOrders]);

  // Modals & Panels
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isReminderTrayOpen, setIsReminderTrayOpen] = useState(false);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const [sessionReportData, setSessionReportData] = useState<SessionReportData | null>(null);

  // Active Timer State
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number>(0);
  const timerIntervalRef = useRef<any>(null);

  const backupInputRef = useRef<HTMLInputElement | null>(null);

  // Live Timer ticker
  useEffect(() => {
    if (activeTimerTaskId) {
      timerIntervalRef.current = setInterval(() => {
        setActiveTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setActiveTimerSeconds(0);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeTimerTaskId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K or Cmd + K -> Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Ctrl + Shift + N -> Natural Language Quick Capture
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickCaptureOpen(prev => !prev);
      }
      // Ctrl + Shift + V -> Voice Capture Studio
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setIsVoiceOpen(prev => !prev);
      }
      // Ctrl + Shift + S -> Screenshot Tool
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsScreenshotOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save Handlers
  const handleSaveFolders = (newFolders: Folder[]) => {
    setFolders(newFolders);
    saveToStorage(STORAGE_KEYS.FOLDERS, newFolders);
  };

  const handleSaveNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    saveToStorage(STORAGE_KEYS.NOTES, newNotes);
  };

  const handleSaveScreenshotAsNote = (dataUrl: string, title: string) => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title,
      content: `<h2>${title}</h2><p>Captured on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}:</p><p><img src="${dataUrl}" alt="Screenshot" style="max-width:100%; border-radius:8px; margin-top:8px;" /></p>`,
      folderId: activeFolderId,
      tags: ['Screenshot'],
      isPinned: false,
      isFavorite: false,
      wordCount: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleSaveNotes([newNote, ...notes]);
    setActiveModule('notes');
  };

  const handleSaveSingleNote = (updatedNote: Note) => {
    const exists = notes.some(n => n.id === updatedNote.id);
    const updated = exists 
      ? notes.map(n => n.id === updatedNote.id ? updatedNote : n)
      : [updatedNote, ...notes];
    handleSaveNotes(updated);
  };

  const handleCreateNote = (folderId?: string) => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title: 'Untitled Document',
      content: '<h2>Untitled Document</h2><p>Start drafting your notes or documentation...</p>',
      folderId: folderId || activeFolderId,
      tags: [],
      isPinned: false,
      isFavorite: false,
      wordCount: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleSaveNotes([newNote, ...notes]);
    setActiveModule('notes');
  };

  const handleDeleteNote = (noteId: string) => {
    handleSaveNotes(notes.filter(n => n.id !== noteId));
  };

  const handleSaveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    saveToStorage(STORAGE_KEYS.TASKS, newTasks);
  };

  const handleSaveSingleTask = (updatedTask: Task) => {
    const exists = tasks.some(t => t.id === updatedTask.id);
    const updated = exists 
      ? tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
      : [updatedTask, ...tasks];
    handleSaveTasks(updated);
  };

  const handleCreateTask = (initialFolderId?: string) => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: 'New Priority Task',
      folderId: initialFolderId || activeFolderId,
      tags: ['Work'],
      priority: 'medium',
      status: 'todo',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 3600 * 1000 * 24 * 3).toISOString().slice(0, 10),
      estimatedHours: 1.5,
      actualHours: 0,
      attentionProfile: 'deep',
      dependencies: [],
      subtasks: [],
      reminders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleSaveTasks([newTask, ...tasks]);
    setActiveModule('tasks');
  };

  const handleDeleteTask = (taskId: string) => {
    if (activeTimerTaskId === taskId) {
      setActiveTimerTaskId(null);
    }
    handleSaveTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleSaveSheets = (newSheets: SheetData[]) => {
    setSheets(newSheets);
    saveToStorage(STORAGE_KEYS.SHEETS, newSheets);
  };

  const handleSaveSingleSheet = (updatedSheet: SheetData) => {
    const exists = sheets.some(s => s.id === updatedSheet.id);
    const updated = exists 
      ? sheets.map(s => s.id === updatedSheet.id ? updatedSheet : s)
      : [updatedSheet, ...sheets];
    handleSaveSheets(updated);
  };

  const handleCreateSheet = (mode: 'spreadsheet' | 'database', folderId?: string) => {
    const newSheet: SheetData = {
      id: `sheet_${Date.now()}`,
      title: mode === 'spreadsheet' ? 'New Financial Worksheet' : 'New Dynamic Database',
      mode,
      folderId: folderId || activeFolderId,
      rows: mode === 'spreadsheet' ? 12 : 3,
      cols: mode === 'spreadsheet' ? 6 : 4,
      cells: mode === 'spreadsheet' ? {
        'A1': { raw: 'Item Description', bold: true },
        'B1': { raw: 'Unit Cost ($)', bold: true },
        'C1': { raw: 'Quantity', bold: true },
        'D1': { raw: 'Total ($)', bold: true },
        'A2': { raw: 'Sample Line Item' },
        'B2': { raw: '50', format: 'currency' },
        'C2': { raw: '4' },
        'D2': { raw: '=B2*C2', format: 'currency' },
        'A3': { raw: 'Grand Total', bold: true },
        'D3': { raw: '=SUM(D2:D2)', bold: true, format: 'currency' },
      } : {},
      dbColumns: mode === 'database' ? [
        { id: 'c_title', name: 'Title', type: 'text' },
        { id: 'c_status', name: 'Status', type: 'status', options: ['Planned', 'In Progress', 'Shipped'] },
        { id: 'c_owner', name: 'Assignee', type: 'text' }
      ] : undefined,
      dbRows: mode === 'database' ? [
        { id: 'r_1', c_title: 'API Authentication Gate', c_status: 'In Progress', c_owner: 'Engineering' }
      ] : undefined,
      updatedAt: new Date().toISOString(),
    };
    handleSaveSheets([newSheet, ...sheets]);
    setActiveModule('sheets');
  };

  const handleDeleteSheet = (sheetId: string) => {
    handleSaveSheets(sheets.filter(s => s.id !== sheetId));
  };

  const handleSaveDevProjects = (newProjects: DevProject[]) => {
    setDevProjects(newProjects);
    saveToStorage(STORAGE_KEYS.DEV_PROJECTS, newProjects);
  };

  const handleSaveSingleProject = (updatedProject: DevProject) => {
    const exists = devProjects.some(p => p.id === updatedProject.id);
    const updated = exists 
      ? devProjects.map(p => p.id === updatedProject.id ? updatedProject : p)
      : [updatedProject, ...devProjects];
    handleSaveDevProjects(updated);
  };

  const handleCreateProject = (newProject: DevProject) => {
    handleSaveDevProjects([newProject, ...devProjects]);
  };

  const handleDeleteProject = (projectId: string) => {
    handleSaveDevProjects(devProjects.filter(p => p.id !== projectId));
  };

  const handleCreateRetroNote = (title: string, content: string, folderId?: string, tags: string[] = ['Retrospective']) => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title,
      content,
      folderId,
      tags,
      isPinned: true,
      isFavorite: false,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleSaveNotes([newNote, ...notes]);
    setActiveModule('notes');
  };

  // Timer Control
  const handleToggleTimer = (task: Task) => {
    if (activeTimerTaskId === task.id) {
      const elapsedSecs = activeTimerSeconds;
      // Stop timer and record time entry
      const minutesSpent = Math.max(1, Math.round(elapsedSecs / 60));
      const newEntry: TimeEntry = {
        id: `te_${Date.now()}`,
        taskId: task.id,
        startTime: new Date(Date.now() - elapsedSecs * 1000).toISOString(),
        endTime: new Date().toISOString(),
        durationMinutes: minutesSpent,
        energyLevel: task.attentionProfile === 'deep' ? 'peak' : 'steady',
      };
      const updatedEntries = [newEntry, ...timeEntries];
      setTimeEntries(updatedEntries);
      saveToStorage(STORAGE_KEYS.TIME_ENTRIES, updatedEntries);

      // Update task actualHours
      const newActualHours = Math.round(((task.actualHours || 0) + (minutesSpent / 60)) * 10) / 10;
      const updatedTask = {
        ...task,
        actualHours: newActualHours,
        updatedAt: new Date().toISOString(),
      };
      handleSaveSingleTask(updatedTask);

      setActiveTimerTaskId(null);

      // Open Session Report popup
      setSessionReportData({
        task: updatedTask,
        durationSeconds: elapsedSecs,
        durationMinutes: minutesSpent,
      });
    } else {
      // Start timer on this task
      setActiveTimerTaskId(task.id);
      setActiveTimerSeconds(0);
    }
  };

  // Spawn Quick Task from DevHub
  const handleSpawnQuickTask = (title: string, priority: string, projectId: string) => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title,
      tags: ['DevOps', 'Vercel'],
      priority: (priority as any) || 'high',
      status: 'todo',
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 3600 * 1000 * 24 * 2).toISOString().slice(0, 10),
      estimatedHours: 1.0,
      actualHours: 0,
      attentionProfile: 'deep',
      dependencies: [],
      subtasks: [],
      reminders: [],
      linkedDevProjectId: projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleSaveTasks([newTask, ...tasks]);
    setActiveModule('tasks');
  };

  // Export full JSON backup
  const handleExportBackup = () => {
    const json = exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selfnote_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restore full JSON backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = restoreFullBackup(content);
        if (ok) {
          // reload state
          setFolders(loadFromStorage(STORAGE_KEYS.FOLDERS, DEFAULT_FOLDERS));
          setNotes(loadFromStorage(STORAGE_KEYS.NOTES, DEFAULT_NOTES));
          setTasks(loadFromStorage(STORAGE_KEYS.TASKS, DEFAULT_TASKS));
          setSheets(loadFromStorage(STORAGE_KEYS.SHEETS, DEFAULT_SHEETS));
          setDevProjects(loadFromStorage(STORAGE_KEYS.DEV_PROJECTS, DEFAULT_DEV_PROJECTS));
          setEnergyGrid(loadFromStorage(STORAGE_KEYS.ENERGY_GRID, getDefaultEnergyGrid()));
          setPlannedBlocks(loadFromStorage(STORAGE_KEYS.PLANNED_BLOCKS, []));
          setTimeEntries(loadFromStorage(STORAGE_KEYS.TIME_ENTRIES, []));
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Erase All Data
  const handleClearAllData = () => {
    if (confirm("Are you sure you want to erase all data? This will clear all tasks, notes, sheets, projects, and folders.")) {
      clearAllDemoData();
      setFolders([]);
      setNotes([]);
      setTasks([]);
      setSheets([]);
      setDevProjects([]);
      setPlannedBlocks([]);
      setTimeEntries([]);
      setActiveFolderId(undefined);
    }
  };

  // Active Task for Timer Header
  const activeTask = tasks.find(t => t.id === activeTimerTaskId);

  // Format Timer Seconds -> HH:MM:SS
  const formatTimerClock = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Due Soon & Reminders calculations
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const tasksDueToday = tasks.filter(t => t.dueDate === todayDateStr && t.status !== 'completed');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans">
      
      {/* 0. WINDOWS 11 FLUENT TITLEBAR */}
      <WindowsTitlebar
        theme={theme}
        onToggleTheme={cycleTheme}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
        onOpenScreenshot={() => setIsScreenshotOpen(true)}
        activeTimerTaskId={activeTimerTaskId}
      />

      {/* MAIN DESKTOP SHELL CONTAINER */}
      <div className="flex flex-1 w-full overflow-hidden">

      {/* 1. LEFT SIDEBAR (PINNED / UNPINNED COLLAPSIBLE RAIL) */}
      {!isSidebarPinned && !isSidebarHovered ? (
        /* COMPACT ICON RAIL WHEN UNPINNED */
        <aside 
          onMouseEnter={() => setIsSidebarHovered(true)}
          className="w-16 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between items-center py-3 select-none transition-all duration-200 z-30"
        >
          <div className="flex flex-col items-center gap-3.5 w-full">
            {/* Logo Icon */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-500/20">
              SN
            </div>

            <button
              onClick={toggleSidebarPin}
              title="Pin Sidebar (Keep Expanded)"
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
              <Pin className="w-4 h-4" />
            </button>

            <div className="w-8 h-px bg-slate-800/80 my-0.5" />

            {/* Core Module Icons */}
            <button
              onClick={() => { setActiveModule('tasks'); setActiveFolderId(undefined); }}
              title={`Tasks & Projects (${tasks.length})`}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeModule === 'tasks' && !activeFolderId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={() => { setActiveModule('notes'); setActiveFolderId(undefined); }}
              title={`Notes & Docs (${notes.length})`}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeModule === 'notes' && !activeFolderId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400" />
            </button>

            <button
              onClick={() => { setActiveModule('sheets'); setActiveFolderId(undefined); }}
              title={`Financial Worksheets (${sheets.length})`}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeModule === 'sheets' && !activeFolderId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={() => { setActiveModule('devhub'); setActiveFolderId(undefined); }}
              title={`Developer Hub (${devProjects.length})`}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeModule === 'devhub' && !activeFolderId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
            </button>

            <button
              onClick={() => { setActiveModule('focus'); setActiveFolderId(undefined); }}
              title="Focus & Auto-Planner"
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeModule === 'focus' && !activeFolderId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-4 h-4 text-amber-400" />
            </button>

            <div className="w-8 h-px bg-slate-800/80 my-0.5" />

            <button
              onClick={() => setIsFolderManagerOpen(true)}
              title={`Folders (${folders.length})`}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsQuickCaptureOpen(true)}
              title="Quick Capture (Ctrl+Shift+N)"
              className="p-2 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-indigo-400" />
            </button>

            <button
              onClick={() => setIsVoiceOpen(true)}
              title="Voice Dictation Studio (Ctrl+Shift+V)"
              className="p-2 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-purple-400" />
            </button>
          </div>
        </aside>
      ) : (
        /* FULL EXPANDED SIDEBAR (PINNED OR HOVER EXPANDED) */
        <aside 
          onMouseLeave={() => { if (!isSidebarPinned) setIsSidebarHovered(false); }}
          className={`w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none transition-all duration-200 z-30 ${
            !isSidebarPinned ? 'shadow-2xl shadow-slate-950/90 absolute left-0 top-9 bottom-0' : 'relative'
          }`}
        >
          
          {/* Top: Brand & Main Navigation */}
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Logo & Brand Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-sm">
                  SN
                </div>
                <div>
                  <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                    Self-Note
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      OS
                    </span>
                  </h1>
                  <p className="text-[10px] text-slate-400">Offline Productivity Suite</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsFloatingOpen(prev => !prev)}
                  title="Toggle Desktop Floating Hub"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Laptop className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleSidebarPin}
                  title={isSidebarPinned ? "Unpin Sidebar (Collapse)" : "Pin Sidebar (Keep Fixed)"}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isSidebarPinned 
                      ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {isSidebarPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

          {/* Core Modules List */}
          <div className="px-3 py-3 space-y-1">
            <button
              onClick={() => { setActiveModule('inbox'); setActiveFolderId(undefined); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModule === 'inbox' && !activeFolderId
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4 text-indigo-400" />
                <span>Global Inbox</span>
              </div>
              {tasks.filter(t => !t.folderId || t.folderId === '' || t.folderId === 'inbox').length + 
               notes.filter(n => !n.folderId || n.folderId === '' || n.folderId === 'inbox').length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
                  {tasks.filter(t => !t.folderId || t.folderId === '' || t.folderId === 'inbox').length + 
                   notes.filter(n => !n.folderId || n.folderId === '' || n.folderId === 'inbox').length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveModule('tasks'); setActiveFolderId(undefined); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModule === 'tasks' && !activeFolderId
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Tasks & Projects</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-mono">
                {tasks.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveModule('notes'); setActiveFolderId(undefined); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModule === 'notes' && !activeFolderId
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Notes & Docs</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-mono">
                {notes.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveModule('sheets'); setActiveFolderId(undefined); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModule === 'sheets' && !activeFolderId
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span>Sheets & Databases</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-mono">
                {sheets.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveModule('devhub'); setActiveFolderId(undefined); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModule === 'devhub' && !activeFolderId
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span>Dev & Vercel Hub</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-mono">
                {devProjects.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveModule('focus'); setActiveFolderId(undefined); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeModule === 'focus' && !activeFolderId
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Focus & Auto-Planner</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                AI Solver
              </span>
            </button>
          </div>

          {/* FOLDERS SECTION */}
          <div className="flex-1 overflow-y-auto px-3 py-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Folders ({folders.length})
              </span>
              <button
                onClick={() => setIsFolderManagerOpen(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                title="Manage Folders"
              >
                + Manage
              </button>
            </div>

            <div className="space-y-0.5">
              <button
                onClick={() => setActiveFolderId(undefined)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  activeFolderId === undefined ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>All Folders</span>
                </div>
              </button>

              {folders.map(folder => {
                const IconComponent = FOLDER_ICONS[folder.icon] || FolderIcon;
                const isSelected = activeFolderId === folder.id;
                const taskCount = tasks.filter(t => t.folderId === folder.id).length;
                const noteCount = notes.filter(n => n.folderId === folder.id).length;

                return (
                  <button
                    key={folder.id}
                    onClick={() => setActiveFolderId(folder.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer group ${
                      isSelected ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color }}
                      />
                      <IconComponent className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 group-hover:text-white" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {taskCount + noteCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAGS FILTER SECTION WITH GROUPING & COLLAPSIBLE ACCORDIONS */}
          {allTaskTags.length > 0 && (
            <div className="px-3 py-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3 text-cyan-400" />
                  <span>Tags ({allTaskTags.length})</span>
                </span>
                
                <div className="flex items-center gap-1.5">
                  {selectedTags.length > 0 && (
                    <button
                      onClick={handleClearTags}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                    >
                      Clear ({selectedTags.length})
                    </button>
                  )}

                  {/* Tag Quick Mode Shortcut Toggle */}
                  <button
                    onClick={() => setIsTagQuickMode(prev => !prev)}
                    className={`p-1 rounded-md border text-[10px] font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                      isTagQuickMode
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                    title="Press 'T' key on keyboard to toggle Tag Shortcut Mode"
                  >
                    <kbd className="px-1 bg-slate-950 border border-slate-700 rounded text-[9px] font-bold text-cyan-400">T</kbd>
                    <span>Tag Mode</span>
                  </button>

                  {/* Grouping / Tag Cloud Mode Switcher */}
                  <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-md border border-slate-800">
                    <button
                      onClick={() => setTagGroupingMode('frequency')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer ${
                        tagGroupingMode === 'frequency'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Group tags by usage frequency"
                    >
                      Freq
                    </button>
                    <button
                      onClick={() => setTagGroupingMode('category')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer ${
                        tagGroupingMode === 'category'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Group tags by category"
                    >
                      Cat
                    </button>
                    <button
                      onClick={() => setTagGroupingMode('cloud')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer flex items-center gap-0.5 ${
                        tagGroupingMode === 'cloud'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Display tags in a dynamic frequency-weighted Cloud view"
                    >
                      <Cloud className="w-2.5 h-2.5 text-cyan-400" />
                      <span>Cloud</span>
                    </button>
                    <button
                      onClick={() => setTagGroupingMode('stats')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors cursor-pointer flex items-center gap-0.5 ${
                        tagGroupingMode === 'stats'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="View tag usage statistics distribution across notes and tasks"
                    >
                      <BarChart3 className="w-2.5 h-2.5 text-cyan-400" />
                      <span>Stats</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TAG QUICK MODE ACTIVE BANNER */}
              {isTagQuickMode && (
                <div className="px-2.5 py-1.5 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-[10px] text-cyan-200 font-medium flex items-center justify-between animate-in fade-in shadow-sm">
                  <span>⌨️ Press <strong className="text-white font-extrabold font-mono">1-9</strong> or <strong className="text-white font-extrabold font-mono">0</strong> to toggle tag</span>
                  <button 
                    onClick={() => setIsTagQuickMode(false)}
                    className="text-cyan-400 hover:text-white font-bold text-xs"
                  >
                    Esc
                  </button>
                </div>
              )}

              {/* TAG SEARCH INPUT FIELD */}
              <div className="relative flex items-center px-0.5">
                <Search className="w-3 h-3 text-slate-500 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  placeholder="Filter tags by name..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-lg pl-7 pr-6 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors font-medium"
                />
                {tagSearchQuery && (
                  <button
                    onClick={() => setTagSearchQuery('')}
                    className="absolute right-2 text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                    title="Clear tag search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* TAG USAGE STATISTICS HORIZONTAL BAR CHART VIEW */}
              {tagGroupingMode === 'stats' ? (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-3 max-h-64 overflow-y-auto font-sans">
                  {/* Legend & Summary Metrics */}
                  <div className="flex items-center justify-between text-[10px] pb-2 border-b border-slate-800/60 font-medium">
                    <span className="text-slate-400">
                      <strong className="text-white font-mono">{tagStatsData.items.length}</strong> unique tags ({tagStatsData.grandTotalOccurrences} uses)
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[9px]">
                      <span className="flex items-center gap-1 text-cyan-400">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" /> Tasks
                      </span>
                      <span className="flex items-center gap-1 text-purple-400">
                        <span className="w-2 h-2 rounded-full bg-purple-400" /> Notes
                      </span>
                    </div>
                  </div>

                  {filteredTagStats.length === 0 ? (
                    <div className="py-4 text-center text-[11px] text-slate-500 italic">
                      {tagSearchQuery ? `No tags matching "${tagSearchQuery}"` : 'No tag usage data in workspace'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTagStats.map(item => {
                        const isSelected = selectedTags.includes(item.tag);
                        const globalIndex = filteredTaskTags.findIndex(([t]) => t === item.tag);
                        const shortcutDigit = globalIndex >= 0 && globalIndex < 10 ? (globalIndex === 9 ? '0' : String(globalIndex + 1)) : null;

                        const barWidthPercent = Math.max(8, (item.totalCount / tagStatsData.maxTotalCount) * 100);
                        const taskWidthRatio = item.totalCount > 0 ? (item.taskCount / item.totalCount) * 100 : 50;
                        const noteWidthRatio = item.totalCount > 0 ? (item.noteCount / item.totalCount) * 100 : 50;

                        return (
                          <div 
                            key={item.tag}
                            onClick={() => handleToggleTag(item.tag)}
                            className={`group p-2 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                              isSelected
                                ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm'
                                : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                            }`}
                            title={`#${item.tag}: ${item.taskCount} task(s), ${item.noteCount} note(s). Click to filter.`}
                          >
                            {/* Tag Title & Counts Row */}
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5 truncate">
                                {shortcutDigit && (
                                  <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold ${
                                    isTagQuickMode
                                      ? 'bg-cyan-400 text-slate-950 font-extrabold animate-pulse'
                                      : 'bg-slate-950 text-cyan-400/80 border border-slate-800'
                                  }`}>
                                    {shortcutDigit}
                                  </span>
                                )}
                                <span className={`font-semibold truncate ${isSelected ? 'text-cyan-200' : 'text-slate-200 group-hover:text-white'}`}>
                                  #{item.tag}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[9px] font-mono flex-shrink-0">
                                {item.taskCount > 0 && <span className="text-cyan-400">{item.taskCount}t</span>}
                                {item.noteCount > 0 && <span className="text-purple-400">{item.noteCount}n</span>}
                                <span className="font-bold text-slate-200 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                                  {item.totalCount}
                                </span>
                              </div>
                            </div>

                            {/* Stacked Horizontal Bar Chart Container */}
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 flex">
                              <div 
                                className="h-full flex transition-all duration-500 ease-out"
                                style={{ width: `${barWidthPercent}%` }}
                              >
                                {item.taskCount > 0 && (
                                  <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
                                    style={{ width: `${taskWidthRatio}%` }}
                                  />
                                )}
                                {item.noteCount > 0 && (
                                  <div 
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                                    style={{ width: `${noteWidthRatio}%` }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : tagGroupingMode === 'cloud' ? (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-center gap-1.5 max-h-56 overflow-y-auto">
                  {filteredTaskTags.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic p-2">
                      {tagSearchQuery ? `No tags matching "${tagSearchQuery}"` : 'No tags in workspace'}
                    </span>
                  ) : (
                    filteredTaskTags.map(([tag, count]) => {
                      const isSelected = selectedTags.includes(tag);
                      const globalIndex = filteredTaskTags.findIndex(([t]) => t === tag);
                      const shortcutDigit = globalIndex >= 0 && globalIndex < 10 ? (globalIndex === 9 ? '0' : String(globalIndex + 1)) : null;

                      const ratio = maxTagCount > minTagCount ? (count - minTagCount) / (maxTagCount - minTagCount) : 0.5;
                      const fontSizePx = Math.round(10 + ratio * 8); // 10px to 18px

                      return (
                        <button
                          key={tag}
                          onClick={() => handleToggleTag(tag)}
                          style={{
                            fontSize: `${fontSizePx}px`,
                            lineHeight: '1.2',
                          }}
                          className={`px-2 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 leading-none ${
                            isSelected
                              ? 'bg-cyan-500/25 text-cyan-200 border-2 border-cyan-400 font-extrabold shadow-md shadow-cyan-500/20 scale-105'
                              : ratio > 0.6
                                ? 'bg-slate-900/90 text-cyan-300 font-bold border border-cyan-500/40 hover:border-cyan-400 hover:text-white'
                                : ratio > 0.3
                                  ? 'bg-slate-900/70 text-slate-300 font-semibold border border-slate-700/80 hover:border-slate-600 hover:text-white'
                                  : 'bg-slate-950/90 text-slate-400 font-medium border border-slate-800/80 hover:text-slate-200'
                          }`}
                          title={`Tag #${tag} used ${count} time(s). ${shortcutDigit ? `Press '${shortcutDigit}' in Tag Mode` : ''}`}
                        >
                          {shortcutDigit && (
                            <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold ${
                              isTagQuickMode
                                ? 'bg-cyan-400 text-slate-950 font-extrabold animate-pulse'
                                : 'bg-slate-950 text-cyan-400/80 border border-slate-800'
                            }`}>
                              {shortcutDigit}
                            </span>
                          )}
                          <span>#{tag}</span>
                          <span className="text-[9px] opacity-70 font-mono">({count})</span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : groupedTags.length === 0 && tagSearchQuery ? (
                <div className="p-3 text-center text-[11px] text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60 font-sans">
                  No tags matching "<span className="text-cyan-400 font-semibold">{tagSearchQuery}</span>"
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {groupedTags.map(group => {
                  const isCollapsed = !!collapsedTagGroups[group.id];
                  return (
                    <div key={group.id} className="space-y-1 bg-slate-950/50 rounded-xl p-2 border border-slate-800/60">
                      {/* Group Header */}
                      <button
                        onClick={() => toggleTagGroupCollapse(group.id)}
                        className="w-full flex items-center justify-between text-[10px] font-extrabold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none"
                      >
                        <span className="flex items-center gap-1 truncate">
                          {isCollapsed ? <ChevronRight className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />}
                          <span>{group.title}</span>
                        </span>
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-500 border border-slate-800">
                          {group.tags.length}
                        </span>
                      </button>

                      {/* Group Tags List */}
                      {!isCollapsed && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {group.tags.map(([tag, count]) => {
                            const isSelected = selectedTags.includes(tag);
                            const globalIndex = filteredTaskTags.findIndex(([t]) => t === tag);
                            const shortcutDigit = globalIndex >= 0 && globalIndex < 10 ? (globalIndex === 9 ? '0' : String(globalIndex + 1)) : null;

                            const isBeingDragged = draggedTagInfo?.groupId === group.id && draggedTagInfo?.tag === tag;
                            const isDragOver = dragOverTagInfo?.groupId === group.id && dragOverTagInfo?.tag === tag;

                            return (
                              <button
                                key={tag}
                                draggable={true}
                                onDragStart={(e) => handleTagDragStart(e, group.id, tag)}
                                onDragOver={(e) => handleTagDragOver(e, group.id, tag)}
                                onDrop={(e) => handleTagDrop(e, group.id, tag, group.tags)}
                                onDragEnd={handleTagDragEnd}
                                onClick={() => handleToggleTag(tag)}
                                className={`group/tag text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1.5 font-medium transition-all cursor-grab active:cursor-grabbing select-none ${
                                  isBeingDragged
                                    ? 'opacity-40 border-dashed border-cyan-400 scale-95 bg-cyan-950/40'
                                    : isDragOver
                                      ? 'ring-2 ring-cyan-400 bg-cyan-950/80 text-white scale-105 shadow-md shadow-cyan-500/30'
                                      : isSelected
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                                }`}
                                title={`Drag to reorder in ${group.title}. ${shortcutDigit ? `Press '${shortcutDigit}' in Tag Mode` : `Toggle #${tag}`}`}
                              >
                                <GripVertical className="w-2.5 h-2.5 text-slate-600 group-hover/tag:text-cyan-400 transition-colors flex-shrink-0" />
                                {shortcutDigit && (
                                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold transition-all ${
                                    isTagQuickMode
                                      ? 'bg-cyan-400 text-slate-950 shadow-sm font-extrabold animate-pulse'
                                      : 'bg-slate-950 text-cyan-400/80 border border-slate-800'
                                  }`}>
                                    {shortcutDigit}
                                  </span>
                                )}
                                <span>#{tag}</span>
                                <span className="text-[9px] opacity-70 font-mono">({count})</span>
                              </button>
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
          )}

        </div>

        {/* Bottom Actions: Quick Capture, Voice & Backups */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/60">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsQuickCaptureOpen(true)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold cursor-pointer transition-all hover:scale-102"
              title="Natural Language Quick Capture (Ctrl+Shift+N)"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Capture</span>
            </button>

            <button
              onClick={() => setIsVoiceOpen(true)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-semibold cursor-pointer transition-all hover:scale-102"
              title="Instant Voice Studio (Ctrl+Shift+V)"
            >
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              <span>Voice</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <button
              onClick={handleExportBackup}
              className="hover:text-slate-300 flex items-center gap-1 cursor-pointer"
              title="Export all data as JSON"
            >
              <Download className="w-3 h-3" /> Backup
            </button>

            <input
              ref={backupInputRef}
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              className="hidden"
            />
            <button
              onClick={() => backupInputRef.current?.click()}
              className="hover:text-slate-300 flex items-center gap-1 cursor-pointer"
              title="Restore from JSON backup"
            >
              <Upload className="w-3 h-3" /> Restore
            </button>

            <button
              onClick={handleClearAllData}
              className="hover:text-rose-400 text-slate-500 flex items-center gap-1 cursor-pointer transition-colors"
              title="Erase all local data"
            >
              <Trash2 className="w-3 h-3 text-rose-500/80" /> Clear
            </button>
          </div>
        </div>

      </aside>
      )}

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden ${viewDensity === 'spacious' ? 'view-spacious' : 'view-compact'}`}>
        
        {/* Global Header Bar */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between flex-shrink-0">
          
          {/* Left: Sidebar Toggle & Global Search Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebarPin}
              title={isSidebarPinned ? "Unpin & Collapse Sidebar" : "Pin & Expand Sidebar"}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isSidebarPinned ? (
                <PanelLeftClose className="w-4 h-4 text-indigo-400" />
              ) : (
                <PanelLeft className="w-4 h-4 text-slate-300" />
              )}
            </button>

            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 text-xs transition-colors cursor-pointer w-72"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Search or type a command...</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                Ctrl+K
              </kbd>
            </button>

            {activeFolderId && (
              <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                <FolderIcon className="w-3 h-3 text-indigo-400" />
                <span>Filtering by: <strong>{folders.find(f => f.id === activeFolderId)?.name}</strong></span>
                <button 
                  onClick={() => setActiveFolderId(undefined)}
                  className="ml-1 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Right: Live Focus Timer, Quick Hotkeys & Reminder Notifications */}
          <div className="flex items-center gap-3">
            
            {/* Live Focus Timer */}
            {activeTimerTaskId && activeTask ? (
              <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-in fade-in">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="font-mono font-bold">{formatTimerClock(activeTimerSeconds)}</span>
                <span className="text-slate-300 truncate max-w-[140px] font-medium">{activeTask.title}</span>
                <button
                  onClick={() => handleToggleTimer(activeTask)}
                  className="p-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer font-bold"
                  title="Stop Focus Timer"
                >
                  <Square className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Timer Idle</span>
              </div>
            )}

            <div className="h-4 w-px bg-slate-800" />

            {/* Fresh View Density Switcher */}
            <button
              onClick={() => setViewDensity(prev => prev === 'spacious' ? 'compact' : 'spacious')}
              title={viewDensity === 'spacious' ? "Switch to Compact Density View" : "Switch to Large Fresh View"}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewDensity === 'spacious'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{viewDensity === 'spacious' ? '✨ Fresh View' : 'Density: Compact'}</span>
            </button>

            {/* Theme Cycle Button (Soft Dark / Warm Ambient / Crisp Canvas) */}
            <button
              onClick={cycleTheme}
              title={`Theme: ${theme === 'dark' ? 'Soft Charcoal Dark' : theme === 'eye-comfort' ? 'Warm Eye-Comfort (Zero Blue Light)' : 'Crisp Canvas Light'}`}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700/60"
            >
              {theme === 'dark' && (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden md:inline">Soft Dark</span>
                </>
              )}
              {theme === 'eye-comfort' && (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline text-amber-300 font-bold">Warm Amber</span>
                </>
              )}
              {theme === 'light' && (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden md:inline">Crisp Light</span>
                </>
              )}
            </button>

            {/* Screen Capture Studio Button */}
            <button
              onClick={() => setIsScreenshotOpen(true)}
              title="Screen Capture (Full Window or Snipping Area) (Ctrl+Shift+S)"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Quick Capture Hotkey Icon */}
            <button
              onClick={() => setIsQuickCaptureOpen(true)}
              title="Quick Capture (Ctrl+Shift+N)"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 text-indigo-400" />
            </button>

            {/* Voice Dictation Hotkey Icon */}
            <button
              onClick={() => setIsVoiceOpen(true)}
              title="Voice Dictation (Ctrl+Shift+V)"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Mic className="w-4 h-4 text-purple-400" />
            </button>

            {/* Reminders / Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsReminderTrayOpen(prev => !prev)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Notifications & Due Reminders"
              >
                <Bell className="w-4 h-4" />
                {tasksDueToday.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>

              {/* Reminders Popover Tray */}
              {isReminderTrayOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-200">Today's Deadlines & Reminders</span>
                    <button 
                      onClick={() => setIsReminderTrayOpen(false)}
                      className="text-slate-500 hover:text-slate-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {tasksDueToday.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No tasks due today.</p>
                  ) : (
                    <div className="space-y-2">
                      {tasksDueToday.map(t => (
                        <div key={t.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                          <div className="font-semibold text-slate-200">{t.title}</div>
                          <div className="text-[10px] text-amber-400/90 mt-0.5">Due today {t.dueTime ? `@ ${t.dueTime}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Floating Popout Mode */}
            <button
              onClick={() => setIsFloatingOpen(prev => !prev)}
              title="Toggle Floating Desktop Companion Window"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isFloatingOpen ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Float Window</span>
            </button>

          </div>

        </header>

        {/* Breadcrumb Navigation Bar */}
        <BreadcrumbsBar
          activeModule={activeModule}
          onSelectModule={(mod) => {
            setActiveModule(mod);
            setActiveFolderId(undefined);
          }}
          folders={folders}
          activeFolderId={activeFolderId}
          onSelectFolder={setActiveFolderId}
          selectedTags={selectedTags}
          onRemoveTag={handleToggleTag}
          onClearTags={handleClearTags}
          tasks={tasks}
          notes={notes}
          sheets={sheets}
          dailyGoal={dailyGoal}
        />

        {/* Dynamic Module Body */}
        <main className="flex-1 overflow-hidden relative">
          {activeModule === 'inbox' && (
            <GlobalInboxModule
              tasks={tasks}
              notes={notes}
              folders={folders}
              devProjects={devProjects}
              onSaveTask={handleSaveSingleTask}
              onSaveNote={handleSaveSingleNote}
              onCreateTask={(taskData) => {
                const newTask: Task = {
                  id: `task_${Date.now()}`,
                  title: taskData.title || 'New Captured Task',
                  folderId: taskData.folderId,
                  tags: taskData.tags || ['inbox-capture'],
                  priority: taskData.priority || 'medium',
                  status: taskData.status || 'todo',
                  startDate: taskData.startDate || new Date().toISOString().slice(0, 10),
                  dueDate: taskData.dueDate,
                  dueTime: taskData.dueTime,
                  estimatedHours: taskData.estimatedHours || 1,
                  attentionProfile: taskData.attentionProfile || 'shallow',
                  dependencies: taskData.dependencies || [],
                  subtasks: taskData.subtasks || [],
                  reminders: taskData.reminders || [],
                  recurrence: taskData.recurrence,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                handleSaveSingleTask(newTask);
              }}
              onCreateNote={(noteData) => {
                const newNote: Note = {
                  id: `note_${Date.now()}`,
                  title: noteData.title || 'Captured Note',
                  content: noteData.content || '<p>Captured Note</p>',
                  folderId: noteData.folderId,
                  tags: noteData.tags || ['inbox-capture'],
                  isPinned: false,
                  isFavorite: false,
                  wordCount: (noteData.title || '').split(/\s+/).length,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                handleSaveSingleNote(newNote);
              }}
              onDeleteTask={handleDeleteTask}
              onDeleteNote={handleDeleteNote}
              onOpenVoiceCapture={() => setIsVoiceOpen(true)}
              onOpenScreenshot={() => setIsScreenshotOpen(true)}
              onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
            />
          )}

          {activeModule === 'tasks' && (
            <TasksModule
              tasks={tasks}
              folders={folders}
              devProjects={devProjects}
              onSaveTask={handleSaveSingleTask}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              onStartTimer={handleToggleTimer}
              activeTimerTaskId={activeTimerTaskId}
              activeFolderId={activeFolderId}
              selectedTags={selectedTags}
              onToggleTag={handleToggleTag}
              onClearTags={handleClearTags}
              dailyGoal={dailyGoal}
            />
          )}

          {activeModule === 'notes' && (
            <NotesModule
              notes={notes}
              folders={folders}
              onSaveNote={handleSaveSingleNote}
              onCreateNote={handleCreateNote}
              onDeleteNote={handleDeleteNote}
              activeFolderId={activeFolderId}
            />
          )}

          {activeModule === 'sheets' && (
            <SheetsModule
              sheets={sheets}
              folders={folders}
              onSaveSheet={handleSaveSingleSheet}
              onCreateSheet={handleCreateSheet}
              onDeleteSheet={handleDeleteSheet}
              activeFolderId={activeFolderId}
            />
          )}

          {activeModule === 'devhub' && (
            <DevHubModule
              projects={devProjects}
              onSaveProject={handleSaveSingleProject}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onSpawnQuickTask={handleSpawnQuickTask}
            />
          )}

          {activeModule === 'focus' && (
            <FocusModule
              tasks={tasks}
              energyGrid={energyGrid}
              plannedBlocks={plannedBlocks}
              timeEntries={timeEntries}
              onSavePlannedBlocks={(b) => {
                setPlannedBlocks(b);
                saveToStorage(STORAGE_KEYS.PLANNED_BLOCKS, b);
              }}
              onSaveEnergyGrid={(g) => {
                setEnergyGrid(g);
                saveToStorage(STORAGE_KEYS.ENERGY_GRID, g);
              }}
              onStartTimer={handleToggleTimer}
              activeTimerTaskId={activeTimerTaskId}
              dailyGoal={dailyGoal}
              onSaveDailyGoal={handleSaveDailyGoal}
            />
          )}
        </main>

      </div>

      {/* GLOBAL MODALS */}
      
      {/* 1. Voice Capture Studio */}
      <VoiceCaptureStudio
        folders={folders}
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onRouteToNote={(title, content, folderId) => {
          handleSaveSingleNote({
            id: `note_${Date.now()}`,
            title,
            content,
            folderId,
            tags: ['VoiceMemo'],
            isPinned: false,
            isFavorite: false,
            wordCount: content.split(/\s+/).length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setActiveModule('notes');
        }}
        onRouteToTask={(title, folderId, priority) => {
          handleSaveSingleTask({
            id: `task_${Date.now()}`,
            title,
            folderId,
            tags: ['VoiceMemo'],
            priority: (priority as any) || 'medium',
            status: 'todo',
            estimatedHours: 1.0,
            actualHours: 0,
            attentionProfile: 'deep',
            dependencies: [],
            subtasks: [],
            reminders: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setActiveModule('tasks');
        }}
      />

      {/* 2. Natural-Language Quick Capture Modal */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        folders={folders}
        onCreateTask={(taskData) => {
          const newTask: Task = {
            id: `task_${Date.now()}`,
            title: taskData.title || 'Quick Task',
            folderId: taskData.folderId,
            tags: taskData.tags || [],
            priority: taskData.priority || 'medium',
            status: 'todo',
            dueDate: taskData.dueDate,
            dueTime: taskData.dueTime,
            estimatedHours: taskData.estimatedHours || 1.0,
            actualHours: 0,
            attentionProfile: taskData.attentionProfile || 'deep',
            dependencies: [],
            subtasks: [],
            reminders: taskData.reminders || [],
            recurrence: taskData.recurrence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          handleSaveSingleTask(newTask);
          setActiveModule('tasks');
        }}
        onCreateNote={(noteData) => {
          const newNote: Note = {
            id: `note_${Date.now()}`,
            title: noteData.title || 'Quick Note',
            content: noteData.content || `<p>${noteData.title}</p>`,
            folderId: noteData.folderId,
            tags: noteData.tags || [],
            isPinned: false,
            isFavorite: false,
            wordCount: noteData.wordCount || 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          handleSaveSingleNote(newNote);
          setActiveModule('notes');
        }}
      />

      {/* 3. Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        notes={notes}
        tasks={tasks}
        sheets={sheets}
        devProjects={devProjects}
        onSelectNote={(noteId) => {
          setActiveModule('notes');
        }}
        onSelectTask={(taskId) => {
          setActiveModule('tasks');
        }}
        onSelectSheet={(sheetId) => {
          setActiveModule('sheets');
        }}
        onSelectProject={(projectId) => {
          setActiveModule('devhub');
        }}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
        onExportBackup={handleExportBackup}
        onSwitchModule={(mod) => setActiveModule(mod)}
      />

      {/* 4. Custom Folder Manager */}
      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
        folders={folders}
        onSaveFolders={handleSaveFolders}
      />

      {/* 5. Desktop Floating Hub Overlay */}
      <FloatingWindowOverlay
        isOpen={isFloatingOpen}
        onClose={() => setIsFloatingOpen(false)}
        folders={folders}
        devProjects={devProjects}
        onCreateTask={(taskData) => {
          handleSaveSingleTask({
            id: `task_${Date.now()}`,
            title: taskData.title || 'Quick Task',
            folderId: taskData.folderId,
            tags: taskData.tags || [],
            priority: taskData.priority || 'medium',
            status: 'todo',
            dueDate: taskData.dueDate,
            dueTime: taskData.dueTime,
            estimatedHours: taskData.estimatedHours || 1.0,
            actualHours: 0,
            attentionProfile: taskData.attentionProfile || 'deep',
            dependencies: [],
            subtasks: [],
            reminders: [],
            recurrence: taskData.recurrence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }}
        onCreateNote={(noteData) => {
          handleSaveSingleNote({
            id: `note_${Date.now()}`,
            title: noteData.title || 'Quick Note',
            content: noteData.content || `<p>${noteData.title}</p>`,
            folderId: noteData.folderId,
            tags: noteData.tags || [],
            isPinned: false,
            isFavorite: false,
            wordCount: noteData.wordCount || 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }}
        onOpenVoice={() => setIsVoiceOpen(true)}
      />

      {/* 6. Focus Session Report Modal */}
      {sessionReportData && (
        <SessionReportModal
          data={sessionReportData}
          folder={folders.find(f => f.id === sessionReportData.task.folderId)}
          onClose={() => setSessionReportData(null)}
          onCreateRetroNote={handleCreateRetroNote}
          onMarkTaskComplete={handleSaveSingleTask}
          onRestartTimer={handleToggleTimer}
        />
      )}

      </div> {/* END MAIN DESKTOP SHELL CONTAINER */}

      {/* 6. Screen Capture Studio Modal */}
      <ScreenshotTool
        isOpen={isScreenshotOpen}
        onClose={() => setIsScreenshotOpen(false)}
        onSaveAsNote={handleSaveScreenshotAsNote}
      />

    </div>
  );
}

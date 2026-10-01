import { 
  Folder, Note, Task, SheetData, DevProject, 
  PlannedBlock, WeeklyEnergyGrid, TimeEntry, TaskActivity 
} from '../types';

const STORAGE_KEYS = {
  FOLDERS: 'selfnote_folders_v1',
  NOTES: 'selfnote_notes_v1',
  TASKS: 'selfnote_tasks_v1',
  SHEETS: 'selfnote_sheets_v1',
  DEV_PROJECTS: 'selfnote_dev_projects_v1',
  PLANNED_BLOCKS: 'selfnote_planned_blocks_v1',
  ENERGY_GRID: 'selfnote_energy_grid_v1',
  TIME_ENTRIES: 'selfnote_time_entries_v1',
  ACTIVITIES: 'selfnote_activities_v1',
  ACTIVE_TIMER: 'selfnote_active_timer_v1',
  DAILY_FOCUS_GOAL: 'selfnote_daily_focus_goal_v1',
};

export const DEFAULT_FOLDERS: Folder[] = [];

export function getDefaultEnergyGrid(): WeeklyEnergyGrid {
  // 7 days x 24 hours
  const grid: WeeklyEnergyGrid = [];
  for (let d = 0; d < 7; d++) {
    const dayHours: WeeklyEnergyGrid[0] = [];
    for (let h = 0; h < 24; h++) {
      dayHours.push(h >= 22 || h < 7 ? 'off' : 'steady');
    }
    grid.push(dayHours);
  }
  return grid;
}

export const DEFAULT_NOTES: Note[] = [];

export const DEFAULT_TASKS: Task[] = [];

export const DEFAULT_SHEETS: SheetData[] = [];

export const DEFAULT_DEV_PROJECTS: DevProject[] = [];

export const DEFAULT_TIME_ENTRIES: TimeEntry[] = [];

// Helper methods to load and save
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to read storage key: ${key}`, e);
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save storage key: ${key}`, e);
  }
}

// Clear All Local Data
export function clearAllDemoData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Initializer
export function initializeStorage() {
  // Clear any existing cached demo data so app starts completely clean
  const hasBeenCleared = localStorage.getItem('selfnote_cleared_demo_v2');
  if (!hasBeenCleared) {
    clearAllDemoData();
    localStorage.setItem('selfnote_cleared_demo_v2', 'true');
  }

  if (!localStorage.getItem(STORAGE_KEYS.FOLDERS)) {
    saveToStorage(STORAGE_KEYS.FOLDERS, DEFAULT_FOLDERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
    saveToStorage(STORAGE_KEYS.NOTES, DEFAULT_NOTES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
    saveToStorage(STORAGE_KEYS.TASKS, DEFAULT_TASKS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SHEETS)) {
    saveToStorage(STORAGE_KEYS.SHEETS, DEFAULT_SHEETS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DEV_PROJECTS)) {
    saveToStorage(STORAGE_KEYS.DEV_PROJECTS, DEFAULT_DEV_PROJECTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ENERGY_GRID)) {
    saveToStorage(STORAGE_KEYS.ENERGY_GRID, getDefaultEnergyGrid());
  }
  if (!localStorage.getItem(STORAGE_KEYS.TIME_ENTRIES)) {
    saveToStorage(STORAGE_KEYS.TIME_ENTRIES, DEFAULT_TIME_ENTRIES);
  }
}

// Full Export and Import
export function exportFullBackup(): string {
  const backup = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    folders: loadFromStorage(STORAGE_KEYS.FOLDERS, DEFAULT_FOLDERS),
    notes: loadFromStorage(STORAGE_KEYS.NOTES, DEFAULT_NOTES),
    tasks: loadFromStorage(STORAGE_KEYS.TASKS, DEFAULT_TASKS),
    sheets: loadFromStorage(STORAGE_KEYS.SHEETS, DEFAULT_SHEETS),
    devProjects: loadFromStorage(STORAGE_KEYS.DEV_PROJECTS, DEFAULT_DEV_PROJECTS),
    plannedBlocks: loadFromStorage(STORAGE_KEYS.PLANNED_BLOCKS, []),
    energyGrid: loadFromStorage(STORAGE_KEYS.ENERGY_GRID, getDefaultEnergyGrid()),
    timeEntries: loadFromStorage(STORAGE_KEYS.TIME_ENTRIES, DEFAULT_TIME_ENTRIES),
    activities: loadFromStorage(STORAGE_KEYS.ACTIVITIES, []),
  };
  return JSON.stringify(backup, null, 2);
}

export function restoreFullBackup(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.folders) saveToStorage(STORAGE_KEYS.FOLDERS, data.folders);
    if (data.notes) saveToStorage(STORAGE_KEYS.NOTES, data.notes);
    if (data.tasks) saveToStorage(STORAGE_KEYS.TASKS, data.tasks);
    if (data.sheets) saveToStorage(STORAGE_KEYS.SHEETS, data.sheets);
    if (data.devProjects) saveToStorage(STORAGE_KEYS.DEV_PROJECTS, data.devProjects);
    if (data.plannedBlocks) saveToStorage(STORAGE_KEYS.PLANNED_BLOCKS, data.plannedBlocks);
    if (data.energyGrid) saveToStorage(STORAGE_KEYS.ENERGY_GRID, data.energyGrid);
    if (data.timeEntries) saveToStorage(STORAGE_KEYS.TIME_ENTRIES, data.timeEntries);
    if (data.activities) saveToStorage(STORAGE_KEYS.ACTIVITIES, data.activities);
    return true;
  } catch (err) {
    console.error('Failed to restore backup:', err);
    return false;
  }
}

export { STORAGE_KEYS };

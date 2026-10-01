export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'completed' | 'archived';
export type AttentionProfile = 'deep' | 'shallow' | 'admin';
export type EnergyLevel = 'peak' | 'steady' | 'low' | 'off';
export type AppModule = 'inbox' | 'tasks' | 'notes' | 'sheets' | 'devhub' | 'focus';

export interface DailyFocusGoal {
  id: string;
  goalText: string;
  taskId?: string;
  date: string; // YYYY-MM-DD
  isCompleted: boolean;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  scope?: 'all' | 'notes' | 'tasks' | 'sheets';
  parentId?: string | null;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskReminder {
  id: string;
  type: 'morning_of' | '1h_before' | '1d_before' | '3d_before' | '1w_before' | 'custom';
  scheduledTime: string; // ISO
  dismissed: boolean;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  weekdays?: number[]; // 0 = Sun, 1 = Mon ...
  untilDate?: string;
  occurrencesCount?: number;
  currentCount?: number;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  startTime: string; // ISO
  endTime?: string; // ISO
  durationMinutes: number;
  note?: string;
  energyLevel?: EnergyLevel;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  timestamp: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  message: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  folderId?: string;
  tags: string[];
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  estimatedHours: number;
  actualHours?: number; // computed from logged time entries
  attentionProfile: AttentionProfile;
  dependencies: string[]; // task IDs that must complete first (prerequisites)
  dependentTaskIds?: string[]; // task IDs that depend on this task (bidirectional dependents)
  subtasks: Subtask[];
  reminders: TaskReminder[];
  recurrence?: RecurrenceRule;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  linkedDevProjectId?: string;
  order?: number;
}

export interface NoteComment {
  id: string;
  author: string;
  authorAvatar?: string;
  timestamp: string;
  text: string;
  blockId?: string;
  isResolved?: boolean;
}

export interface NoteVersion {
  id: string;
  timestamp: string;
  author: string;
  title: string;
  content: string;
  summary?: string;
}

export type SensitivityLabel = 'General' | 'Confidential' | 'Highly Confidential - DLP Enforced';

export interface Note {
  id: string;
  title: string;
  content: string; // HTML formatted string
  folderId?: string;
  parentNoteId?: string | null; // For Multilevel Page Tree Navigation
  coverImage?: string; // Custom cover graphic
  coverIcon?: string; // Expressive header emoji icon
  sensitivityLabel?: SensitivityLabel; // DLP / Sensitivity classification
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  wordCount: number;
  comments?: NoteComment[];
  versions?: NoteVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface SheetCell {
  raw: string; // raw input e.g. "=SUM(A1:A5)" or "450"
  formatted?: string;
  bold?: boolean;
  format?: 'currency' | 'percent' | 'number' | 'text';
}

export interface SheetData {
  id: string;
  title: string;
  mode: 'spreadsheet' | 'database';
  folderId?: string;
  rows: number;
  cols: number;
  cells: Record<string, SheetCell>; // e.g. "A1": { raw: "100" }
  // For Database mode:
  dbColumns?: {
    id: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'status' | 'checkbox' | 'date';
    options?: string[];
  }[];
  dbRows?: Record<string, any>[];
  updatedAt: string;
}

export interface BuildHistoryItem {
  id: string;
  commitSha: string;
  message: string;
  branch: string;
  state: 'ready' | 'building' | 'error';
  durationSeconds: number;
  timestamp: string;
  url?: string;
}

export interface DevProject {
  id: string;
  name: string;
  repoUrl: string; // e.g. https://github.com/owner/repo
  vercelUrl?: string;
  previewUrl?: string;
  webhookUrl?: string;
  env: 'production' | 'staging' | 'development';
  status: 'operational' | 'building' | 'failing';
  lastDeployedAt?: string;
  builds: BuildHistoryItem[];
}

export interface PlannedBlock {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  startHour: number; // 0..23 (float for 15-min increments, e.g. 9.25)
  durationHours: number;
  energyLevel: EnergyLevel;
  isPinned: boolean;
  reason: string;
}

// 7 days (0..6 Sun..Sat) x 24 hours
export type WeeklyEnergyGrid = EnergyLevel[][];

import { TaskPriority, AttentionProfile, RecurrenceRule, Folder } from '../types';

export interface ParsedQuickCapture {
  isNote: boolean;
  rawInput: string;
  title: string;
  folderId?: string;
  folderName?: string;
  tags: string[];
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  hasReminder: boolean;
  estimatedHours: number;
  attentionProfile: AttentionProfile;
  recurrence?: RecurrenceRule;
}

export function parseNaturalLanguageInput(
  input: string,
  existingFolders: Folder[] = []
): ParsedQuickCapture {
  let text = input.trim();
  let isNote = false;

  if (text.toLowerCase().startsWith('note:')) {
    isNote = true;
    text = text.substring(5).trim();
  }

  const tags: string[] = [];
  let priority: TaskPriority = 'medium';
  let estimatedHours = 1;
  let attentionProfile: AttentionProfile = 'deep';
  let folderId: string | undefined = undefined;
  let folderName: string | undefined = undefined;
  let dueDate: string | undefined = undefined;
  let dueTime: string | undefined = undefined;
  let hasReminder = false;
  let recurrence: RecurrenceRule | undefined = undefined;

  // 1. Match Folder: @"Folder Name" or @FolderName
  const folderQuotedMatch = text.match(/@"([^"]+)"/i);
  if (folderQuotedMatch) {
    const matchedName = folderQuotedMatch[1];
    const found = existingFolders.find(f => f.name.toLowerCase() === matchedName.toLowerCase());
    folderName = matchedName;
    folderId = found ? found.id : undefined;
    text = text.replace(folderQuotedMatch[0], ' ').trim();
  } else {
    const folderMatch = text.match(/@(\w+)/i);
    if (folderMatch) {
      const matchedName = folderMatch[1];
      const found = existingFolders.find(f => 
        f.name.toLowerCase().includes(matchedName.toLowerCase()) ||
        matchedName.toLowerCase().includes(f.name.toLowerCase())
      );
      folderName = found ? found.name : matchedName;
      folderId = found ? found.id : undefined;
      text = text.replace(folderMatch[0], ' ').trim();
    }
  }

  // 2. Match Tags: #tag
  const tagMatches = text.matchAll(/#([a-zA-Z0-9_\-]+)/g);
  for (const match of tagMatches) {
    tags.push(match[1]);
  }
  text = text.replace(/#[a-zA-Z0-9_\-]+/g, ' ').trim();

  // 3. Match Priority: !urgent, !high, !med, !medium, !low, or !!!!, !!!, !!, !, or !1, !2, !3, !4
  const priorityMatch = text.match(/!(urgent|high|medium|med|low|1|2|3|4|!{1,4})/i);
  if (priorityMatch) {
    const pStr = priorityMatch[1].toLowerCase();
    if (pStr === 'urgent' || pStr === '1' || pStr === '!!!!') priority = 'urgent';
    else if (pStr === 'high' || pStr === '2' || pStr === '!!!') priority = 'high';
    else if (pStr === 'medium' || pStr === 'med' || pStr === '3' || pStr === '!!') priority = 'medium';
    else if (pStr === 'low' || pStr === '4' || pStr === '!') priority = 'low';
    text = text.replace(priorityMatch[0], ' ').trim();
  }

  // 4. Match Attention Profile: *deep, *shallow, *admin
  const energyMatch = text.match(/\*(deep|shallow|admin)/i);
  if (energyMatch) {
    attentionProfile = energyMatch[1].toLowerCase() as AttentionProfile;
    text = text.replace(energyMatch[0], ' ').trim();
  }

  // 5. Match Estimate: ~2h, ~90m, ~1.5h, ~45min, or "for 45 minutes", "for 2 hours"
  const estimateTildeMatch = text.match(/~(\d+(\.\d+)?)(h|m|hr|min|hours|minutes)?/i);
  if (estimateTildeMatch) {
    const val = parseFloat(estimateTildeMatch[1]);
    const unit = (estimateTildeMatch[3] || 'h').toLowerCase();
    if (unit.startsWith('m')) {
      estimatedHours = Math.round((val / 60) * 10) / 10;
    } else {
      estimatedHours = val;
    }
    text = text.replace(estimateTildeMatch[0], ' ').trim();
  } else {
    const estimateForMatch = text.match(/for\s+(\d+(\.\d+)?)\s*(hours|hour|h|minutes|mins|m)/i);
    if (estimateForMatch) {
      const val = parseFloat(estimateForMatch[1]);
      const unit = estimateForMatch[3].toLowerCase();
      if (unit.startsWith('m')) {
        estimatedHours = Math.round((val / 60) * 10) / 10;
      } else {
        estimatedHours = val;
      }
      text = text.replace(estimateForMatch[0], ' ').trim();
    }
  }

  // 6. Match Recurrence: "every monday", "every day", "every 2 weeks", "daily", "weekly", "monthly"
  const recurrenceMatch = text.match(/\b(every\s+(day|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|\d+\s+(days|weeks|months))|daily|weekly|monthly)\b/i);
  if (recurrenceMatch) {
    const rStr = recurrenceMatch[0].toLowerCase();
    if (rStr.includes('daily') || rStr === 'every day') {
      recurrence = { frequency: 'daily', interval: 1 };
    } else if (rStr.includes('monthly') || rStr === 'every month') {
      recurrence = { frequency: 'monthly', interval: 1 };
    } else if (rStr.includes('monday')) {
      recurrence = { frequency: 'weekly', interval: 1, weekdays: [1] };
    } else if (rStr.includes('tuesday')) {
      recurrence = { frequency: 'weekly', interval: 1, weekdays: [2] };
    } else if (rStr.includes('wednesday')) {
      recurrence = { frequency: 'weekly', interval: 1, weekdays: [3] };
    } else if (rStr.includes('thursday')) {
      recurrence = { frequency: 'weekly', interval: 1, weekdays: [4] };
    } else if (rStr.includes('friday')) {
      recurrence = { frequency: 'weekly', interval: 1, weekdays: [5] };
    } else if (rStr.includes('saturday')) {
      recurrence = { frequency: 'weekly', interval: 1, weekdays: [6] };
    } else if (rStr.includes('sunday')) {
      recurrence = { frequency: 'weekly', interval: 1, weekdays: [0] };
    } else {
      recurrence = { frequency: 'weekly', interval: 1 };
    }
    text = text.replace(recurrenceMatch[0], ' ').trim();
  }

  // 7. Match Time: 3pm, 3:30pm, 15:00, at 9:30, noon, tonight (8pm)
  const timeMatch = text.match(/\b((at\s+)?(\d{1,2}(:\d{2})?\s*(am|pm))|(\d{1,2}:\d{2})|noon|tonight|evening)\b/i);
  if (timeMatch) {
    const rawTime = timeMatch[0].toLowerCase().replace(/^at\s+/, '').trim();
    hasReminder = true;
    if (rawTime === 'noon') {
      dueTime = '12:00';
    } else if (rawTime === 'tonight' || rawTime === 'evening') {
      dueTime = '19:00';
      if (!dueDate) {
        dueDate = new Date().toISOString().slice(0, 10);
      }
    } else if (rawTime.includes('am') || rawTime.includes('pm')) {
      const isPm = rawTime.includes('pm');
      const timePart = rawTime.replace(/am|pm/g, '').trim();
      const [hStr, mStr] = timePart.split(':');
      let hour = parseInt(hStr, 10);
      const min = mStr ? parseInt(mStr, 10) : 0;
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      dueTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    } else if (rawTime.includes(':')) {
      dueTime = rawTime;
    }
    text = text.replace(timeMatch[0], ' ').trim();
  }

  // 8. Match Date: today, tomorrow, next week, in X days/weeks, weekday names (friday, next monday)
  const now = new Date();
  const dateMatch = text.match(/\b(today|tomorrow|next\s+week|in\s+\d+\s+(days?|weeks?|months?)|(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i);
  if (dateMatch) {
    const dStr = dateMatch[0].toLowerCase();
    const target = new Date(now);

    if (dStr === 'today') {
      dueDate = target.toISOString().slice(0, 10);
    } else if (dStr === 'tomorrow') {
      target.setDate(target.getDate() + 1);
      dueDate = target.toISOString().slice(0, 10);
    } else if (dStr === 'next week') {
      target.setDate(target.getDate() + 7);
      dueDate = target.toISOString().slice(0, 10);
    } else if (dStr.startsWith('in ')) {
      const parts = dStr.split(/\s+/);
      const amount = parseInt(parts[1], 10);
      const unit = parts[2];
      if (unit.startsWith('day')) target.setDate(target.getDate() + amount);
      else if (unit.startsWith('week')) target.setDate(target.getDate() + amount * 7);
      else if (unit.startsWith('month')) target.setMonth(target.getMonth() + amount);
      dueDate = target.toISOString().slice(0, 10);
    } else {
      // weekday
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.findIndex(d => dStr.includes(d));
      if (targetDay !== -1) {
        let diff = (targetDay - now.getDay() + 7) % 7;
        if (diff === 0 || dStr.includes('next')) diff += 7;
        target.setDate(now.getDate() + diff);
        dueDate = target.toISOString().slice(0, 10);
      }
    }
    text = text.replace(dateMatch[0], ' ').trim();
  }

  // Clean remaining title
  const cleanedTitle = text
    .replace(/\s+/g, ' ')
    .replace(/^[-:,]\s*/, '')
    .trim();

  return {
    isNote,
    rawInput: input,
    title: cleanedTitle || (isNote ? 'Quick Note' : 'Quick Task'),
    folderId,
    folderName,
    tags,
    priority,
    dueDate,
    dueTime,
    hasReminder,
    estimatedHours,
    attentionProfile,
    recurrence
  };
}

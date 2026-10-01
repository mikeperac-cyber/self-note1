import { Task, PlannedBlock, WeeklyEnergyGrid, EnergyLevel } from '../types';

export interface PlanResult {
  blocks: PlannedBlock[];
  atRiskTaskIds: string[];
  unscheduledTaskIds: string[];
  totalPlannedHours: number;
}

export function runAutoPlanner(
  tasks: Task[],
  energyGrid: WeeklyEnergyGrid,
  existingBlocks: PlannedBlock[] = [],
  startDateStr?: string
): PlanResult {
  // Only plan tasks that are not yet completed
  const activeTasks = tasks.filter(t => t.status !== 'completed');

  // Priority scoring: urgent = 4, high = 3, medium = 2, low = 1
  const priorityWeight: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Sort tasks by:
  // 1. Dependencies (predecessors first)
  // 2. Earliest Due Date
  // 3. Highest Priority
  const sortedTasks = [...activeTasks].sort((a, b) => {
    // If b depends on a, a comes first
    if (b.dependencies.includes(a.id)) return -1;
    if (a.dependencies.includes(b.id)) return 1;

    // Due date
    if (a.dueDate && b.dueDate) {
      if (a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
    } else if (a.dueDate) {
      return -1;
    } else if (b.dueDate) {
      return 1;
    }

    // Priority
    const pA = priorityWeight[a.priority] || 1;
    const pB = priorityWeight[b.priority] || 1;
    return pB - pA;
  });

  const baseDate = startDateStr ? new Date(startDateStr) : new Date();
  // Start from today or next morning if late
  if (baseDate.getHours() >= 20) {
    baseDate.setDate(baseDate.getDate() + 1);
    baseDate.setHours(8, 0, 0, 0);
  }

  // Preserve pinned blocks
  const newBlocks: PlannedBlock[] = [...existingBlocks.filter(b => b.isPinned)];
  const atRiskTaskIds: string[] = [];
  const unscheduledTaskIds: string[] = [];
  let totalPlannedHours = 0;

  // Track task completion times in schedule to enforce dependencies
  const taskCompletionMap = new Map<string, { date: string; hour: number }>();

  // Pre-fill completion map with already completed tasks
  tasks.filter(t => t.status === 'completed').forEach(t => {
    taskCompletionMap.set(t.id, { date: '1970-01-01', hour: 0 });
  });

  // Pre-fill from pinned blocks
  newBlocks.forEach(b => {
    const endH = b.startHour + b.durationHours;
    const prev = taskCompletionMap.get(b.taskId);
    if (!prev || b.date > prev.date || (b.date === prev.date && endH > prev.hour)) {
      taskCompletionMap.set(b.taskId, { date: b.date, hour: endH });
    }
  });

  // Schedule over next 7 days
  const DAYS_TO_PLAN = 7;

  for (const task of sortedTasks) {
    // If task is already completely scheduled in pinned blocks, skip
    const alreadyPinned = newBlocks.filter(b => b.taskId === task.id);
    const pinnedHours = alreadyPinned.reduce((sum, b) => sum + b.durationHours, 0);
    const remainingHours = Math.max(0.5, (task.estimatedHours || 1) - pinnedHours);

    if (remainingHours <= 0) continue;

    // Check dependency constraints: what is the earliest date/hour this task can start?
    let earliestDate = baseDate.toISOString().slice(0, 10);
    let earliestHour = Math.max(8, baseDate.getHours());

    if (task.startDate && task.startDate > earliestDate) {
      earliestDate = task.startDate;
      earliestHour = 8;
    }

    // Check all dependencies
    let canSchedule = true;
    for (const depId of task.dependencies) {
      const depFinish = taskCompletionMap.get(depId);
      if (!depFinish) {
        // Dependency not completed and not scheduled yet
        canSchedule = false;
        break;
      }
      if (depFinish.date > earliestDate) {
        earliestDate = depFinish.date;
        earliestHour = depFinish.hour + 0.25; // 15 min cool-down
      } else if (depFinish.date === earliestDate && depFinish.hour + 0.25 > earliestHour) {
        earliestHour = depFinish.hour + 0.25;
      }
    }

    if (!canSchedule) {
      unscheduledTaskIds.push(task.id);
      continue;
    }

    // Preferred energy levels based on Attention Profile
    let preferredEnergies: EnergyLevel[] = [];
    if (task.attentionProfile === 'deep') {
      preferredEnergies = ['peak', 'steady'];
    } else if (task.attentionProfile === 'shallow') {
      preferredEnergies = ['steady', 'peak', 'low'];
    } else {
      // admin
      preferredEnergies = ['low', 'steady'];
    }

    let allocatedHours = 0;
    let taskLatestFinishDate = earliestDate;
    let taskLatestFinishHour = earliestHour;

    // Iterate through days
    for (let dayOffset = 0; dayOffset < DAYS_TO_PLAN && allocatedHours < remainingHours; dayOffset++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + dayOffset);
      const dateStr = currentDate.toISOString().slice(0, 10);

      if (dateStr < earliestDate) continue;

      const dayOfWeek = currentDate.getDay(); // 0..6
      const hoursMap = energyGrid[dayOfWeek] || [];

      // Check hours from earliestHour (on first valid day) or 8am
      const startScanHour = (dateStr === earliestDate) ? earliestHour : 8;

      for (let h = startScanHour; h < 20 && allocatedHours < remainingHours; h += 0.5) {
        const hourIdx = Math.floor(h);
        const energyAtSlot = hoursMap[hourIdx] || 'off';

        if (energyAtSlot === 'off') continue;

        // Check if preferred or secondary
        const isPreferred = preferredEnergies.includes(energyAtSlot);
        if (!isPreferred && dayOffset < 3) {
          // In the first 3 days, try strictly for preferred
          continue;
        }

        // Check collision with existing blocks
        const collision = newBlocks.some(b => {
          if (b.date !== dateStr) return false;
          const blockEnd = b.startHour + b.durationHours;
          return h < blockEnd && (h + 0.5) > b.startHour;
        });

        if (!collision) {
          // Calculate block size: try to group up to 2 hours or remaining needed
          const needed = remainingHours - allocatedHours;
          const blockSize = Math.min(2.0, Math.max(0.5, needed));

          // Ensure blockSize fits without collision
          let actualFit = 0;
          for (let step = 0; step < blockSize; step += 0.5) {
            const checkH = h + step;
            const slotCollision = newBlocks.some(b => {
              if (b.date !== dateStr) return false;
              const blockEnd = b.startHour + b.durationHours;
              return checkH < blockEnd && (checkH + 0.5) > b.startHour;
            });
            const slotEnergy = hoursMap[Math.floor(checkH)] || 'off';
            if (slotCollision || slotEnergy === 'off') break;
            actualFit += 0.5;
          }

          if (actualFit >= 0.5) {
            const blockId = `pb_${task.id}_${dateStr}_${Math.round(h * 10)}`;
            const reason = `Scheduled in ${energyAtSlot.toUpperCase()} energy slot for ${task.attentionProfile.toUpperCase()} work (Priority: ${task.priority})`;

            newBlocks.push({
              id: blockId,
              taskId: task.id,
              date: dateStr,
              startHour: h,
              durationHours: actualFit,
              energyLevel: energyAtSlot,
              isPinned: false,
              reason
            });

            allocatedHours += actualFit;
            totalPlannedHours += actualFit;
            taskLatestFinishDate = dateStr;
            taskLatestFinishHour = h + actualFit;
            h += actualFit - 0.5; // advance loop
          }
        }
      }
    }

    if (allocatedHours > 0) {
      taskCompletionMap.set(task.id, {
        date: taskLatestFinishDate,
        hour: taskLatestFinishHour
      });

      // Check if At Risk: if finished after dueDate
      if (task.dueDate && taskLatestFinishDate > task.dueDate) {
        atRiskTaskIds.push(task.id);
      }
    } else {
      unscheduledTaskIds.push(task.id);
      if (task.dueDate) {
        atRiskTaskIds.push(task.id);
      }
    }
  }

  return {
    blocks: newBlocks,
    atRiskTaskIds,
    unscheduledTaskIds,
    totalPlannedHours: Math.round(totalPlannedHours * 10) / 10
  };
}

import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, GripVertical, Sparkles, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Button } from '../common';
import { useTasks, addTimeBlock, useTimeBlocks } from '../../hooks/useDatabase';
import type { Task } from '../../db/database';
import type { EnergyPattern } from '../../utils/energyAnalysis';

interface DraggableTaskProps {
  task: Task;
}

function DraggableTask({ task }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task, type: 'task' },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  const resistanceColor = task.resistance >= 7
    ? 'text-red-400 bg-red-900/30'
    : task.resistance >= 4
    ? 'text-amber-400 bg-amber-900/30'
    : 'text-emerald-400 bg-emerald-900/30';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-slate-800/50 border border-slate-700 rounded-lg group hover:border-slate-600 transition-colors ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-slate-700 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4 text-slate-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-white truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {task.estimatedMinutes && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {task.estimatedMinutes}m
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${resistanceColor}`}>
              R{task.resistance}
            </span>
            {task.deadline && (
              <span className="text-xs text-slate-500">
                Due: {new Date(task.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskSidebarProps {
  date: string;
  energyPatterns?: EnergyPattern | null;
}

export function TaskSidebar({ date, energyPatterns }: TaskSidebarProps) {
  const tasks = useTasks('pending');
  const timeBlocks = useTimeBlocks(date);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);

  // Filter tasks that aren't already scheduled for today
  const unscheduledTasks = useMemo(() => {
    if (!tasks || !timeBlocks) return [];

    const scheduledTaskIds = new Set(
      timeBlocks
        .filter(b => b.taskId)
        .map(b => b.taskId)
    );

    return tasks.filter(task => !scheduledTaskIds.has(task.id));
  }, [tasks, timeBlocks]);

  // Get high-resistance tasks that need peak energy
  const highResistanceTasks = useMemo(() => {
    return unscheduledTasks.filter(t => t.resistance >= 7);
  }, [unscheduledTasks]);

  // Simple auto-schedule without AI (for when API key is not available)
  const handleSimpleAutoSchedule = async () => {
    if (!unscheduledTasks.length || !energyPatterns) return;

    setIsAutoScheduling(true);
    setSchedulingError(null);

    try {
      // Get existing blocks for the day
      const existingBlocks = timeBlocks || [];

      // Find available time slots
      const occupiedSlots = existingBlocks.map(b => ({
        start: parseInt(b.startTime.split(':')[0]) * 60 + parseInt(b.startTime.split(':')[1]),
        end: parseInt(b.endTime.split(':')[0]) * 60 + parseInt(b.endTime.split(':')[1]),
      }));

      // Sort tasks by resistance (high resistance first to get peak energy)
      const sortedTasks = [...unscheduledTasks].sort((a, b) => b.resistance - a.resistance);

      let currentMinute = 9 * 60; // Start at 9 AM

      for (const task of sortedTasks.slice(0, 5)) { // Schedule up to 5 tasks
        const duration = task.estimatedMinutes || 30;

        // Find best slot based on energy
        let bestHour = Math.floor(currentMinute / 60);

        if (task.resistance >= 7 && energyPatterns.peakHours.length > 0) {
          // High resistance - try to use peak hours
          const availablePeakHour = energyPatterns.peakHours.find(h => {
            const startMin = h * 60;
            const endMin = startMin + duration;
            return !occupiedSlots.some(slot =>
              (startMin < slot.end && endMin > slot.start)
            );
          });
          if (availablePeakHour) bestHour = availablePeakHour;
        }

        // Check if slot is available
        let slotStart = bestHour * 60;
        const slotEnd = slotStart + duration;

        // Skip if overlaps with existing blocks
        const hasConflict = occupiedSlots.some(slot =>
          (slotStart < slot.end && slotEnd > slot.start)
        );

        if (hasConflict) {
          // Find next available slot
          slotStart = currentMinute;
          while (occupiedSlots.some(slot =>
            (slotStart < slot.end && (slotStart + duration) > slot.start)
          )) {
            slotStart += 30;
            if (slotStart >= 20 * 60) break; // Don't go past 8 PM
          }
        }

        if (slotStart >= 20 * 60) continue; // Skip if no slot available

        const startHour = Math.floor(slotStart / 60);
        const startMin = slotStart % 60;
        const endMinutes = slotStart + duration;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;

        // Create time block
        await addTimeBlock({
          title: task.title,
          description: task.description,
          startTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
          endTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
          date,
          color: task.resistance >= 7 ? '#f43f5e' : task.resistance >= 4 ? '#f97316' : '#22c55e',
          completed: false,
          taskId: task.id,
          category: 'work',
        });

        // Mark slot as occupied
        occupiedSlots.push({ start: slotStart, end: endMinutes });
        currentMinute = endMinutes + 15; // 15 min buffer
      }
    } catch (error) {
      console.error('Auto-schedule failed:', error);
      setSchedulingError('Failed to auto-schedule tasks');
    } finally {
      setIsAutoScheduling(false);
    }
  };

  return (
    <Card className="h-fit">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 -m-2 mb-2"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white">Unscheduled Tasks</h3>
          <span className="px-2 py-0.5 bg-slate-800 rounded-full text-xs text-slate-400">
            {unscheduledTasks.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* High resistance warning */}
          {highResistanceTasks.length > 0 && energyPatterns && (
            <div className="mb-3 p-2 bg-amber-900/20 border border-amber-800/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="text-amber-200 font-medium">
                    {highResistanceTasks.length} high-resistance task{highResistanceTasks.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    Best scheduled during peak energy hours
                    {energyPatterns.peakHours.length > 0 && (
                      <span className="text-green-400">
                        {' '}({energyPatterns.peakHours.map(h => `${h}:00`).join(', ')})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auto-schedule button */}
          {unscheduledTasks.length > 0 && (
            <Button
              size="sm"
              onClick={handleSimpleAutoSchedule}
              disabled={isAutoScheduling || !energyPatterns}
              className="w-full mb-3"
            >
              {isAutoScheduling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Auto-Schedule Tasks
                </>
              )}
            </Button>
          )}

          {schedulingError && (
            <p className="text-xs text-red-400 mb-3">{schedulingError}</p>
          )}

          {/* Task list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {unscheduledTasks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                All tasks scheduled or none pending
              </p>
            ) : (
              unscheduledTasks.map(task => (
                <DraggableTask key={task.id} task={task} />
              ))
            )}
          </div>

          {/* Drag hint */}
          {unscheduledTasks.length > 0 && (
            <p className="text-xs text-slate-500 text-center mt-3">
              Drag tasks onto the timeline to schedule
            </p>
          )}
        </>
      )}
    </Card>
  );
}

import { useState, useMemo } from 'react';
import { DndContext, pointerWithin, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { format } from 'date-fns';
import { Clock, GripVertical } from 'lucide-react';
import { PomodoroTimer } from '../components/time/PomodoroTimer';
import { VisualTimeline } from '../components/time/VisualTimeline';
import { TaskSidebar } from '../components/time/TaskSidebar';
import { useEnergyPatternLogs, addTimeBlock } from '../hooks/useDatabase';
import { analyzeEnergyPatterns } from '../utils/energyAnalysis';
import type { Task } from '../db/database';

export function TimePage() {
  const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const energyLogs = useEnergyPatternLogs(14);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Analyze energy patterns
  const energyPatterns = useMemo(() => {
    if (!energyLogs || energyLogs.length === 0) return null;
    return analyzeEnergyPatterns(energyLogs, 14);
  }, [energyLogs]);

  // Handle task drop on timeline
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;

    if (!over || !active.data.current) return;

    const dragData = active.data.current;

    // Check if dragging a task (not a time block)
    if (dragData.type !== 'task' || !dragData.task) return;

    const task = dragData.task as Task;
    const dropData = over.data.current as { hour: number; minute: number } | undefined;

    if (!dropData) return;

    // Calculate times
    const duration = task.estimatedMinutes || 30;
    const snappedMinute = Math.round(dropData.minute / 15) * 15;
    const startMinutes = dropData.hour * 60 + snappedMinute;
    const endMinutes = startMinutes + duration;

    const startHour = Math.floor(startMinutes / 60);
    const startMin = startMinutes % 60;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;

    // Ensure within bounds
    if (startHour < 6 || endHour > 22) return;

    // Create time block linked to task
    await addTimeBlock({
      title: task.title,
      description: task.description,
      startTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
      endTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
      date: selectedDate,
      color: task.resistance >= 7 ? '#f43f5e' : task.resistance >= 4 ? '#f97316' : '#22c55e',
      completed: false,
      taskId: task.id,
      category: 'work',
    });
  };

  const handleDragStart = (event: { active: { data: { current: { task?: Task; type?: string } | undefined } } }) => {
    if (event.active.data.current?.type === 'task') {
      setActiveTask(event.active.data.current.task || null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-400" />
          Time Management
        </h1>
        <p className="text-slate-400 mt-1">Visual timeline with drag-and-drop scheduling</p>
      </div>

      {/* Pomodoro Timer */}
      <div className="max-w-md">
        <PomodoroTimer />
      </div>

      {/* Timeline with Task Sidebar */}
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
      >
        <div className="grid lg:grid-cols-[1fr,300px] gap-6">
          <VisualTimeline />
          <TaskSidebar
            date={selectedDate}
            energyPatterns={energyPatterns}
          />
        </div>

        {/* Drag overlay for tasks */}
        <DragOverlay>
          {activeTask && (
            <div className="p-3 bg-slate-800 border border-slate-600 rounded-lg shadow-xl w-64">
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-white">{activeTask.title}</p>
                  <p className="text-xs text-slate-400">
                    {activeTask.estimatedMinutes || 30} min
                  </p>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

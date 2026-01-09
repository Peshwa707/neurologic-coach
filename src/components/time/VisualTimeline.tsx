import { useState, useMemo, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, pointerWithin } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, Check, Zap, ZapOff, GripVertical, Clock } from 'lucide-react';
import { Card, CardHeader, Button, Input, Modal } from '../common';
import { useTimeBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock, useEnergyPatternLogs } from '../../hooks/useDatabase';
import { format } from 'date-fns';
import { analyzeEnergyPatterns, getEnergyBgColor, suggestOptimalTimes, type TimeRecommendation, type EnergyPattern } from '../../utils/energyAnalysis';
import type { TimeBlock } from '../../db/database';

const COLORS = [
  '#6366f1', // indigo - work
  '#3b82f6', // blue - meeting
  '#22c55e', // green - self-care
  '#f97316', // orange - exercise
  '#eab308', // yellow - meal
  '#8b5cf6', // purple - personal
  '#06b6d4', // cyan - break
  '#ec4899', // pink
  '#f43f5e', // rose
  '#14b8a6', // teal
];

const CATEGORIES = [
  { value: 'work', label: 'Work', color: '#6366f1' },
  { value: 'meeting', label: 'Meeting', color: '#3b82f6' },
  { value: 'self-care', label: 'Self-care', color: '#22c55e' },
  { value: 'exercise', label: 'Exercise', color: '#f97316' },
  { value: 'meal', label: 'Meal', color: '#eab308' },
  { value: 'personal', label: 'Personal', color: '#8b5cf6' },
  { value: 'break', label: 'Break', color: '#06b6d4' },
] as const;

// Draggable time block component
function DraggableBlock({
  block,
  position,
  onToggleComplete,
  onDelete
}: {
  block: TimeBlock;
  position: { top: string; height: string };
  onToggleComplete: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${block.id}`,
    data: { block },
  });

  const style = {
    ...position,
    backgroundColor: block.color + '20',
    borderLeft: `3px solid ${block.color}`,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : block.completed ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 rounded-lg p-2 transition-opacity group ${
        isDragging ? 'shadow-lg' : ''
      }`}
      style={style}
    >
      <div className="flex items-start gap-1">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-0.5 rounded hover:bg-slate-700/50 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-3 h-3 text-slate-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${block.completed ? 'line-through text-slate-500' : 'text-white'}`}>
            {block.title}
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {block.startTime} - {block.endTime}
          </p>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(block.id!, block.completed);
            }}
            className={`p-1 rounded hover:bg-slate-700 ${block.completed ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id!);
            }}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Droppable time slot component
function DroppableSlot({
  hour,
  minute,
  energyLevel,
  isPeak,
  isLow,
  showEnergyOverlay,
  isOver,
}: {
  hour: number;
  minute: number;
  energyLevel?: number;
  isPeak?: boolean;
  isLow?: boolean;
  showEnergyOverlay: boolean;
  isOver: boolean;
}) {
  const slotId = `slot-${hour}-${minute}`;
  const { setNodeRef } = useDroppable({
    id: slotId,
    data: { hour, minute },
  });

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-16 right-2 transition-colors ${
        isOver ? 'bg-indigo-500/20 border-2 border-indigo-400/50 border-dashed rounded' : ''
      }`}
      style={{
        top: `${((hour - 6) * 60 + minute) / (16 * 60) * 100}%`,
        height: `${15 / (16 * 60) * 100}%`,
        backgroundColor: !isOver && showEnergyOverlay && energyLevel
          ? getEnergyBgColor(energyLevel, 0.1)
          : undefined,
      }}
    >
      {showEnergyOverlay && minute === 0 && (isPeak || isLow) && (
        <span className={`absolute right-1 top-0 text-[9px] font-medium px-1 py-0.5 rounded ${
          isPeak
            ? 'bg-green-500/20 text-green-400'
            : 'bg-orange-500/20 text-orange-400'
        }`}>
          {isPeak ? 'Peak' : 'Low'}
        </span>
      )}
    </div>
  );
}

export function VisualTimeline() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const timeBlocks = useTimeBlocks(selectedDate);
  const energyLogs = useEnergyPatternLogs(14);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showEnergyOverlay, setShowEnergyOverlay] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ hour: number; minute: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [editingBlock, setEditingBlock] = useState<{
    title: string;
    startTime: string;
    endTime: string;
    color: string;
    category?: TimeBlock['category'];
  }>({
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    color: COLORS[0],
    category: 'work',
  });

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

  // Analyze energy patterns
  const energyPatterns = useMemo((): EnergyPattern | null => {
    if (!energyLogs || energyLogs.length === 0) return null;
    return analyzeEnergyPatterns(energyLogs, 14);
  }, [energyLogs]);

  // Get suggestions for time slots
  const timeSuggestions = useMemo((): TimeRecommendation[] => {
    if (!energyPatterns) return [];
    const existingBlocks = timeBlocks?.map(b => ({ startTime: b.startTime, endTime: b.endTime })) || [];
    return suggestOptimalTimes(5, energyPatterns, existingBlocks);
  }, [energyPatterns, timeBlocks]);

  const handleAddBlock = async () => {
    if (!editingBlock.title.trim()) return;

    await addTimeBlock({
      ...editingBlock,
      date: selectedDate,
      description: '',
      completed: false,
    });

    setIsModalOpen(false);
    setEditingBlock({
      title: '',
      startTime: '09:00',
      endTime: '10:00',
      color: COLORS[0],
      category: 'work',
    });
  };

  const handleToggleComplete = async (id: number, completed: boolean) => {
    await updateTimeBlock(id, { completed: !completed });
  };

  const handleDeleteBlock = async (id: number) => {
    await deleteTimeBlock(id);
  };

  const getBlockPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startPercent = ((startHour - 6) * 60 + startMin) / (16 * 60) * 100;
    const endPercent = ((endHour - 6) * 60 + endMin) / (16 * 60) * 100;

    return {
      top: `${startPercent}%`,
      height: `${Math.max(endPercent - startPercent, 1.5)}%`,
    };
  };

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const now = currentTime;
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (hour < 6 || hour >= 22) return null;

    const percent = ((hour - 6) * 60 + minute) / (16 * 60) * 100;
    return `${percent}%`;
  }, [currentTime]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    const data = event.over?.data?.current as { hour: number; minute: number } | undefined;
    if (data) {
      setDragOverSlot(data);
    } else {
      setDragOverSlot(null);
    }
  };

  // Handle drag end - update block time
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setDragOverSlot(null);

    const { active, over } = event;

    if (!over || !active.data.current?.block) return;

    const block = active.data.current.block as TimeBlock;
    const dropData = over.data.current as { hour: number; minute: number } | undefined;

    if (!dropData) return;

    // Calculate new times
    const [, startMin] = block.startTime.split(':').map(Number);
    const [endHour, endMin] = block.endTime.split(':').map(Number);
    const [startHour] = block.startTime.split(':').map(Number);

    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    // Snap to 15-minute intervals
    const snappedMinute = Math.round(dropData.minute / 15) * 15;
    const newStartMinutes = dropData.hour * 60 + snappedMinute;
    const newEndMinutes = newStartMinutes + duration;

    const newStartHour = Math.floor(newStartMinutes / 60);
    const newStartMin = newStartMinutes % 60;
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMin = newEndMinutes % 60;

    // Ensure within bounds (6 AM - 10 PM)
    if (newStartHour < 6 || newEndHour > 22) return;

    await updateTimeBlock(block.id!, {
      startTime: `${newStartHour.toString().padStart(2, '0')}:${newStartMin.toString().padStart(2, '0')}`,
      endTime: `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`,
    });
  };

  // Generate drop zones for every 15 minutes
  const dropSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hourEnergy = energyPatterns?.hourlyAverages.find(h => h.hour === hour);
        slots.push({
          hour,
          minute,
          energyLevel: hourEnergy?.avgEnergy,
          isPeak: energyPatterns?.peakHours.includes(hour),
          isLow: energyPatterns?.lowHours.includes(hour),
        });
      }
    }
    return slots;
  }, [energyPatterns]);

  // Get dragged block for overlay
  const activeBlock = useMemo(() => {
    if (!activeId) return null;
    const blockId = parseInt(activeId.replace('block-', ''));
    return timeBlocks?.find(b => b.id === blockId);
  }, [activeId, timeBlocks]);

  return (
    <>
      <Card className="flex-1">
        <CardHeader
          title="Daily Timeline"
          subtitle="Drag blocks to reschedule"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEnergyOverlay(!showEnergyOverlay)}
                className={`p-2 rounded-lg transition-colors ${
                  showEnergyOverlay
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title={showEnergyOverlay ? 'Hide energy overlay' : 'Show energy overlay'}
              >
                {showEnergyOverlay ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          }
        />

        {/* Energy Pattern Insights */}
        {energyPatterns && energyPatterns.recommendations.length > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-800/30">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-yellow-200 font-medium">Energy Insight</p>
                <p className="text-slate-400 mt-0.5">{energyPatterns.recommendations[0]}</p>
              </div>
            </div>
          </div>
        )}

        <DndContext
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          collisionDetection={pointerWithin}
        >
          <div
            ref={timelineRef}
            className="relative h-[600px] border border-slate-800 rounded-lg overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700"
          >
            {/* Drop zones */}
            {dropSlots.map((slot) => (
              <DroppableSlot
                key={`${slot.hour}-${slot.minute}`}
                hour={slot.hour}
                minute={slot.minute}
                energyLevel={slot.energyLevel}
                isPeak={slot.isPeak}
                isLow={slot.isLow}
                showEnergyOverlay={showEnergyOverlay}
                isOver={dragOverSlot?.hour === slot.hour && dragOverSlot?.minute === slot.minute}
              />
            ))}

            {/* Hour lines */}
            {hours.map((hour) => {
              const hourEnergy = energyPatterns?.hourlyAverages.find(h => h.hour === hour);
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-slate-800/50"
                  style={{ top: `${((hour - 6) / 16) * 100}%` }}
                >
                  <span className="absolute -top-2.5 left-2 text-xs text-slate-500 flex items-center gap-1 bg-slate-900/80 px-1 rounded">
                    {hour.toString().padStart(2, '0')}:00
                    {showEnergyOverlay && hourEnergy && hourEnergy.sampleCount >= 2 && (
                      <span className="text-[9px] opacity-60">
                        ({hourEnergy.avgEnergy.toFixed(1)})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}

            {/* Current time indicator */}
            {currentTimePosition && format(new Date(), 'yyyy-MM-dd') === selectedDate && (
              <div
                className="absolute left-14 right-2 h-0.5 bg-red-500 z-50 pointer-events-none"
                style={{ top: currentTimePosition }}
              >
                <div className="absolute -left-2 -top-1.5 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="absolute -left-14 -top-2 text-[10px] text-red-400 font-medium">
                  {format(currentTime, 'HH:mm')}
                </span>
              </div>
            )}

            {/* Time blocks */}
            <div className="absolute left-16 right-2 top-0 bottom-0">
              {timeBlocks?.map((block) => (
                <DraggableBlock
                  key={block.id}
                  block={block}
                  position={getBlockPosition(block.startTime, block.endTime)}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteBlock}
                />
              ))}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeBlock && (
              <div
                className="rounded-lg p-2 shadow-xl pointer-events-none"
                style={{
                  backgroundColor: activeBlock.color + '40',
                  borderLeft: `3px solid ${activeBlock.color}`,
                  width: '200px',
                }}
              >
                <p className="font-medium text-sm text-white truncate">{activeBlock.title}</p>
                <p className="text-xs text-slate-400">
                  {activeBlock.startTime} - {activeBlock.endTime}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Time Block"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="What are you working on?"
            placeholder="Deep work, Meeting, Exercise..."
            value={editingBlock.title}
            onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
          />

          {/* Category selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setEditingBlock({
                    ...editingBlock,
                    category: cat.value,
                    color: cat.color,
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    editingBlock.category === cat.value
                      ? 'ring-2 ring-white scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: cat.color + '30',
                    borderLeft: `3px solid ${cat.color}`,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suggested times based on energy */}
          {timeSuggestions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Suggested times
              </label>
              <div className="flex flex-wrap gap-2">
                {timeSuggestions
                  .filter(s => s.quality === 'optimal' || s.quality === 'good')
                  .slice(0, 4)
                  .map((suggestion) => (
                    <button
                      key={suggestion.hour}
                      onClick={() => {
                        const startHour = suggestion.hour.toString().padStart(2, '0');
                        const endHour = (suggestion.hour + 1).toString().padStart(2, '0');
                        setEditingBlock({
                          ...editingBlock,
                          startTime: `${startHour}:00`,
                          endTime: `${endHour}:00`,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        suggestion.quality === 'optimal'
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                      title={suggestion.reason}
                    >
                      {suggestion.label}
                      {suggestion.quality === 'optimal' && (
                        <span className="ml-1 text-[10px]">*</span>
                      )}
                    </button>
                  ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">* = Peak energy time</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label="Start Time"
              value={editingBlock.startTime}
              onChange={(e) => setEditingBlock({ ...editingBlock, startTime: e.target.value })}
            />
            <Input
              type="time"
              label="End Time"
              value={editingBlock.endTime}
              onChange={(e) => setEditingBlock({ ...editingBlock, endTime: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditingBlock({ ...editingBlock, color })}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    editingBlock.color === color ? 'ring-2 ring-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleAddBlock} className="w-full">
            Add Block
          </Button>
        </div>
      </Modal>
    </>
  );
}

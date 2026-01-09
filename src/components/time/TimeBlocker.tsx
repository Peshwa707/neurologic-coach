import { useState, useMemo } from 'react';
import { Plus, Trash2, Check, Zap, ZapOff } from 'lucide-react';
import { Card, CardHeader, Button, Input, Modal } from '../common';
import { useTimeBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock, useEnergyPatternLogs } from '../../hooks/useDatabase';
import { format } from 'date-fns';
import { analyzeEnergyPatterns, getEnergyBgColor, suggestOptimalTimes, type TimeRecommendation } from '../../utils/energyAnalysis';

const COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

export function TimeBlocker() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const timeBlocks = useTimeBlocks(selectedDate);
  const energyLogs = useEnergyPatternLogs(14);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showEnergyOverlay, setShowEnergyOverlay] = useState(true);
  const [editingBlock, setEditingBlock] = useState<{
    title: string;
    startTime: string;
    endTime: string;
    color: string;
  }>({
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    color: COLORS[0],
  });

  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

  // Analyze energy patterns
  const energyPatterns = useMemo(() => {
    if (!energyLogs || energyLogs.length === 0) return null;
    return analyzeEnergyPatterns(energyLogs, 14);
  }, [energyLogs]);

  // Get suggestions for time slots
  const timeSuggestions = useMemo((): TimeRecommendation[] => {
    if (!energyPatterns) return [];
    const existingBlocks = timeBlocks?.map(b => ({ startTime: b.startTime, endTime: b.endTime })) || [];
    return suggestOptimalTimes(5, energyPatterns, existingBlocks); // Default resistance of 5
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
      height: `${endPercent - startPercent}%`,
    };
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Time Blocks"
          subtitle="Plan your day visually"
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

        <div className="relative h-[500px] border border-slate-800 rounded-lg overflow-hidden">
          {/* Energy overlay background */}
          {showEnergyOverlay && energyPatterns && (
            <div className="absolute inset-0 left-16 pointer-events-none">
              {energyPatterns.hourlyAverages
                .filter(h => h.hour >= 6 && h.hour <= 21)
                .map((hourData) => {
                  const topPercent = ((hourData.hour - 6) / 16) * 100;
                  const isPeak = energyPatterns.peakHours.includes(hourData.hour);
                  const isLow = energyPatterns.lowHours.includes(hourData.hour);

                  return (
                    <div
                      key={hourData.hour}
                      className="absolute left-0 right-0 flex items-center justify-end pr-2"
                      style={{
                        top: `${topPercent}%`,
                        height: `${100 / 16}%`,
                        backgroundColor: getEnergyBgColor(hourData.avgEnergy, 0.15),
                      }}
                    >
                      {(isPeak || isLow) && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          isPeak
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {isPeak ? 'Peak' : 'Low'}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Hour lines */}
          {hours.map((hour) => {
            const hourEnergy = energyPatterns?.hourlyAverages.find(h => h.hour === hour);
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-slate-800/50"
                style={{ top: `${((hour - 6) / 16) * 100}%` }}
              >
                <span className="absolute -top-2.5 left-2 text-xs text-slate-500 flex items-center gap-1">
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

          {/* Time blocks */}
          <div className="absolute left-16 right-2 top-0 bottom-0">
            {timeBlocks?.map((block) => {
              const position = getBlockPosition(block.startTime, block.endTime);
              return (
                <div
                  key={block.id}
                  className={`absolute left-0 right-0 rounded-lg p-2 transition-all ${
                    block.completed ? 'opacity-50' : ''
                  }`}
                  style={{
                    ...position,
                    backgroundColor: block.color + '20',
                    borderLeft: `3px solid ${block.color}`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${block.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                        {block.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {block.startTime} - {block.endTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleToggleComplete(block.id!, block.completed)}
                        className={`p-1 rounded hover:bg-slate-700 ${block.completed ? 'text-emerald-400' : 'text-slate-400'}`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(block.id!)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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

          {/* Suggested times based on energy */}
          {timeSuggestions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Suggested times (based on your energy)
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

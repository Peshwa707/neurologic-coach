import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Battery, BatteryLow, BatteryMedium, BatteryFull, Zap, Play, Brain } from 'lucide-react';
import { useTasks, useLatestEnergyLog } from '../../hooks/useDatabase';

interface MatchedTask {
  id: number;
  title: string;
  resistance: number;
  estimatedMinutes?: number;
  matchReason: string;
}

export function EnergyMatcher() {
  const tasks = useTasks('pending');
  const latestEnergy = useLatestEnergyLog();

  const energyLevel = latestEnergy?.energy || 3; // Default to medium

  const matchedTasks = useMemo((): MatchedTask[] => {
    if (!tasks || tasks.length === 0) return [];

    // Match tasks to energy level
    // High energy (4-5) -> Can handle high resistance tasks
    // Medium energy (3) -> Medium resistance tasks
    // Low energy (1-2) -> Low resistance, quick wins

    const scored = tasks.map(task => {
      const resistance = task.resistance || 5;
      let score = 0;
      let matchReason = '';

      if (energyLevel >= 4) {
        // High energy - prioritize high resistance tasks
        if (resistance >= 7) {
          score = 100;
          matchReason = 'Perfect for your high energy!';
        } else if (resistance >= 4) {
          score = 70;
          matchReason = 'Good match for current energy';
        } else {
          score = 30;
          matchReason = 'Easy win while energy is high';
        }
      } else if (energyLevel === 3) {
        // Medium energy - medium tasks
        if (resistance >= 4 && resistance <= 6) {
          score = 100;
          matchReason = 'Matches your energy level';
        } else if (resistance < 4) {
          score = 70;
          matchReason = 'Manageable right now';
        } else {
          score = 40;
          matchReason = 'Might be challenging';
        }
      } else {
        // Low energy - easy tasks only
        if (resistance <= 3) {
          score = 100;
          matchReason = 'Low effort, perfect for now';
        } else if (resistance <= 5) {
          score = 50;
          matchReason = 'Doable with micro-start';
        } else {
          score = 10;
          matchReason = 'Save for higher energy';
        }
      }

      // Boost score for quick tasks when energy is low
      if (energyLevel <= 2 && task.estimatedMinutes && task.estimatedMinutes <= 15) {
        score += 20;
        matchReason = 'Quick win for low energy!';
      }

      return {
        id: task.id!,
        title: task.title,
        resistance: resistance,
        estimatedMinutes: task.estimatedMinutes,
        matchReason,
        score,
      };
    });

    // Sort by score and return top 3
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ score: _score, ...rest }) => rest);
  }, [tasks, energyLevel]);

  const getEnergyIcon = () => {
    if (energyLevel >= 4) return <BatteryFull className="w-5 h-5 text-emerald-400" />;
    if (energyLevel === 3) return <BatteryMedium className="w-5 h-5 text-amber-400" />;
    return <BatteryLow className="w-5 h-5 text-red-400" />;
  };

  const getEnergyLabel = () => {
    if (energyLevel >= 4) return 'High Energy';
    if (energyLevel === 3) return 'Medium Energy';
    return 'Low Energy';
  };

  const getEnergyColor = () => {
    if (energyLevel >= 4) return 'from-emerald-600/30 to-teal-600/30 border-emerald-700/50';
    if (energyLevel === 3) return 'from-amber-600/30 to-orange-600/30 border-amber-700/50';
    return 'from-red-600/30 to-rose-600/30 border-red-700/50';
  };

  if (!latestEnergy) {
    return (
      <div className={`bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-700 rounded-xl p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
            <Battery className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Log Your Energy</h3>
            <p className="text-sm text-slate-400">Get task suggestions matched to how you feel</p>
          </div>
          <Link
            to="/awareness"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Log Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r ${getEnergyColor()} border rounded-xl p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center">
            {getEnergyIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Energy-Matched Tasks
            </h3>
            <p className="text-sm text-slate-300">{getEnergyLabel()} - Here's what fits</p>
          </div>
        </div>
        <Link
          to="/awareness"
          className="text-xs text-slate-400 hover:text-white"
        >
          Update energy
        </Link>
      </div>

      {/* Matched Tasks */}
      {matchedTasks.length > 0 ? (
        <div className="space-y-2">
          {matchedTasks.map((task, index) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 bg-black/20 rounded-lg"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{task.title}</p>
                <p className="text-xs text-slate-400">{task.matchReason}</p>
              </div>
              <div className="flex items-center gap-2">
                {task.estimatedMinutes && (
                  <span className="text-xs text-slate-500">{task.estimatedMinutes}m</span>
                )}
                <Link
                  to="/time"
                  state={{ quickStartTaskId: task.id, quickStartTaskTitle: task.title }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4 text-white" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-slate-400">No pending tasks</p>
          <Link to="/tasks" className="text-indigo-400 text-sm hover:text-indigo-300">
            Add a task
          </Link>
        </div>
      )}

      {/* Energy tip */}
      <div className="mt-4 p-3 bg-black/10 rounded-lg">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-amber-400 mt-0.5" />
          <p className="text-xs text-slate-300">
            {energyLevel >= 4
              ? "High energy detected! Great time to tackle challenging tasks."
              : energyLevel === 3
              ? "Moderate energy - pace yourself with medium tasks."
              : "Low energy is okay! Focus on quick wins and easy tasks."}
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Target } from 'lucide-react';
import { Button, Card, CircularProgress } from '../common';
import { useSettings, addPomodoroSession, useTodayPomodoros } from '../../hooks/useDatabase';

export function PomodoroTimer() {
  const settings = useSettings();
  const todayPomodoros = useTodayPomodoros();

  const workDuration = (settings?.pomodoroWork || 25) * 60;
  const breakDuration = (settings?.pomodoroBreak || 5) * 60;

  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [, setSessionCount] = useState(0);

  useEffect(() => {
    setTimeLeft(isWorkSession ? workDuration : breakDuration);
  }, [workDuration, breakDuration, isWorkSession]);

  useEffect(() => {
    let interval: number | null = null;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleSessionComplete = useCallback(async () => {
    setIsRunning(false);

    // Play notification sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleT0dLrPV4ohkSB9HrM7ZhGQ8GC+0zteId0kbOrC94IZpQBI7rbvgiWlBEzystN6HaD0SOa+24YdmPA8wsrXfhWY7Djmztt+GZjsON7S34YZnPA44s7bfhmY7Dje0t+GGZzwOOLO234ZmOw43tLfhhmg8Djizt+CIaT4POLW34IZnPA45tLjhh2c8Dji0t+GGZzwOOLO234ZmOw43tLfhhmg7Djm0uOGHaDwOObS34IdnPQ44tLfgh2c8Dji0t+GHZzwOOLS34YdnPA44tLfhh2c8Dji0t+GHZzwO');
      audio.play().catch(() => {});
    } catch {}

    // Log the session
    await addPomodoroSession({
      duration: isWorkSession ? (settings?.pomodoroWork || 25) : (settings?.pomodoroBreak || 5),
      type: isWorkSession ? 'work' : 'break',
      completedAt: new Date(),
      interrupted: false,
    });

    if (isWorkSession) {
      setSessionCount((prev) => prev + 1);
    }

    // Switch session type
    setIsWorkSession((prev) => !prev);
  }, [isWorkSession, settings]);

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const resetTimer = async () => {
    if (isRunning && timeLeft > 0) {
      // Log interrupted session
      const elapsed = (isWorkSession ? workDuration : breakDuration) - timeLeft;
      if (elapsed > 60) {
        await addPomodoroSession({
          duration: Math.floor(elapsed / 60),
          type: isWorkSession ? 'work' : 'break',
          completedAt: new Date(),
          interrupted: true,
        });
      }
    }
    setIsRunning(false);
    setTimeLeft(isWorkSession ? workDuration : breakDuration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = isWorkSession ? workDuration : breakDuration;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  const todayWorkSessions = todayPomodoros?.filter(p => p.type === 'work' && !p.interrupted).length || 0;
  const todayFocusMinutes = todayPomodoros?.filter(p => p.type === 'work').reduce((sum, p) => sum + p.duration, 0) || 0;

  return (
    <Card className="text-center">
      <div className="mb-4">
        <div className="inline-flex rounded-lg bg-slate-800 p-1 mb-6">
          <button
            onClick={() => { setIsWorkSession(true); setIsRunning(false); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              isWorkSession
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Focus
          </button>
          <button
            onClick={() => { setIsWorkSession(false); setIsRunning(false); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              !isWorkSession
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coffee className="w-4 h-4 inline mr-2" />
            Break
          </button>
        </div>

        <CircularProgress
          value={progress}
          size={200}
          strokeWidth={8}
          color={isWorkSession ? '#6366f1' : '#10b981'}
        >
          <div>
            <p className="text-4xl font-bold text-white font-mono">
              {formatTime(timeLeft)}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {isWorkSession ? 'Focus Time' : 'Break Time'}
            </p>
          </div>
        </CircularProgress>
      </div>

      <div className="flex justify-center gap-3 mb-6">
        <Button
          size="lg"
          variant={isRunning ? 'secondary' : 'primary'}
          onClick={toggleTimer}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start
            </>
          )}
        </Button>
        <Button size="lg" variant="ghost" onClick={resetTimer}>
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
        <div>
          <p className="text-2xl font-bold text-white">{todayWorkSessions}</p>
          <p className="text-xs text-slate-400">Sessions Today</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{todayFocusMinutes}m</p>
          <p className="text-xs text-slate-400">Focus Time</p>
        </div>
      </div>
    </Card>
  );
}

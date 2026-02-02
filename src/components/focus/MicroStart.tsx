import { useState, useEffect, useCallback } from 'react';
import { Timer, Play, Pause, X, Check, Sparkles } from 'lucide-react';
import { addWin } from '../../hooks/useDatabase';

interface MicroStartProps {
  taskTitle: string;
  onComplete: () => void;
  onCancel: () => void;
}

const MICRO_DURATION = 120; // 2 minutes

const motivationalMessages = [
  "Just 2 minutes. You can do anything for 2 minutes.",
  "Starting is the hardest part. You've got this!",
  "Your future self will thank you for these 2 minutes.",
  "Small steps lead to big wins. Let's go!",
  "2 minutes of focus beats hours of procrastination.",
];

export function MicroStart({ taskTitle, onComplete, onCancel }: MicroStartProps) {
  const [timeLeft, setTimeLeft] = useState(MICRO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [message] = useState(
    () => motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
  );

  const handleComplete = useCallback(async () => {
    setIsCompleted(true);
    setIsRunning(false);

    // Log as a win
    await addWin({
      title: `Started: ${taskTitle}`,
      category: 'task',
      description: 'Completed a 2-minute micro-start session',
      celebrationLevel: 1,
      timestamp: new Date(),
    });

    // Wait for celebration animation
    setTimeout(onComplete, 2000);
  }, [taskTitle, onComplete]);

  useEffect(() => {
    let interval: number | null = null;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      handleComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, handleComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((MICRO_DURATION - timeLeft) / MICRO_DURATION) * 100;

  if (isCompleted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">You Did It!</h3>
          <p className="text-slate-300">
            You started. That's the hardest part.
          </p>
          <p className="text-emerald-400 mt-2 font-medium">
            Keep going or take a break - your choice!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm bg-slate-900 border border-indigo-500/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-indigo-400" />
              <span className="font-semibold text-white">Micro-Start</span>
            </div>
            <button
              onClick={onCancel}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Task */}
          <div className="mb-6">
            <p className="text-sm text-slate-400 mb-1">Working on:</p>
            <p className="font-medium text-white">{taskTitle}</p>
          </div>

          {/* Timer */}
          <div className="text-center mb-6">
            <p className="text-6xl font-mono font-bold text-white mb-2">
              {formatTime(timeLeft)}
            </p>
            <p className="text-sm text-slate-400">Just 2 minutes. That's it.</p>
          </div>

          {/* Message */}
          <div className="flex items-start gap-2 p-3 bg-indigo-500/10 rounded-lg mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-indigo-200">{message}</p>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {timeLeft === MICRO_DURATION ? 'Start' : 'Resume'}
                </>
              )}
            </button>
            {isRunning && (
              <button
                onClick={handleComplete}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors"
                title="I'm done!"
              >
                <Check className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Skip option */}
          {!isRunning && timeLeft === MICRO_DURATION && (
            <button
              onClick={handleComplete}
              className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-300"
            >
              I already started, mark as done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to use MicroStart
export function useMicroStart() {
  const [microStartTask, setMicroStartTask] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const startMicroSession = (taskId: number, taskTitle: string) => {
    setMicroStartTask({ id: taskId, title: taskTitle });
  };

  const closeMicroSession = () => {
    setMicroStartTask(null);
  };

  return {
    microStartTask,
    startMicroSession,
    closeMicroSession,
  };
}

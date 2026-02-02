import { Play, Pause, RotateCcw, Coffee, Target } from 'lucide-react';
import { Button, Card, CircularProgress } from '../common';
import { usePomodoro } from '../../contexts/PomodoroContext';

export function PomodoroTimer() {
  const {
    timeLeft,
    isRunning,
    isWorkSession,
    progress,
    todayWorkSessions,
    todayFocusMinutes,
    toggleTimer,
    resetTimer,
    setIsWorkSession,
  } = usePomodoro();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="text-center">
      <div className="mb-4">
        <div className="inline-flex rounded-lg bg-slate-800 p-1 mb-6">
          <button
            onClick={() => setIsWorkSession(true)}
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
            onClick={() => setIsWorkSession(false)}
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

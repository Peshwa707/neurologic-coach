import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, StopCircle } from 'lucide-react';
import { usePomodoroOptional } from '../../contexts/PomodoroContext';

export function ContextSwitchWarning() {
  const pomodoro = usePomodoroOptional();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const [lastPath, setLastPath] = useState(location.pathname);

  const shouldBlock = pomodoro?.isRunning && pomodoro?.isWorkSession;

  // Detect navigation attempts by watching location changes
  useEffect(() => {
    if (shouldBlock && location.pathname !== lastPath) {
      // User tried to navigate away during focus session
      setShowWarning(true);
      // Note: We can't actually block in this approach, but we can warn
    }
    setLastPath(location.pathname);
  }, [location.pathname, shouldBlock, lastPath]);

  // Add beforeunload warning for browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldBlock) {
        e.preventDefault();
        e.returnValue = 'You have an active focus session. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStayFocused = () => {
    setShowWarning(false);
  };

  const handleEndSession = async () => {
    await pomodoro?.resetTimer();
    setShowWarning(false);
  };

  const handleLeave = () => {
    setShowWarning(false);
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleStayFocused}
      />
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white text-center mb-2">
          Focus Session Active
        </h3>

        {/* Timer display */}
        <div className="text-center mb-4">
          <p className="text-3xl font-mono font-bold text-indigo-400">
            {pomodoro ? formatTime(pomodoro.timeLeft) : '--:--'}
          </p>
          <p className="text-sm text-slate-400">remaining</p>
        </div>

        {/* Message */}
        <p className="text-slate-300 text-center mb-6">
          You navigated away from your focus session.
          <span className="text-amber-400 font-medium"> Context switching is expensive for ADHD brains!</span>
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleStayFocused}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Stay Focused
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleEndSession}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <StopCircle className="w-4 h-4" />
              End Session
            </button>
            <button
              onClick={handleLeave}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Tip */}
        <p className="text-xs text-slate-500 text-center mt-4">
          Tip: Use the Parking Lot to capture distracting thoughts
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { AlertCircle, Coffee, Droplet, PersonStanding, Eye, X } from 'lucide-react';
import { usePomodoroOptional } from '../../contexts/PomodoroContext';

// Warn after consecutive work sessions without proper break
const HYPERFOCUS_THRESHOLD = 3; // sessions
const REMINDER_INTERVAL = 45 * 60 * 1000; // 45 minutes

const breakReminders = [
  { icon: Droplet, message: "Drink some water!", color: "text-blue-400" },
  { icon: PersonStanding, message: "Stand up and stretch!", color: "text-purple-400" },
  { icon: Eye, message: "Rest your eyes - look at something far away", color: "text-emerald-400" },
  { icon: Coffee, message: "Maybe grab a healthy snack?", color: "text-amber-400" },
];

export function HyperfocusAlert() {
  const pomodoro = usePomodoroOptional();
  const [showAlert, setShowAlert] = useState(false);
  const [currentReminder, setCurrentReminder] = useState(0);
  const [consecutiveSessions, setConsecutiveSessions] = useState(0);
  const lastBreakTime = useRef<number>(Date.now());
  const lastSessionCount = useRef<number>(0);

  // Track consecutive work sessions
  useEffect(() => {
    if (!pomodoro) return;

    // If they just finished a work session (session count increased)
    if (pomodoro.todayWorkSessions > lastSessionCount.current) {
      if (pomodoro.isWorkSession === false) {
        // They completed a work session and are now on break
        setConsecutiveSessions(prev => prev + 1);
      }
      lastSessionCount.current = pomodoro.todayWorkSessions;
    }

    // Reset consecutive count when they take a real break (timer not running)
    if (!pomodoro.isRunning && !pomodoro.isWorkSession) {
      // They paused during a break - good!
      setConsecutiveSessions(0);
      lastBreakTime.current = Date.now();
    }
  }, [pomodoro?.todayWorkSessions, pomodoro?.isRunning, pomodoro?.isWorkSession, pomodoro]);

  // Show hyperfocus warning after threshold
  useEffect(() => {
    if (consecutiveSessions >= HYPERFOCUS_THRESHOLD) {
      setShowAlert(true);
      setCurrentReminder(Math.floor(Math.random() * breakReminders.length));
    }
  }, [consecutiveSessions]);

  // Periodic reminder during long sessions
  useEffect(() => {
    if (!pomodoro?.isRunning || !pomodoro?.isWorkSession) return;

    const checkInterval = setInterval(() => {
      const timeSinceBreak = Date.now() - lastBreakTime.current;
      if (timeSinceBreak > REMINDER_INTERVAL) {
        setShowAlert(true);
        setCurrentReminder(Math.floor(Math.random() * breakReminders.length));
        lastBreakTime.current = Date.now(); // Reset to avoid spam
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [pomodoro?.isRunning, pomodoro?.isWorkSession]);

  const handleDismiss = () => {
    setShowAlert(false);
    setConsecutiveSessions(0);
    lastBreakTime.current = Date.now();
  };

  const handleTakeBreak = () => {
    setShowAlert(false);
    setConsecutiveSessions(0);
    lastBreakTime.current = Date.now();
    // Switch to break mode
    pomodoro?.setIsWorkSession(false);
  };

  if (!showAlert) return null;

  const reminder = breakReminders[currentReminder];
  const ReminderIcon = reminder.icon;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in slide-in-from-top duration-300">
      <div className="bg-slate-900 border border-orange-500/50 rounded-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">Hyperfocus Check</h4>
              <button
                onClick={handleDismiss}
                className="p-1 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              You've been in deep focus for a while!
            </p>

            <div className="flex items-center gap-2 mt-3 p-2 bg-slate-800/50 rounded-lg">
              <ReminderIcon className={`w-5 h-5 ${reminder.color}`} />
              <span className="text-sm text-slate-300">{reminder.message}</span>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleTakeBreak}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Take a Break
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
              >
                5 more min
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSettings, addPomodoroSession, useTodayPomodoros } from '../hooks/useDatabase';
import { db } from '../db/database';

interface ParkingLotItem {
  id: string;
  text: string;
  createdAt: Date;
}

interface SessionSummaryData {
  isOpen: boolean;
  duration: number;
  wasInterrupted: boolean;
}

interface PomodoroContextType {
  timeLeft: number;
  isRunning: boolean;
  isWorkSession: boolean;
  progress: number;
  todayWorkSessions: number;
  todayFocusMinutes: number;
  workDuration: number;
  breakDuration: number;
  parkingLot: ParkingLotItem[];
  sessionSummary: SessionSummaryData;
  toggleTimer: () => void;
  resetTimer: () => Promise<void>;
  setIsWorkSession: (isWork: boolean) => void;
  addToParkingLot: (text: string) => void;
  clearParkingLot: () => void;
  removeFromParkingLot: (id: string) => void;
  convertToTask: (item: ParkingLotItem) => Promise<void>;
  closeSessionSummary: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const todayPomodoros = useTodayPomodoros();

  const workDuration = (settings?.pomodoroWork || 25) * 60;
  const breakDuration = (settings?.pomodoroBreak || 5) * 60;

  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSessionState] = useState(true);
  const [parkingLot, setParkingLot] = useState<ParkingLotItem[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryData>({
    isOpen: false,
    duration: 0,
    wasInterrupted: false,
  });

  // Load parking lot from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pomodoro-parking-lot');
    if (saved) {
      try {
        const items = JSON.parse(saved);
        setParkingLot(items.map((item: ParkingLotItem) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        })));
      } catch {}
    }
  }, []);

  // Save parking lot to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoro-parking-lot', JSON.stringify(parkingLot));
  }, [parkingLot]);

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(isWorkSession ? workDuration : breakDuration);
    }
  }, [workDuration, breakDuration, isWorkSession, isRunning]);

  const handleSessionComplete = useCallback(async () => {
    const wasWorkSession = isWorkSession;
    const sessionDuration = wasWorkSession ? (settings?.pomodoroWork || 25) : (settings?.pomodoroBreak || 5);

    setIsRunning(false);

    // Play notification sound
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const frequencies = [523.25, 659.25, 783.99];
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        const startTime = audioContext.currentTime + (index * 0.1);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 1.0);
        oscillator.start(startTime);
        oscillator.stop(startTime + 1.0);
      });
    } catch {}

    // Log the session
    await addPomodoroSession({
      duration: sessionDuration,
      type: wasWorkSession ? 'work' : 'break',
      completedAt: new Date(),
      interrupted: false,
    });

    // Show session summary for completed work sessions
    if (wasWorkSession) {
      setSessionSummary({
        isOpen: true,
        duration: sessionDuration,
        wasInterrupted: false,
      });
    }

    // Switch session type
    setIsWorkSessionState((prev) => !prev);
  }, [isWorkSession, settings]);

  useEffect(() => {
    let interval: number | null = null;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      handleSessionComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, handleSessionComplete]);

  // Warn before closing tab during active session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning && isWorkSession) {
        e.preventDefault();
        e.returnValue = 'You have an active focus session. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, isWorkSession]);

  const toggleTimer = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const resetTimer = useCallback(async () => {
    if (isRunning && timeLeft > 0) {
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
  }, [isRunning, timeLeft, isWorkSession, workDuration, breakDuration]);

  const setIsWorkSession = useCallback((isWork: boolean) => {
    setIsWorkSessionState(isWork);
    setIsRunning(false);
  }, []);

  const addToParkingLot = useCallback((text: string) => {
    if (!text.trim()) return;
    setParkingLot(prev => [...prev, {
      id: Date.now().toString(),
      text: text.trim(),
      createdAt: new Date()
    }]);
  }, []);

  const removeFromParkingLot = useCallback((id: string) => {
    setParkingLot(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearParkingLot = useCallback(() => {
    setParkingLot([]);
  }, []);

  const convertToTask = useCallback(async (item: ParkingLotItem) => {
    await db.tasks.add({
      title: item.text,
      description: `Captured during focus session on ${item.createdAt.toLocaleDateString()}`,
      steps: [],
      resistance: 1,
      status: 'pending',
      createdAt: new Date(),
    });
    removeFromParkingLot(item.id);
  }, [removeFromParkingLot]);

  const closeSessionSummary = useCallback(() => {
    setSessionSummary(prev => ({ ...prev, isOpen: false }));
  }, []);

  const totalDuration = isWorkSession ? workDuration : breakDuration;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  const todayWorkSessions = todayPomodoros?.filter(p => p.type === 'work' && !p.interrupted).length || 0;
  const todayFocusMinutes = todayPomodoros?.filter(p => p.type === 'work').reduce((sum, p) => sum + p.duration, 0) || 0;

  return (
    <PomodoroContext.Provider value={{
      timeLeft,
      isRunning,
      isWorkSession,
      progress,
      todayWorkSessions,
      todayFocusMinutes,
      workDuration,
      breakDuration,
      parkingLot,
      sessionSummary,
      toggleTimer,
      resetTimer,
      setIsWorkSession,
      addToParkingLot,
      clearParkingLot,
      removeFromParkingLot,
      convertToTask,
      closeSessionSummary,
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}

// Optional hook that doesn't throw if outside provider
export function usePomodoroOptional() {
  return useContext(PomodoroContext);
}

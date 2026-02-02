import { useState, useEffect } from 'react';
import { Users, Sparkles } from 'lucide-react';
import { usePomodoroOptional } from '../../contexts/PomodoroContext';
import { useSettings } from '../../hooks/useDatabase';

// Encouraging messages for virtual presence
const PRESENCE_MESSAGES = [
  "Working alongside you",
  "Here with you",
  "Focused together",
  "You're not alone",
  "Side by side",
  "In this together",
  "Your focus buddy",
  "Keeping you company",
];

const MILESTONE_MESSAGES = [
  { time: 5, message: "Great start! 5 minutes in." },
  { time: 10, message: "10 minutes strong!" },
  { time: 15, message: "Halfway there, keep going!" },
  { time: 20, message: "20 minutes! Almost done!" },
  { time: 25, message: "Final stretch!" },
];

export function BodyDoubling() {
  const pomodoro = usePomodoroOptional();
  const settings = useSettings();
  const [presenceMessage, setPresenceMessage] = useState(PRESENCE_MESSAGES[0]);
  const [milestone, setMilestone] = useState<string | null>(null);

  // Only show if body doubling is enabled and during work sessions
  const showBodyDoubling = settings?.bodyDoublingEnabled && pomodoro?.isRunning && pomodoro?.isWorkSession;

  // Rotate presence messages every 30 seconds
  useEffect(() => {
    if (!showBodyDoubling) return;

    const interval = setInterval(() => {
      setPresenceMessage(prev => {
        const currentIndex = PRESENCE_MESSAGES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % PRESENCE_MESSAGES.length;
        return PRESENCE_MESSAGES[nextIndex];
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [showBodyDoubling]);

  // Check for milestones
  useEffect(() => {
    if (!pomodoro || !showBodyDoubling) return;

    const elapsedMinutes = Math.floor((pomodoro.workDuration - pomodoro.timeLeft) / 60);
    const milestoneMatch = MILESTONE_MESSAGES.find(m => m.time === elapsedMinutes);

    if (milestoneMatch) {
      setMilestone(milestoneMatch.message);
      // Clear milestone after 5 seconds
      const timeout = setTimeout(() => setMilestone(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [pomodoro?.timeLeft, showBodyDoubling]);

  if (!showBodyDoubling) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-30">
      {/* Milestone toast */}
      {milestone && (
        <div className="mb-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">{milestone}</span>
          </div>
        </div>
      )}

      {/* Body doubling indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-sm border border-purple-500/30 rounded-lg">
        <div className="relative">
          <Users className="w-4 h-4 text-purple-400" />
          {/* Pulsing indicator */}
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        <span className="text-sm text-purple-300">{presenceMessage}</span>
      </div>
    </div>
  );
}

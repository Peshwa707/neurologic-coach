import { useState, useEffect } from 'react';
import { Trophy, Clock, Star, Sparkles, X } from 'lucide-react';
import { addWin } from '../../hooks/useDatabase';

interface SessionSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  duration: number; // minutes
  wasInterrupted: boolean;
  todaySessionCount: number;
  todayFocusMinutes: number;
}

const encouragements = [
  "You showed up. That's everything.",
  "Your brain did hard work today!",
  "Focus is a muscle. You just flexed it.",
  "ADHD brain + intention = unstoppable.",
  "Every session builds momentum.",
  "You chose focus. That's a win.",
  "Your future self thanks you.",
  "Consistency > perfection. Always.",
];

const milestoneMessages: Record<number, string> = {
  1: "First session of the day!",
  3: "You're on a roll!",
  5: "Halfway to your goal!",
  8: "Deep work champion!",
  10: "Incredible focus today!",
};

export function SessionSummary({
  isOpen,
  onClose,
  duration,
  wasInterrupted,
  todaySessionCount,
  todayFocusMinutes,
}: SessionSummaryProps) {
  const [encouragement] = useState(
    () => encouragements[Math.floor(Math.random() * encouragements.length)]
  );
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && !wasInterrupted) {
      // Auto-log this as a win
      addWin({
        title: `Completed ${duration}min focus session`,
        category: 'focus',
        description: `Session #${todaySessionCount} - Total: ${todayFocusMinutes}min today`,
        celebrationLevel: duration >= 25 ? 2 : 1,
        timestamp: new Date(),
      });

      // Show confetti for completed sessions
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, wasInterrupted, duration, todaySessionCount, todayFocusMinutes]);

  if (!isOpen) return null;

  const milestone = milestoneMessages[todaySessionCount];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#10B981', '#6366F1', '#F59E0B', '#EC4899'][i % 4],
                width: '10px',
                height: '10px',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>
      )}

      <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center">
            {wasInterrupted ? (
              <Clock className="w-10 h-10 text-amber-400" />
            ) : (
              <Trophy className="w-10 h-10 text-emerald-400" />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-white text-center mb-2">
          {wasInterrupted ? 'Session Ended Early' : 'Session Complete!'}
        </h3>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 my-6">
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">{duration}m</p>
            <p className="text-xs text-slate-400">This Session</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-indigo-400">{todayFocusMinutes}m</p>
            <p className="text-xs text-slate-400">Total Today</p>
          </div>
        </div>

        {/* Session Count */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[...Array(Math.min(todaySessionCount, 10))].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${i < todaySessionCount ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
            />
          ))}
          {todaySessionCount > 10 && (
            <span className="text-amber-400 text-sm font-medium">+{todaySessionCount - 10}</span>
          )}
        </div>

        {/* Milestone */}
        {milestone && (
          <div className="flex items-center justify-center gap-2 mb-4 px-4 py-2 bg-amber-500/20 rounded-lg">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-medium">{milestone}</span>
          </div>
        )}

        {/* Encouragement */}
        <p className="text-slate-300 text-center italic mb-6">
          "{encouragement}"
        </p>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
        >
          {wasInterrupted ? 'Got It' : 'Keep Going!'}
        </button>
      </div>
    </div>
  );
}

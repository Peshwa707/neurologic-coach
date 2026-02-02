import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Wind, Eye, Heart, ArrowRight, X } from 'lucide-react';
import { usePomodoroOptional } from '../../contexts/PomodoroContext';

type RitualType = 'work_to_break' | 'break_to_work';

interface Ritual {
  type: RitualType;
  title: string;
  icon: typeof Wind;
  instruction: string;
  duration: number; // seconds
  color: string;
}

const rituals: Record<RitualType, Ritual[]> = {
  work_to_break: [
    {
      type: 'work_to_break',
      title: 'Deep Breath Release',
      icon: Wind,
      instruction: 'Take 3 deep breaths. Inhale for 4 counts, exhale for 6. Let go of the work.',
      duration: 15,
      color: 'from-blue-600/30 to-cyan-600/30 border-blue-700/50',
    },
    {
      type: 'work_to_break',
      title: 'Eye Reset',
      icon: Eye,
      instruction: 'Close your eyes for 10 seconds. Then look at something far away. Give your eyes a break.',
      duration: 15,
      color: 'from-purple-600/30 to-pink-600/30 border-purple-700/50',
    },
    {
      type: 'work_to_break',
      title: 'Gratitude Moment',
      icon: Heart,
      instruction: 'Name one thing you accomplished in that session. You showed up. That counts.',
      duration: 10,
      color: 'from-rose-600/30 to-orange-600/30 border-rose-700/50',
    },
  ],
  break_to_work: [
    {
      type: 'break_to_work',
      title: 'Focus Breath',
      icon: Wind,
      instruction: 'Take 2 energizing breaths. Quick inhale, slow exhale. Prepare your mind.',
      duration: 10,
      color: 'from-emerald-600/30 to-teal-600/30 border-emerald-700/50',
    },
    {
      type: 'break_to_work',
      title: 'Intention Set',
      icon: Sparkles,
      instruction: 'What ONE thing will you focus on? Just one. That\'s all you need.',
      duration: 10,
      color: 'from-amber-600/30 to-yellow-600/30 border-amber-700/50',
    },
  ],
};

export function TransitionRitual() {
  const pomodoro = usePomodoroOptional();
  const [showRitual, setShowRitual] = useState(false);
  const [currentRitual, setCurrentRitual] = useState<Ritual | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [lastSessionType, setLastSessionType] = useState<boolean | null>(null);

  // Detect session transitions
  useEffect(() => {
    if (!pomodoro) return;

    // Only trigger on actual session type change when timer stops
    if (!pomodoro.isRunning && lastSessionType !== null && lastSessionType !== pomodoro.isWorkSession) {
      // Session just changed
      const ritualType: RitualType = lastSessionType ? 'work_to_break' : 'break_to_work';
      const availableRituals = rituals[ritualType];
      const randomRitual = availableRituals[Math.floor(Math.random() * availableRituals.length)];

      setCurrentRitual(randomRitual);
      setCountdown(randomRitual.duration);
      setShowRitual(true);
    }

    setLastSessionType(pomodoro.isWorkSession);
  }, [pomodoro?.isRunning, pomodoro?.isWorkSession, pomodoro, lastSessionType]);

  // Countdown timer
  useEffect(() => {
    if (!showRitual || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-close after countdown
          setTimeout(() => setShowRitual(false), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showRitual, countdown]);

  const handleSkip = useCallback(() => {
    setShowRitual(false);
    setCurrentRitual(null);
  }, []);

  const handleDone = useCallback(() => {
    setShowRitual(false);
    setCurrentRitual(null);
  }, []);

  if (!showRitual || !currentRitual) return null;

  const Icon = currentRitual.icon;
  const progress = ((currentRitual.duration - countdown) / currentRitual.duration) * 100;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className={`relative w-full max-w-md bg-gradient-to-br ${currentRitual.color} border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300`}>
        {/* Progress bar */}
        <div className="h-1 bg-black/20">
          <div
            className="h-full bg-white/50 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{currentRitual.title}</h3>
                <p className="text-xs text-white/70">
                  {currentRitual.type === 'work_to_break' ? 'Winding down...' : 'Ramping up...'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 text-white/50 hover:text-white/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Instruction */}
          <div className="mb-6 p-4 bg-black/20 rounded-xl">
            <p className="text-white text-center leading-relaxed">
              {currentRitual.instruction}
            </p>
          </div>

          {/* Countdown */}
          <div className="text-center mb-6">
            <p className="text-4xl font-mono font-bold text-white">{countdown}s</p>
            <p className="text-sm text-white/60 mt-1">Take your time</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDone}
              className="flex-1 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              {currentRitual.type === 'work_to_break' ? 'Start Break' : 'Start Focus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

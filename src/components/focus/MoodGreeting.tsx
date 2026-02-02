import { useMemo } from 'react';
import { Sun, Moon, Sunrise, Sunset, Sparkles, Heart, Coffee, Zap } from 'lucide-react';
import { useLatestEnergyLog, useTodayWins } from '../../hooks/useDatabase';

interface GreetingData {
  greeting: string;
  message: string;
  icon: typeof Sun;
  color: string;
}

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const timeGreetings: Record<string, { icon: typeof Sun; text: string }> = {
  morning: { icon: Sunrise, text: 'Good morning' },
  afternoon: { icon: Sun, text: 'Good afternoon' },
  evening: { icon: Sunset, text: 'Good evening' },
  night: { icon: Moon, text: 'Hey there' },
};

// Mood-specific messages (1-5 scale)
const moodMessages: Record<number, string[]> = {
  1: [
    "Tough day? You showed up. That's what matters.",
    "Be gentle with yourself today.",
    "Even small steps count when you're struggling.",
    "It's okay to do the bare minimum today.",
  ],
  2: [
    "Not feeling 100%? That's okay.",
    "Low energy is valid. Try one small thing.",
    "You don't need to be productive to be worthy.",
    "Consider some quick wins today.",
  ],
  3: [
    "Steady and capable. You've got this.",
    "A moderate day is still a good day.",
    "What's one thing that would make today a win?",
    "You're doing better than you think.",
  ],
  4: [
    "Good energy today! Use it wisely.",
    "You're in a great spot to tackle something meaningful.",
    "This is a good day to challenge yourself.",
    "Momentum is on your side.",
  ],
  5: [
    "High energy! Time to crush it!",
    "You're on fire today! Tackle that hard task.",
    "Peak performance mode unlocked.",
    "This is your day to shine.",
  ],
};

// Energy-specific suggestions
const energySuggestions: Record<number, string> = {
  1: "Focus on self-care and easy wins",
  2: "Try a 2-minute micro-start on something small",
  3: "Good balance - mix challenging and easy tasks",
  4: "Great energy for tackling high-resistance tasks",
  5: "Peak energy! Perfect for your hardest challenges",
};

export function MoodGreeting() {
  const latestMoodLog = useLatestEnergyLog();
  const todayWins = useTodayWins();
  const timeOfDay = getTimeOfDay();

  const greeting = useMemo((): GreetingData => {
    const timeData = timeGreetings[timeOfDay];
    const mood = latestMoodLog?.mood || 3;
    const energy = latestMoodLog?.energy || 3;
    const winCount = todayWins?.length || 0;

    // Select message based on mood
    const messages = moodMessages[mood] || moodMessages[3];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Determine icon and color based on mood/energy
    let icon = timeData.icon;
    let color = 'text-slate-400';

    if (mood >= 4 || energy >= 4) {
      icon = Zap;
      color = 'text-amber-400';
    } else if (mood <= 2 || energy <= 2) {
      icon = Heart;
      color = 'text-rose-400';
    } else if (winCount > 0) {
      icon = Sparkles;
      color = 'text-emerald-400';
    }

    // Add win celebration to message
    let finalMessage = randomMessage;
    if (winCount > 0) {
      finalMessage = `${winCount} win${winCount > 1 ? 's' : ''} logged today! ${randomMessage}`;
    }

    return {
      greeting: timeData.text,
      message: finalMessage,
      icon,
      color,
    };
  }, [latestMoodLog, todayWins, timeOfDay]);

  const Icon = greeting.icon;
  const energySuggestion = latestMoodLog ? energySuggestions[latestMoodLog.energy] : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={`w-6 h-6 ${greeting.color}`} />
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          {greeting.greeting}
        </h1>
      </div>
      <p className="text-slate-400">{greeting.message}</p>
      {energySuggestion && latestMoodLog && (
        <p className="text-xs text-indigo-400 flex items-center gap-1 mt-1">
          <Coffee className="w-3 h-3" />
          {energySuggestion}
        </p>
      )}
    </div>
  );
}

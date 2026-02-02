import { useState, useRef, useEffect } from 'react';
import { Trophy, Plus, X, Sparkles } from 'lucide-react';
import { addWin, useTodayWins, getWinStreak } from '../../hooks/useDatabase';
import type { Win } from '../../hooks/useDatabase';

const categories: { value: Win['category']; label: string; emoji: string }[] = [
  { value: 'task', label: 'Task', emoji: '✅' },
  { value: 'focus', label: 'Focus', emoji: '🎯' },
  { value: 'habit', label: 'Habit', emoji: '🔄' },
  { value: 'milestone', label: 'Milestone', emoji: '🏆' },
  { value: 'personal', label: 'Personal', emoji: '💪' },
];

const quickWinSuggestions = [
  "Got out of bed",
  "Replied to that message",
  "Started the task I was avoiding",
  "Drank water",
  "Took my meds",
  "Didn't impulse buy",
  "Asked for help",
  "Said no to something",
  "Showed up even when tired",
];

export function QuickWin() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Win['category']>('personal');
  const [showCelebration, setShowCelebration] = useState(false);
  const [winStreak, setWinStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const todayWins = useTodayWins();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      getWinStreak().then(setWinStreak);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addWin({
      title: title.trim(),
      category,
      celebrationLevel: 1,
      timestamp: new Date(),
    });

    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      setIsOpen(false);
      setTitle('');
      setCategory('personal');
    }, 1500);
  };

  const handleQuickAdd = async (suggestion: string) => {
    await addWin({
      title: suggestion,
      category: 'personal',
      celebrationLevel: 1,
      timestamp: new Date(),
    });

    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      setIsOpen(false);
    }, 1500);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-6 left-4 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg hover:shadow-amber-500/25 flex items-center justify-center transition-all group"
        title="Log a Win!"
      >
        <Trophy className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        {todayWins && todayWins.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full text-xs text-white font-bold flex items-center justify-center">
            {todayWins.length}
          </span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Celebration overlay */}
            {showCelebration && (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center z-10">
                <div className="text-center animate-in zoom-in duration-200">
                  <Sparkles className="w-16 h-16 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">Win Logged!</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Log a Win</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="px-4 py-3 bg-slate-800/50 flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Today: <span className="text-amber-400 font-medium">{todayWins?.length || 0} wins</span>
              </span>
              {winStreak > 0 && (
                <span className="text-slate-400">
                  Streak: <span className="text-emerald-400 font-medium">{winStreak} days</span>
                </span>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What did you accomplish?"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      category === cat.value
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!title.trim()}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Log Win
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="px-4 pb-4">
              <p className="text-xs text-slate-500 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {quickWinSuggestions.slice(0, 6).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleQuickAdd(suggestion)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-300 text-xs rounded-md transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

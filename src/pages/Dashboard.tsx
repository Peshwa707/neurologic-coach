import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckSquare,
  Brain,
  Shield,
  Heart,
  Mic,
  TrendingUp,
  Zap,
  Target,
  Smile,
  Key,
  X,
  Check,
} from 'lucide-react';
import { Card, CardHeader } from '../components/common';
import { useTasks, useTodayPomodoros, useRecentMoodLogs, getWeeklyStats, useSettings, updateSettings } from '../hooks/useDatabase';

interface WeeklyStats {
  completedTasks: number;
  totalPomodoros: number;
  totalFocusMinutes: number;
  avgMood: number;
  avgEnergy: number;
  moodLogs: number;
}

export function Dashboard() {
  const tasks = useTasks('pending');
  const todayPomodoros = useTodayPomodoros();
  const recentMoods = useRecentMoodLogs(5);
  const settings = useSettings();
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getWeeklyStats().then(setWeeklyStats);
  }, []);

  const handleSaveApiKey = async () => {
    await updateSettings({ apiKey });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowApiKeyInput(false);
    }, 1500);
  };

  const quickActions = [
    { to: '/time', icon: Clock, label: 'Start Timer', color: 'from-blue-500 to-cyan-500' },
    { to: '/tasks', icon: CheckSquare, label: 'Add Task', color: 'from-emerald-500 to-teal-500' },
    { to: '/awareness', icon: Brain, label: 'Log Mood', color: 'from-purple-500 to-pink-500' },
    { to: '/voice', icon: Mic, label: 'Voice Dump', color: 'from-orange-500 to-red-500' },
  ];

  const moodEmojis = ['😢', '😕', '😐', '🙂', '😊'];
  const energyEmojis = ['😴', '🥱', '😌', '⚡', '🔥'];

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      {/* API Key Setup Banner - Shows when no API key */}
      {!settings?.apiKey && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Setup Required</h3>
              <p className="text-amber-100 text-sm mt-1">
                Add your Claude API key to enable AI coaching features
              </p>

              {!showApiKeyInput ? (
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="mt-3 px-4 py-2 bg-white text-amber-600 font-medium rounded-lg hover:bg-amber-50 transition-colors"
                >
                  Add API Key
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-amber-200 focus:outline-none focus:border-white"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!apiKey.trim()}
                      className="flex-1 py-2 bg-white text-amber-600 font-medium rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {saved ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                      {saved ? 'Saved!' : 'Save'}
                    </button>
                    <button
                      onClick={() => setShowApiKeyInput(false)}
                      className="px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-amber-200">
                    Get your key at console.anthropic.com
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Welcome Back
        </h1>
        <p className="text-slate-400 mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link key={action.to} to={action.to}>
            <Card hoverable className="h-full">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-medium text-white">{action.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{weeklyStats?.completedTasks || 0}</p>
              <p className="text-xs text-slate-400">Tasks Done</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{todayPomodoros?.filter(p => p.type === 'work').length || 0}</p>
              <p className="text-xs text-slate-400">Pomodoros Today</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Smile className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {weeklyStats?.avgMood ? moodEmojis[Math.round(weeklyStats.avgMood) - 1] : '—'}
              </p>
              <p className="text-xs text-slate-400">Avg Mood</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{weeklyStats?.totalFocusMinutes || 0}m</p>
              <p className="text-xs text-slate-400">Focus Time</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Pending Tasks */}
        <Card>
          <CardHeader
            title="Pending Tasks"
            subtitle={`${tasks?.length || 0} tasks waiting`}
            action={
              <Link to="/tasks" className="text-sm text-indigo-400 hover:text-indigo-300">
                View all
              </Link>
            }
          />
          <div className="space-y-2">
            {tasks?.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50"
              >
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <p className="text-sm text-slate-300 truncate flex-1">{task.title}</p>
                {task.deadline && (
                  <span className="text-xs text-slate-500">
                    {new Date(task.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
            {(!tasks || tasks.length === 0) && (
              <p className="text-slate-500 text-sm text-center py-4">No pending tasks</p>
            )}
          </div>
        </Card>

        {/* Recent Moods */}
        <Card>
          <CardHeader
            title="Recent Moods"
            subtitle="How you've been feeling"
            action={
              <Link to="/awareness" className="text-sm text-indigo-400 hover:text-indigo-300">
                Log mood
              </Link>
            }
          />
          <div className="space-y-2">
            {recentMoods?.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{moodEmojis[log.mood - 1]}</span>
                  <span className="text-xl">{energyEmojis[log.energy - 1]}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(log.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(!recentMoods || recentMoods.length === 0) && (
              <p className="text-slate-500 text-sm text-center py-4">No mood logs yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/inhibition">
          <Card hoverable>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">Impulse Control</h3>
            </div>
            <p className="text-sm text-slate-400">
              Feeling an urge? Use the pause timer before acting.
            </p>
          </Card>
        </Link>

        <Link to="/emotional">
          <Card hoverable>
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-5 h-5 text-rose-400" />
              <h3 className="font-semibold text-white">Need to Calm Down?</h3>
            </div>
            <p className="text-sm text-slate-400">
              Try a breathing exercise or grounding technique.
            </p>
          </Card>
        </Link>

        <Link to="/voice">
          <Card hoverable>
            <div className="flex items-center gap-3 mb-2">
              <Mic className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-white">Racing Thoughts?</h3>
            </div>
            <p className="text-sm text-slate-400">
              Voice dump your thoughts for AI analysis.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

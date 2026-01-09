import { useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { Card, CardHeader, Button, Textarea, Modal, VoiceInput } from '../components/common';
import type { VoiceLanguageCode } from '../components/common';
import { useMoodLogs, addMoodLog, useSettings } from '../hooks/useDatabase';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Very Low' },
  { value: 2, emoji: '😕', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
];

const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Exhausted' },
  { value: 2, emoji: '🥱', label: 'Low' },
  { value: 3, emoji: '😌', label: 'Moderate' },
  { value: 4, emoji: '⚡', label: 'Energized' },
  { value: 5, emoji: '🔥', label: 'High Energy' },
];

const COMMON_TRIGGERS = [
  'Poor sleep', 'Work stress', 'Social interaction', 'Exercise',
  'Conflict', 'Achievement', 'Weather', 'Diet', 'Medication',
  'Deadline', 'Rejection', 'Good news', 'Bad news', 'Boredom',
];

export function AwarenessPage() {
  const moodLogs = useMoodLogs(30);
  const settings = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newLog, setNewLog] = useState({
    mood: 3,
    energy: 3,
    notes: '',
    triggers: [] as string[],
  });

  const handleAddLog = async () => {
    await addMoodLog({
      mood: newLog.mood,
      energy: newLog.energy,
      notes: newLog.notes || undefined,
      triggers: newLog.triggers.length > 0 ? newLog.triggers : undefined,
      timestamp: new Date(),
    });

    setIsModalOpen(false);
    setNewLog({ mood: 3, energy: 3, notes: '', triggers: [] });
  };

  const toggleTrigger = (trigger: string) => {
    setNewLog(prev => ({
      ...prev,
      triggers: prev.triggers.includes(trigger)
        ? prev.triggers.filter(t => t !== trigger)
        : [...prev.triggers, trigger],
    }));
  };

  const chartData = moodLogs?.map(log => ({
    date: format(new Date(log.timestamp), 'MMM d'),
    mood: log.mood,
    energy: log.energy,
  })).reverse() || [];

  // Calculate averages
  const avgMood = moodLogs && moodLogs.length > 0
    ? (moodLogs.reduce((sum, l) => sum + l.mood, 0) / moodLogs.length).toFixed(1)
    : '—';
  const avgEnergy = moodLogs && moodLogs.length > 0
    ? (moodLogs.reduce((sum, l) => sum + l.energy, 0) / moodLogs.length).toFixed(1)
    : '—';

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Self-Awareness</h1>
          <p className="text-slate-400 mt-1">Track mood, energy, and patterns</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Log Now
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <p className="text-sm text-slate-400">Avg Mood (30d)</p>
          <p className="text-2xl font-bold text-white">{avgMood}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Avg Energy (30d)</p>
          <p className="text-2xl font-bold text-white">{avgEnergy}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Total Logs</p>
          <p className="text-2xl font-bold text-white">{moodLogs?.length || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">This Week</p>
          <p className="text-2xl font-bold text-white">
            {moodLogs?.filter(l => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(l.timestamp) > weekAgo;
            }).length || 0}
          </p>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader
            title="Mood & Energy Trends"
            subtitle="Last 30 days"
            action={<TrendingUp className="w-5 h-5 text-slate-400" />}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1' }}
                  name="Mood"
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                  name="Energy"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader title="Recent Check-ins" subtitle="Your mood history" />
        <div className="space-y-3">
          {moodLogs?.slice(0, 10).map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 p-3 rounded-lg bg-slate-800/50"
            >
              <div className="flex gap-2 text-2xl">
                <span>{MOOD_OPTIONS[log.mood - 1].emoji}</span>
                <span>{ENERGY_OPTIONS[log.energy - 1].emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    Mood: {MOOD_OPTIONS[log.mood - 1].label}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-sm text-slate-400">
                    Energy: {ENERGY_OPTIONS[log.energy - 1].label}
                  </span>
                </div>
                {log.notes && (
                  <p className="text-sm text-slate-300 mt-1">{log.notes}</p>
                )}
                {log.triggers && log.triggers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {log.triggers.map((trigger) => (
                      <span
                        key={trigger}
                        className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300"
                      >
                        {trigger}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-500">
                {format(new Date(log.timestamp), 'MMM d, h:mm a')}
              </span>
            </div>
          ))}

          {(!moodLogs || moodLogs.length === 0) && (
            <p className="text-slate-500 text-center py-8">
              No mood logs yet. Start tracking to see patterns!
            </p>
          )}
        </div>
      </Card>

      {/* Log Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="How are you feeling?"
        size="lg"
      >
        <div className="space-y-6">
          {/* Mood Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Mood</label>
            <div className="flex justify-between">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setNewLog({ ...newLog, mood: option.value })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                    newLog.mood === option.value
                      ? 'bg-indigo-600/20 ring-2 ring-indigo-500'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <span className="text-3xl">{option.emoji}</span>
                  <span className="text-xs text-slate-400">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Energy</label>
            <div className="flex justify-between">
              {ENERGY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setNewLog({ ...newLog, energy: option.value })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                    newLog.energy === option.value
                      ? 'bg-emerald-600/20 ring-2 ring-emerald-500'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <span className="text-3xl">{option.emoji}</span>
                  <span className="text-xs text-slate-400">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Triggers */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Any triggers? (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TRIGGERS.map((trigger) => (
                <button
                  key={trigger}
                  onClick={() => toggleTrigger(trigger)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                    newLog.triggers.includes(trigger)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {trigger}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes (optional)</label>
            <div className="flex gap-2">
              <Textarea
                placeholder="What's on your mind?"
                rows={3}
                value={newLog.notes}
                onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                className="flex-1"
              />
              <VoiceInput
                onTranscript={(text) => setNewLog({ ...newLog, notes: newLog.notes + ' ' + text })}
                compact
                placeholder="Speak notes"
                language={(settings?.voiceLanguage || 'en-US') as VoiceLanguageCode}
              />
            </div>
          </div>

          <Button onClick={handleAddLog} className="w-full">
            Save Check-in
          </Button>
        </div>
      </Modal>
    </div>
  );
}

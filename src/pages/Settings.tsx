import { useState, useEffect } from 'react';
import { Save, Key, Clock, Download, Upload, Trash2, Languages, Sparkles, Bell, BarChart3, Volume2 } from 'lucide-react';
import { Card, CardHeader, Button, Input, VOICE_LANGUAGES } from '../components/common';
import { useSettings, updateSettings } from '../hooks/useDatabase';
import { db } from '../db/database';

// Test chime function
function playTestChime() {
  const CHIME_FREQUENCIES = [523.25, 659.25, 783.99];
  try {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    CHIME_FREQUENCIES.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      const startTime = audioContext.currentTime + (index * 0.1);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);
      oscillator.start(startTime);
      oscillator.stop(startTime + 1.5);
    });
  } catch (error) {
    console.warn('Could not play chime:', error);
  }
}

export function Settings() {
  const settings = useSettings();
  const [apiKey, setApiKey] = useState('');
  const [pomodoroWork, setPomodoroWork] = useState(25);
  const [pomodoroBreak, setPomodoroBreak] = useState(5);
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [zenMode, setZenMode] = useState(false);
  const [chimeInterval, setChimeInterval] = useState(0);
  const [showRollingStats, setShowRollingStats] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setApiKey(settings.apiKey || '');
      setPomodoroWork(settings.pomodoroWork || 25);
      setPomodoroBreak(settings.pomodoroBreak || 5);
      setVoiceLanguage(settings.voiceLanguage || 'en-US');
      setZenMode(settings.zenMode || false);
      setChimeInterval(settings.chimeInterval || 0);
      setShowRollingStats(settings.showRollingStats !== false);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings({
      apiKey,
      pomodoroWork,
      pomodoroBreak,
      voiceLanguage,
      zenMode,
      chimeInterval,
      showRollingStats,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    const data = {
      tasks: await db.tasks.toArray(),
      timeBlocks: await db.timeBlocks.toArray(),
      pomodoroSessions: await db.pomodoroSessions.toArray(),
      moodLogs: await db.moodLogs.toArray(),
      thoughtDumps: await db.thoughtDumps.toArray(),
      impulseLogs: await db.impulseLogs.toArray(),
      journalEntries: await db.journalEntries.toArray(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neurologic-coach-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.tasks) await db.tasks.bulkPut(data.tasks);
        if (data.timeBlocks) await db.timeBlocks.bulkPut(data.timeBlocks);
        if (data.pomodoroSessions) await db.pomodoroSessions.bulkPut(data.pomodoroSessions);
        if (data.moodLogs) await db.moodLogs.bulkPut(data.moodLogs);
        if (data.thoughtDumps) await db.thoughtDumps.bulkPut(data.thoughtDumps);
        if (data.impulseLogs) await db.impulseLogs.bulkPut(data.impulseLogs);
        if (data.journalEntries) await db.journalEntries.bulkPut(data.journalEntries);

        alert('Data imported successfully!');
      } catch {
        alert('Failed to import data. Please check the file format.');
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      await Promise.all([
        db.tasks.clear(),
        db.timeBlocks.clear(),
        db.pomodoroSessions.clear(),
        db.moodLogs.clear(),
        db.thoughtDumps.clear(),
        db.impulseLogs.clear(),
        db.journalEntries.clear(),
      ]);
      alert('All data has been cleared.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure your preferences</p>
      </div>

      {/* API Key */}
      <Card>
        <CardHeader
          title="AI Analysis"
          subtitle="Configure Claude API for cognitive analysis and coaching"
        />
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-slate-400 mt-2" />
            <div className="flex-1">
              <Input
                type="password"
                label="Anthropic API Key"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-2">
                Your API key is stored locally and never sent to our servers.
                Get one at{' '}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  console.anthropic.com
                </a>
              </p>
              <p className="text-xs text-indigo-400 mt-1">
                Using Claude Opus 4 with extended thinking for deeper insights.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Pomodoro Settings */}
      <Card>
        <CardHeader
          title="Pomodoro Timer"
          subtitle="Customize your work and break intervals"
        />
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-400" />
            <div className="flex-1 grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Work Duration (min)"
                value={pomodoroWork}
                onChange={(e) => setPomodoroWork(Number(e.target.value))}
                min={1}
                max={60}
              />
              <Input
                type="number"
                label="Break Duration (min)"
                value={pomodoroBreak}
                onChange={(e) => setPomodoroBreak(Number(e.target.value))}
                min={1}
                max={30}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Voice Language Settings */}
      <Card>
        <CardHeader
          title="Voice Recognition"
          subtitle="Select your preferred language for voice input"
        />
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Languages className="w-5 h-5 text-slate-400 mt-2" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Voice Input Language
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VOICE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setVoiceLanguage(lang.code)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                      voiceLanguage === lang.code
                        ? 'border-indigo-500 bg-indigo-500/20 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="font-medium">{lang.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This language will be used for all voice-to-text features throughout the app.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ADHD-Focused Settings */}
      <Card>
        <CardHeader
          title="Focus & Awareness"
          subtitle="ADHD-friendly features to support your workflow"
        />
        <div className="space-y-6">
          {/* Zen Mode */}
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Zen Mode Dashboard
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Minimal view - just your current task and timer
                  </p>
                </div>
                <button
                  onClick={() => setZenMode(!zenMode)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    zenMode ? 'bg-purple-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      zenMode ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Time Anchoring Chimes */}
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  Time Anchoring Chimes
                </label>
                <button
                  onClick={playTestChime}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded transition-colors"
                >
                  <Volume2 className="w-3 h-3" />
                  Test
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Gentle reminders to stay aware of passing time
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { value: 0, label: 'Off' },
                  { value: 15, label: '15m' },
                  { value: 30, label: '30m' },
                  { value: 60, label: '1hr' },
                  { value: 120, label: '2hr' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setChimeInterval(option.value)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      chimeInterval === option.value
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rolling Stats */}
          <div className="flex items-start gap-3">
            <BarChart3 className="w-5 h-5 text-emerald-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Rolling Window Stats
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Show "3 of 5 days" instead of streaks (less shame, more reality)
                  </p>
                </div>
                <button
                  onClick={() => setShowRollingStats(!showRollingStats)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    showRollingStats ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      showRollingStats ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full">
        <Save className="w-4 h-4" />
        {saved ? 'Saved!' : 'Save Settings'}
      </Button>

      {/* Data Management */}
      <Card>
        <CardHeader
          title="Data Management"
          subtitle="Export, import, or clear your data"
        />
        <div className="space-y-3">
          <Button variant="secondary" onClick={handleExport} className="w-full">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
          <Button variant="secondary" onClick={handleImport} className="w-full">
            <Upload className="w-4 h-4" />
            Import Data
          </Button>
          <Button variant="danger" onClick={handleClearData} className="w-full">
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </Button>
        </div>
      </Card>

      {/* About */}
      <Card>
        <CardHeader title="About" subtitle="NeuroLogic Coach v1.0.0" />
        <p className="text-sm text-slate-400">
          An AI-powered cognitive wellness assistant to help with time management, task initiation,
          self-awareness, impulse control, and emotional regulation. All data is stored
          locally on your device.
        </p>
      </Card>

      {/* Disclaimer */}
      <Card className="border-amber-900/50 bg-amber-950/20">
        <CardHeader title="Disclaimer" subtitle="Important information" />
        <div className="space-y-3 text-sm text-slate-400">
          <p>
            <strong className="text-amber-400">NeuroLogic Coach is not a substitute for professional medical advice,
            diagnosis, or treatment.</strong>
          </p>
          <p>
            This application is designed as a self-help tool and should not be used as a replacement
            for therapy, counseling, or medical care. The AI-powered cognitive analysis is intended
            for educational and self-reflection purposes only.
          </p>
          <p>
            <strong className="text-slate-300">Limitation of Liability:</strong> The developers and
            providers of NeuroLogic Coach accept no responsibility or liability for any actions taken
            or decisions made by users based on the information, suggestions, or analysis provided
            by this application. Users are solely responsible for their own actions and any
            consequences that may result from using this tool.
          </p>
          <p>
            If you are experiencing a mental health crisis, please contact a mental health professional
            or emergency services immediately.
          </p>
        </div>
      </Card>
    </div>
  );
}

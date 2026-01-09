import { useState, useEffect } from 'react';
import { Play, RotateCcw, Check, X, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, Button, Input, Textarea, Modal, CircularProgress, VoiceInput } from '../components/common';
import type { VoiceLanguageCode } from '../components/common';
import { useImpulseLogs, addImpulseLog, useSettings } from '../hooks/useDatabase';
import { format } from 'date-fns';

const PAUSE_DURATION = 600; // 10 minutes in seconds

export function InhibitionPage() {
  const impulseLogs = useImpulseLogs(20);
  const settings = useSettings();
  const [isPauseActive, setIsPauseActive] = useState(false);
  const [pauseTimeLeft, setPauseTimeLeft] = useState(PAUSE_DURATION);
  const [currentUrge, setCurrentUrge] = useState('');
  const [urgeIntensity, setUrgeIntensity] = useState(5);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [outcome, setOutcome] = useState<'resisted' | 'acted' | 'modified' | null>(null);
  const [reflection, setReflection] = useState('');

  // Decision Matrix state
  const [decisionTopic, setDecisionTopic] = useState('');
  const [pros, setPros] = useState<string[]>(['']);
  const [cons, setCons] = useState<string[]>(['']);

  useEffect(() => {
    let interval: number | null = null;

    if (isPauseActive && pauseTimeLeft > 0) {
      interval = window.setInterval(() => {
        setPauseTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (pauseTimeLeft === 0 && isPauseActive) {
      // Timer complete
      setIsPauseActive(false);
      setIsModalOpen(true);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPauseActive, pauseTimeLeft]);

  const startPause = () => {
    if (!currentUrge.trim()) return;
    setIsPauseActive(true);
    setPauseTimeLeft(PAUSE_DURATION);
  };

  const resetPause = () => {
    setIsPauseActive(false);
    setPauseTimeLeft(PAUSE_DURATION);
    setCurrentUrge('');
    setUrgeIntensity(5);
  };

  const handleLogOutcome = async () => {
    if (!outcome) return;

    await addImpulseLog({
      urge: currentUrge,
      intensity: urgeIntensity,
      waited: true,
      waitDuration: PAUSE_DURATION - pauseTimeLeft,
      outcome,
      reflection: reflection || undefined,
      timestamp: new Date(),
    });

    setIsModalOpen(false);
    setOutcome(null);
    setReflection('');
    resetPause();
  };

  const handleActedImmediately = async () => {
    await addImpulseLog({
      urge: currentUrge,
      intensity: urgeIntensity,
      waited: false,
      outcome: 'acted',
      timestamp: new Date(),
    });
    resetPause();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((PAUSE_DURATION - pauseTimeLeft) / PAUSE_DURATION) * 100;

  const resistedCount = impulseLogs?.filter(l => l.outcome === 'resisted').length || 0;
  const totalCount = impulseLogs?.length || 0;
  const resistRate = totalCount > 0 ? Math.round((resistedCount / totalCount) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Self-Inhibition</h1>
        <p className="text-slate-400 mt-1">Pause before acting on impulses</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Impulse Pause Timer */}
        <Card>
          <CardHeader
            title="Impulse Pause Timer"
            subtitle="Wait 10 minutes before acting"
          />

          <div className="text-center space-y-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="What's the urge? (e.g., 'Buy something online')"
                  value={currentUrge}
                  onChange={(e) => setCurrentUrge(e.target.value)}
                  disabled={isPauseActive}
                  className="flex-1"
                />
                <VoiceInput
                  onTranscript={(text) => setCurrentUrge(text)}
                  compact
                  placeholder="Speak urge"
                  language={(settings?.voiceLanguage || 'en-US') as VoiceLanguageCode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Intensity: {urgeIntensity}/10
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={urgeIntensity}
                  onChange={(e) => setUrgeIntensity(Number(e.target.value))}
                  disabled={isPauseActive}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <CircularProgress
              value={progress}
              size={180}
              strokeWidth={8}
              color={isPauseActive ? '#f59e0b' : '#6366f1'}
            >
              <div>
                <p className="text-3xl font-bold text-white font-mono">
                  {formatTime(pauseTimeLeft)}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {isPauseActive ? 'Wait...' : 'Ready'}
                </p>
              </div>
            </CircularProgress>

            <div className="flex justify-center gap-3">
              {!isPauseActive ? (
                <Button
                  size="lg"
                  onClick={startPause}
                  disabled={!currentUrge.trim()}
                >
                  <Play className="w-5 h-5" />
                  Start Pause
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="secondary" onClick={resetPause}>
                    <RotateCcw className="w-5 h-5" />
                    Reset
                  </Button>
                  <Button
                    size="lg"
                    variant="danger"
                    onClick={handleActedImmediately}
                  >
                    I Acted Anyway
                  </Button>
                </>
              )}
            </div>

            {isPauseActive && (
              <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                <p className="text-amber-200 text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Sit with the discomfort. The urge will pass. You're stronger than this impulse.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Stats & History */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <p className="text-2xl font-bold text-white">{resistedCount}</p>
              <p className="text-xs text-slate-400">Resisted</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold text-white">{totalCount}</p>
              <p className="text-xs text-slate-400">Total</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold text-emerald-400">{resistRate}%</p>
              <p className="text-xs text-slate-400">Success Rate</p>
            </Card>
          </div>

          {/* Decision Matrix */}
          <Card>
            <CardHeader
              title="Decision Matrix"
              subtitle="Weigh pros and cons"
            />
            <div className="space-y-4">
              <Input
                placeholder="What decision are you facing?"
                value={decisionTopic}
                onChange={(e) => setDecisionTopic(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-400 mb-2">
                    Pros
                  </label>
                  {pros.map((pro, i) => (
                    <Input
                      key={i}
                      placeholder={`Pro ${i + 1}`}
                      value={pro}
                      onChange={(e) => {
                        const newPros = [...pros];
                        newPros[i] = e.target.value;
                        setPros(newPros);
                      }}
                      className="mb-2"
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPros([...pros, ''])}
                  >
                    + Add Pro
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-400 mb-2">
                    Cons
                  </label>
                  {cons.map((con, i) => (
                    <Input
                      key={i}
                      placeholder={`Con ${i + 1}`}
                      value={con}
                      onChange={(e) => {
                        const newCons = [...cons];
                        newCons[i] = e.target.value;
                        setCons(newCons);
                      }}
                      className="mb-2"
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCons([...cons, ''])}
                  >
                    + Add Con
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Logs */}
          <Card>
            <CardHeader title="Recent Impulse Logs" />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {impulseLogs?.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      log.outcome === 'resisted' ? 'bg-emerald-400' :
                      log.outcome === 'modified' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <span className="text-sm text-slate-300 truncate max-w-[150px]">
                      {log.urge}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {format(new Date(log.timestamp), 'MMM d')}
                  </span>
                </div>
              ))}
              {(!impulseLogs || impulseLogs.length === 0) && (
                <p className="text-slate-500 text-sm text-center py-4">
                  No impulse logs yet
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Outcome Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Time's Up! What happened?"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-slate-400">
            You waited for the full pause. How do you feel about the urge now?
          </p>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setOutcome('resisted')}
              className={`p-4 rounded-lg border-2 transition-all ${
                outcome === 'resisted'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-white">Resisted</p>
              <p className="text-xs text-slate-400">Urge passed</p>
            </button>

            <button
              onClick={() => setOutcome('modified')}
              className={`p-4 rounded-lg border-2 transition-all ${
                outcome === 'modified'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-white">Modified</p>
              <p className="text-xs text-slate-400">Compromised</p>
            </button>

            <button
              onClick={() => setOutcome('acted')}
              className={`p-4 rounded-lg border-2 transition-all ${
                outcome === 'acted'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-white">Acted</p>
              <p className="text-xs text-slate-400">Did it anyway</p>
            </button>
          </div>

          <Textarea
            label="Reflection (optional)"
            placeholder="What did you learn? How did the wait affect your decision?"
            rows={3}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />

          <Button onClick={handleLogOutcome} className="w-full" disabled={!outcome}>
            Save & Continue
          </Button>
        </div>
      </Modal>
    </div>
  );
}

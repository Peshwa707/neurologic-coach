import { useState, useEffect } from 'react';
import { X, Maximize2, VolumeX, Quote } from 'lucide-react';
import { usePomodoroOptional } from '../../contexts/PomodoroContext';

const focusQuotes = [
  "The secret of getting ahead is getting started.",
  "You don't have to be great to start, but you have to start to be great.",
  "Progress, not perfection.",
  "One task at a time. One moment at a time.",
  "Your focus determines your reality.",
  "Start where you are. Use what you have. Do what you can.",
  "The best time to start was yesterday. The next best time is now.",
  "Small steps still move you forward.",
  "You are capable of more than you know.",
  "Every expert was once a beginner.",
];

const ambientSounds = [
  { id: 'none', label: 'None', icon: VolumeX },
  { id: 'rain', label: 'Rain', frequency: 200 },
  { id: 'waves', label: 'Waves', frequency: 150 },
  { id: 'forest', label: 'Forest', frequency: 300 },
];

export function FocusMode() {
  const pomodoro = usePomodoroOptional();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(focusQuotes[0]);
  const [ambientSound, setAmbientSound] = useState('none');
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);

  // Only show when timer is running in work mode
  const shouldShow = pomodoro?.isRunning && pomodoro?.isWorkSession;

  useEffect(() => {
    if (shouldShow) {
      setCurrentQuote(focusQuotes[Math.floor(Math.random() * focusQuotes.length)]);
    }
  }, [shouldShow]);

  // Handle ambient sound
  useEffect(() => {
    if (ambientSound === 'none') {
      if (oscillator) {
        oscillator.stop();
        setOscillator(null);
      }
      return;
    }

    const selectedSound = ambientSounds.find(s => s.id === ambientSound);
    if (!selectedSound || !('frequency' in selectedSound)) return;

    const ctx = audioContext || new AudioContext();
    if (!audioContext) setAudioContext(ctx);

    // Create a gentle noise generator
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(selectedSound.frequency!, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.03, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    setOscillator(osc);

    return () => {
      osc.stop();
    };
  }, [ambientSound, audioContext, oscillator]);

  const handleEnterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const handleExitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!shouldShow || !isFullscreen) {
    // Show enter fullscreen button when timer is running
    if (shouldShow) {
      return (
        <button
          onClick={handleEnterFullscreen}
          className="fixed top-4 right-4 z-40 p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-xl shadow-lg transition-colors flex items-center gap-2 text-slate-300 hover:text-white"
          title="Enter Focus Mode"
        >
          <Maximize2 className="w-5 h-5" />
          <span className="text-sm font-medium hidden md:inline">Focus Mode</span>
        </button>
      );
    }
    return null;
  }

  const progress = pomodoro?.progress || 0;

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center">
      {/* Exit button */}
      <button
        onClick={handleExitFullscreen}
        className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Ambient sound controls */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        {ambientSounds.map((sound) => (
          <button
            key={sound.id}
            onClick={() => setAmbientSound(sound.id)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              ambientSound === sound.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            {sound.id === 'none' ? <VolumeX className="w-4 h-4" /> : sound.label}
          </button>
        ))}
      </div>

      {/* Main timer */}
      <div className="text-center">
        {/* Progress ring */}
        <div className="relative w-80 h-80 mx-auto mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r="150"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-slate-800"
            />
            <circle
              cx="160"
              cy="160"
              r="150"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 150}
              strokeDashoffset={2 * Math.PI * 150 * (1 - progress / 100)}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>

          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-8xl font-mono font-bold text-white tracking-tight">
              {formatTime(pomodoro?.timeLeft || 0)}
            </p>
            <p className="text-lg text-indigo-400 mt-2">Focus Time</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mb-12">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{pomodoro?.todayWorkSessions || 0}</p>
            <p className="text-sm text-slate-500">Sessions</p>
          </div>
          <div className="w-px h-12 bg-slate-700" />
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{pomodoro?.todayFocusMinutes || 0}m</p>
            <p className="text-sm text-slate-500">Focus Today</p>
          </div>
        </div>

        {/* Motivational quote */}
        <div className="max-w-lg mx-auto px-8">
          <div className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <Quote className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-1" />
            <p className="text-slate-300 italic leading-relaxed">{currentQuote}</p>
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <p className="absolute bottom-6 text-sm text-slate-600">
        Press Escape or click X to exit Focus Mode
      </p>
    </div>
  );
}

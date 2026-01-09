import { useState, useEffect } from 'react';
import { Wind, Eye, Heart, Star, Play, Pause, RotateCcw } from 'lucide-react';
import { Card, CardHeader, Button } from '../components/common';
import { useCopingStrategies, incrementStrategyUsage, updateCopingStrategy } from '../hooks/useDatabase';

type BreathingPattern = {
  name: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
  description: string;
};

const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    name: 'Box Breathing',
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4,
    description: 'Used by Navy SEALs to calm under pressure',
  },
  {
    name: '4-7-8 Relaxing',
    inhale: 4,
    hold1: 7,
    exhale: 8,
    hold2: 0,
    description: 'Promotes sleep and deep relaxation',
  },
  {
    name: 'Calming Breath',
    inhale: 4,
    hold1: 2,
    exhale: 6,
    hold2: 0,
    description: 'Quick anxiety relief',
  },
];

export function EmotionalPage() {
  const copingStrategies = useCopingStrategies();
  const [selectedPattern, setSelectedPattern] = useState(BREATHING_PATTERNS[0]);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [phaseTime, setPhaseTime] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);

  // Grounding exercise state
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingResponses, setGroundingResponses] = useState<string[]>([]);
  const [isGroundingActive, setIsGroundingActive] = useState(false);

  const GROUNDING_PROMPTS = [
    { count: 5, sense: 'SEE', prompt: 'Name 5 things you can SEE right now' },
    { count: 4, sense: 'TOUCH', prompt: 'Name 4 things you can TOUCH or feel' },
    { count: 3, sense: 'HEAR', prompt: 'Name 3 things you can HEAR' },
    { count: 2, sense: 'SMELL', prompt: 'Name 2 things you can SMELL' },
    { count: 1, sense: 'TASTE', prompt: 'Name 1 thing you can TASTE' },
  ];

  // Breathing exercise logic
  useEffect(() => {
    if (!isBreathing) return;

    const phases: Array<'inhale' | 'hold1' | 'exhale' | 'hold2'> = ['inhale', 'hold1', 'exhale', 'hold2'];
    const durations = [
      selectedPattern.inhale,
      selectedPattern.hold1,
      selectedPattern.exhale,
      selectedPattern.hold2,
    ];

    const currentPhaseIndex = phases.indexOf(breathPhase);
    const currentDuration = durations[currentPhaseIndex];

    if (currentDuration === 0) {
      // Skip phases with 0 duration
      const nextPhaseIndex = (currentPhaseIndex + 1) % 4;
      if (nextPhaseIndex === 0) setCycleCount(c => c + 1);
      setBreathPhase(phases[nextPhaseIndex]);
      setPhaseTime(0);
      return;
    }

    const timer = setInterval(() => {
      setPhaseTime((prev) => {
        if (prev >= currentDuration) {
          const nextPhaseIndex = (currentPhaseIndex + 1) % 4;
          if (nextPhaseIndex === 0) setCycleCount(c => c + 1);
          setBreathPhase(phases[nextPhaseIndex]);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isBreathing, breathPhase, selectedPattern]);

  const resetBreathing = () => {
    setIsBreathing(false);
    setBreathPhase('inhale');
    setPhaseTime(0);
    setCycleCount(0);
  };

  const getPhaseInstruction = () => {
    switch (breathPhase) {
      case 'inhale': return 'Breathe In';
      case 'hold1': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'hold2': return 'Hold';
    }
  };

  const getCurrentPhaseDuration = () => {
    switch (breathPhase) {
      case 'inhale': return selectedPattern.inhale;
      case 'hold1': return selectedPattern.hold1;
      case 'exhale': return selectedPattern.exhale;
      case 'hold2': return selectedPattern.hold2;
    }
  };

  const getBreathCircleSize = () => {
    const duration = getCurrentPhaseDuration();
    if (duration === 0) return 100;

    const progress = phaseTime / duration;

    if (breathPhase === 'inhale') {
      return 60 + progress * 80; // 60 to 140
    } else if (breathPhase === 'exhale') {
      return 140 - progress * 80; // 140 to 60
    }
    return breathPhase === 'hold1' ? 140 : 60; // Hold at current size
  };

  const startGrounding = () => {
    setIsGroundingActive(true);
    setGroundingStep(0);
    setGroundingResponses([]);
  };

  const handleUseStrategy = async (id: number) => {
    await incrementStrategyUsage(id);
  };

  const handleToggleFavorite = async (id: number, current: boolean) => {
    await updateCopingStrategy(id, { isFavorite: !current });
  };

  const otherStrategies = copingStrategies?.filter(s => !['breathing', 'grounding'].includes(s.category)) || [];

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Emotional Regulation</h1>
        <p className="text-slate-400 mt-1">Breathing exercises and coping strategies</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Breathing Exercise */}
        <Card>
          <CardHeader
            title="Breathing Exercise"
            subtitle="Follow the visual guide"
            action={<Wind className="w-5 h-5 text-cyan-400" />}
          />

          {/* Pattern selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {BREATHING_PATTERNS.map((pattern) => (
              <button
                key={pattern.name}
                onClick={() => {
                  setSelectedPattern(pattern);
                  resetBreathing();
                }}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  selectedPattern.name === pattern.name
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {pattern.name}
              </button>
            ))}
          </div>

          <p className="text-sm text-slate-400 text-center mb-6">
            {selectedPattern.description}
          </p>

          {/* Breathing circle */}
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              <div
                className="rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500/50 transition-all duration-100 flex items-center justify-center"
                style={{
                  width: `${getBreathCircleSize()}px`,
                  height: `${getBreathCircleSize()}px`,
                }}
              >
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">
                    {isBreathing ? getPhaseInstruction() : 'Ready'}
                  </p>
                  {isBreathing && (
                    <p className="text-sm text-cyan-300">
                      {Math.ceil(getCurrentPhaseDuration() - phaseTime)}s
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Cycle counter */}
            {isBreathing && (
              <p className="text-sm text-slate-400 mb-4">
                Cycle {cycleCount + 1}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setIsBreathing(!isBreathing)}
                variant={isBreathing ? 'secondary' : 'primary'}
              >
                {isBreathing ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start
                  </>
                )}
              </Button>
              {isBreathing && (
                <Button variant="ghost" onClick={resetBreathing}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 5-4-3-2-1 Grounding */}
        <Card>
          <CardHeader
            title="5-4-3-2-1 Grounding"
            subtitle="Use your senses to ground yourself"
            action={<Eye className="w-5 h-5 text-purple-400" />}
          />

          {!isGroundingActive ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">
                This technique helps bring you back to the present moment when feeling overwhelmed.
              </p>
              <Button onClick={startGrounding}>
                <Play className="w-4 h-4" />
                Start Grounding
              </Button>
            </div>
          ) : groundingStep < 5 ? (
            <div className="space-y-4">
              <div className="text-center">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-600/20 text-purple-400 text-xl font-bold mb-3">
                  {GROUNDING_PROMPTS[groundingStep].count}
                </span>
                <h3 className="text-lg font-semibold text-white">
                  {GROUNDING_PROMPTS[groundingStep].sense}
                </h3>
                <p className="text-slate-400 mt-1">
                  {GROUNDING_PROMPTS[groundingStep].prompt}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {Array.from({ length: GROUNDING_PROMPTS[groundingStep].count }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < (groundingResponses[groundingStep]?.split(',').length || 0)
                        ? 'bg-purple-500'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  setGroundingStep(s => s + 1);
                }}
              >
                {groundingStep < 4 ? 'Next' : 'Complete'}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Take your time. There's no rush.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Well Done!
              </h3>
              <p className="text-slate-400 mb-4">
                You've completed the grounding exercise. How do you feel?
              </p>
              <Button variant="secondary" onClick={() => setIsGroundingActive(false)}>
                Done
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Coping Strategies Library */}
      <Card>
        <CardHeader
          title="Coping Strategies"
          subtitle="Techniques for emotional regulation"
        />

        <div className="space-y-4">
          {/* Quick access to favorites */}
          {copingStrategies?.filter(s => s.isFavorite).length! > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Favorites
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                {copingStrategies?.filter(s => s.isFavorite).map((strategy) => (
                  <div
                    key={strategy.id}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium text-white">{strategy.name}</h5>
                      <button
                        onClick={() => handleToggleFavorite(strategy.id!, strategy.isFavorite)}
                        className="text-amber-400"
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{strategy.description}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => handleUseStrategy(strategy.id!)}
                    >
                      Use Now
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All strategies by category */}
          {otherStrategies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Other Strategies</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {otherStrategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className="p-3 rounded-lg bg-slate-800/50"
                  >
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium text-white">{strategy.name}</h5>
                      <button
                        onClick={() => handleToggleFavorite(strategy.id!, strategy.isFavorite)}
                        className="text-slate-500 hover:text-amber-400"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{strategy.description}</p>
                    <div className="mt-2">
                      <p className="text-xs text-slate-500">Steps:</p>
                      <ol className="text-xs text-slate-400 list-decimal list-inside mt-1">
                        {strategy.steps.slice(0, 3).map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                        {strategy.steps.length > 3 && (
                          <li className="text-slate-500">...and more</li>
                        )}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Emotional Intensity Scale */}
      <Card>
        <CardHeader
          title="How intense are your emotions right now?"
          subtitle="Rate from 1-10"
        />
        <div className="flex justify-between items-end h-20">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
            <button
              key={level}
              className={`w-8 rounded-t transition-all hover:opacity-80 ${
                level <= 3 ? 'bg-emerald-500' :
                level <= 6 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              style={{ height: `${level * 10}%` }}
            >
              <span className="sr-only">Level {level}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>Calm</span>
          <span>Moderate</span>
          <span>Intense</span>
        </div>
      </Card>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle, CheckCircle, Clock, Brain, ListTodo, Shield, Plus, Phone, Heart, ExternalLink, Sparkles, ArrowRight, MessageCircle } from 'lucide-react';
import { Card, CardHeader, Modal, Button } from '../components/common';
import { useThoughtDumps, addThoughtDump, addTask, addImpulseLog, useSettings } from '../hooks/useDatabase';
import type { ThoughtDump } from '../hooks/useDatabase';
import { analyzeThoughts, extractTasksAndUrges, detectCrisis, CRISIS_RESOURCES } from '../utils/cognitiveAnalysis';
import type { ExtractedItems, ExtractedTask, ExtractedUrge, CrisisDetectionResult } from '../utils/cognitiveAnalysis';
import type { CognitiveAnalysis } from '../db/database';
import { format } from 'date-fns';

export function VoicePage() {
  const settings = useSettings();
  const thoughtDumps = useThoughtDumps(20);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CognitiveAnalysis | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedItems | null>(null);
  const [crisisDetection, setCrisisDetection] = useState<CrisisDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDump, setSelectedDump] = useState<ThoughtDump | null>(null);
  const [createdTasks, setCreatedTasks] = useState<Set<number>>(new Set());
  const [createdUrges, setCreatedUrges] = useState<Set<number>>(new Set());

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<number | null>(null);

  const MAX_DURATION = 300; // 5 minutes in seconds

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = settings?.voiceLanguage || 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript((prev) => {
        const base = prev.replace(/\[listening...\]$/, '').trim();
        return (base + ' ' + finalTranscript + (interimTranscript ? ' [listening...]' : '')).trim();
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access to use this feature.');
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [settings?.voiceLanguage]);

  const startRecording = () => {
    if (!recognitionRef.current) return;

    setError(null);
    setTranscript('');
    setAnalysis(null);
    setExtractedItems(null);
    setCrisisDetection(null);
    setCreatedTasks(new Set());
    setCreatedUrges(new Set());
    setRecordingTime(0);
    setIsRecording(true);

    try {
      recognitionRef.current.start();
    } catch {
      setError('Failed to start recording. Please try again.');
      setIsRecording(false);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= MAX_DURATION) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);

    const cleanTranscript = transcript.replace(/\[listening...\]$/, '').trim();
    setTranscript(cleanTranscript);

    if (cleanTranscript.length > 10) {
      await analyzeTranscript(cleanTranscript);
    }
  };

  const analyzeTranscript = async (text: string) => {
    setIsAnalyzing(true);
    setError(null);

    // FIRST: Check for crisis content before anything else
    const crisisResult = detectCrisis(text);
    setCrisisDetection(crisisResult);

    try {
      // Run both analyses in parallel
      const [cognitiveResult, extractedResult] = await Promise.all([
        analyzeThoughts(text, settings?.apiKey || ''),
        extractTasksAndUrges(text, settings?.apiKey || ''),
      ]);

      setAnalysis(cognitiveResult);
      setExtractedItems(extractedResult);

      // Save to database
      await addThoughtDump({
        transcript: text,
        analysis: cognitiveResult,
        timestamp: new Date(),
      });
    } catch {
      setError('Failed to analyze thoughts. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateTask = async (task: ExtractedTask, index: number) => {
    await addTask({
      title: task.title,
      description: task.description,
      steps: [],
      status: 'pending',
      resistance: task.priority === 'high' ? 7 : task.priority === 'medium' ? 5 : 3,
      createdAt: new Date(),
    });
    setCreatedTasks(prev => new Set(prev).add(index));
  };

  const handleCreateUrge = async (urge: ExtractedUrge, index: number) => {
    await addImpulseLog({
      urge: urge.urge,
      intensity: urge.intensity,
      waited: false,
      outcome: 'resisted',
      reflection: urge.context,
      timestamp: new Date(),
    });
    setCreatedUrges(prev => new Set(prev).add(index));
  };

  const handleCreateAllTasks = async () => {
    if (!extractedItems) return;
    for (let i = 0; i < extractedItems.tasks.length; i++) {
      if (!createdTasks.has(i)) {
        await handleCreateTask(extractedItems.tasks[i], i);
      }
    }
  };

  const handleCreateAllUrges = async () => {
    if (!extractedItems) return;
    for (let i = 0; i < extractedItems.urges.length; i++) {
      if (!createdUrges.has(i)) {
        await handleCreateUrge(extractedItems.urges[i], i);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDistortionColor = (type: string) => {
    const colors: Record<string, string> = {
      'All-or-Nothing Thinking': 'bg-red-500/20 text-red-300 border-red-500/30',
      'Catastrophizing': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Mind Reading': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Fortune Telling': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Should Statements': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Labeling': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'Emotional Reasoning': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'Personalization': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Voice Thought Dump</h1>
        <p className="text-slate-400 mt-1">Speak your thoughts for AI cognitive analysis</p>
      </div>

      {/* Recording Section */}
      <Card>
        <CardHeader
          title="Record Your Thoughts"
          subtitle="Up to 5 minutes - Tasks & urges will be auto-detected"
          action={
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(recordingTime)} / {formatTime(MAX_DURATION)}</span>
            </div>
          }
        />

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {!settings?.apiKey && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <p className="text-sm text-amber-300">
              Add your Moonshot AI API key in Settings for enhanced AI analysis.
            </p>
          </div>
        )}

        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isAnalyzing}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } disabled:opacity-50`}
            >
              {isRecording ? (
                <Square className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>
          </div>

          <p className="text-slate-400">
            {isRecording
              ? 'Recording... Click to stop'
              : isAnalyzing
              ? 'Analyzing your thoughts...'
              : 'Click to start recording'}
          </p>

          {transcript && (
            <div className="text-left p-4 bg-slate-800/50 rounded-lg max-h-48 overflow-y-auto">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{transcript}</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center justify-center gap-2 text-indigo-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing cognitive patterns & extracting items...</span>
            </div>
          )}
        </div>
      </Card>

      {/* CRISIS RESOURCES - Shows first when crisis detected */}
      {crisisDetection && crisisDetection.isCrisis && (
        <Card className="border-2 border-red-500 bg-red-950/30">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">You're Not Alone</h3>
                <p className="text-red-200 text-sm">
                  {crisisDetection.severity === 'immediate'
                    ? "I hear that you're in a lot of pain right now. Please reach out for support."
                    : "It sounds like you're going through a difficult time. Help is available."}
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-900/30 rounded-lg border border-red-800">
              <p className="text-white font-medium mb-2">
                If you're thinking about suicide or self-harm, please reach out now:
              </p>
              <div className="space-y-2">
                {CRISIS_RESOURCES.hotlines.slice(0, 4).map((hotline, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-red-950/50 rounded">
                    <Phone className="w-4 h-4 text-red-400" />
                    <div>
                      <span className="text-white font-medium">{hotline.country}: </span>
                      <span className="text-red-200">{hotline.name}</span>
                      <span className="text-white font-bold ml-2">{hotline.number}</span>
                      <span className="text-red-300 text-sm ml-2">({hotline.available})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href="https://www.iasp.info/resources/Crisis_Centres/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Find Crisis Center Near You
              </a>
              <a
                href="tel:988"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call 988 Now (US)
              </a>
            </div>

            <p className="text-red-200 text-sm">
              These feelings can be overwhelming, but they can also pass. A trained counselor can help you through this moment.
              You matter, and your life has value.
            </p>
          </div>
        </Card>
      )}

      {/* Extracted Tasks */}
      {extractedItems && extractedItems.tasks.length > 0 && (
        <Card>
          <CardHeader
            title="Detected Tasks"
            subtitle={`${extractedItems.tasks.length} task(s) found in your thoughts`}
            action={
              <Button size="sm" onClick={handleCreateAllTasks}>
                <Plus className="w-4 h-4" />
                Add All
              </Button>
            }
          />
          <div className="space-y-2">
            {extractedItems.tasks.map((task, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <ListTodo className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-sm text-white">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-slate-400">{task.description}</p>
                    )}
                    <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                      {task.priority} priority
                    </span>
                  </div>
                </div>
                {createdTasks.has(index) ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Added
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => handleCreateTask(task, index)}>
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Extracted Urges */}
      {extractedItems && extractedItems.urges.length > 0 && (
        <Card>
          <CardHeader
            title="Detected Urges"
            subtitle={`${extractedItems.urges.length} urge(s) detected - Consider using impulse pause`}
            action={
              <Button size="sm" variant="secondary" onClick={handleCreateAllUrges}>
                <Shield className="w-4 h-4" />
                Log All
              </Button>
            }
          />
          <div className="space-y-2">
            {extractedItems.urges.map((urge, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-sm text-white">{urge.urge}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-amber-400">
                        Intensity: {urge.intensity}/10
                      </span>
                      {urge.context && (
                        <span className="text-xs text-slate-400">• {urge.context}</span>
                      )}
                    </div>
                  </div>
                </div>
                {createdUrges.has(index) ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Logged
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => handleCreateUrge(urge, index)}>
                    <Plus className="w-4 h-4" />
                    Log
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <Card>
          <CardHeader
            title="Cognitive Analysis"
            subtitle="Patterns detected in your thinking"
            action={<Brain className="w-5 h-5 text-indigo-400" />}
          />

          <div className="space-y-6">
            <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
              <p className="text-indigo-200">{analysis.overallAssessment}</p>
            </div>

            {analysis.distortions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-3">
                  Cognitive Patterns Detected
                </h4>
                <div className="space-y-3">
                  {analysis.distortions.map((distortion, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${getDistortionColor(distortion.type)}`}
                    >
                      <p className="font-medium text-sm">{distortion.type}</p>
                      <p className="text-xs mt-1 opacity-80">"{distortion.quote}"</p>
                      <p className="text-xs mt-2 opacity-60">{distortion.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.realityChecks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-3">
                  Reality Check Questions
                </h4>
                <ul className="space-y-2">
                  {analysis.realityChecks.map((check, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-300">{check}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.reframes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-3">
                  Alternative Perspectives
                </h4>
                <ul className="space-y-2">
                  {analysis.reframes.map((reframe, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-emerald-400">→</span>
                      <span className="text-sm text-slate-300">{reframe}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Coach's Advice */}
      {analysis?.coachAdvice && (
        <Card className="border-emerald-800 bg-gradient-to-br from-emerald-950/30 to-slate-900">
          <CardHeader
            title="Coach's Advice"
            subtitle="What to do next"
            action={<Sparkles className="w-5 h-5 text-emerald-400" />}
          />

          <div className="space-y-5">
            {/* Immediate Action */}
            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-5 h-5 text-emerald-400" />
                <h4 className="font-semibold text-emerald-300">Do This Right Now</h4>
              </div>
              <p className="text-white">{analysis.coachAdvice.immediateAction}</p>
            </div>

            {/* Short-term Steps */}
            {analysis.coachAdvice.shortTermSteps.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  Your Next Steps
                </h4>
                <div className="space-y-2">
                  {analysis.coachAdvice.shortTermSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50"
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-sm text-slate-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coping Strategy */}
            {analysis.coachAdvice.copingStrategy && (
              <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-indigo-400" />
                  <h4 className="font-semibold text-indigo-300">Recommended Technique</h4>
                </div>
                <p className="text-sm text-slate-300">{analysis.coachAdvice.copingStrategy}</p>
              </div>
            )}

            {/* Affirmation */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <h4 className="font-semibold text-purple-300">Remember</h4>
              </div>
              <p className="text-white italic">"{analysis.coachAdvice.affirmation}"</p>
            </div>
          </div>
        </Card>
      )}

      {/* Previous Thought Dumps */}
      <Card>
        <CardHeader title="Previous Thought Dumps" subtitle="Your history" />
        <div className="space-y-2">
          {thoughtDumps?.map((dump) => (
            <button
              key={dump.id}
              onClick={() => setSelectedDump(dump)}
              className="w-full text-left p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-300 truncate flex-1">
                  {dump.transcript.slice(0, 60)}...
                </p>
                <span className="text-xs text-slate-500 ml-2">
                  {format(new Date(dump.timestamp), 'MMM d, h:mm a')}
                </span>
              </div>
              {dump.analysis && (
                <div className="flex gap-1 mt-2">
                  {dump.analysis.distortions.slice(0, 3).map((d, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300"
                    >
                      {d.type}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}

          {(!thoughtDumps || thoughtDumps.length === 0) && (
            <p className="text-slate-500 text-center py-8">
              No thought dumps yet. Start recording to begin!
            </p>
          )}
        </div>
      </Card>

      {/* View Previous Dump Modal */}
      <Modal
        isOpen={!!selectedDump}
        onClose={() => setSelectedDump(null)}
        title="Thought Dump"
        size="lg"
      >
        {selectedDump && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">
                {format(new Date(selectedDump.timestamp), 'MMMM d, yyyy h:mm a')}
              </p>
              <div className="p-3 bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-300">{selectedDump.transcript}</p>
              </div>
            </div>

            {selectedDump.analysis && (
              <>
                <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                  <p className="text-sm text-indigo-200">
                    {selectedDump.analysis.overallAssessment}
                  </p>
                </div>

                {selectedDump.analysis.distortions.length > 0 && (
                  <div className="space-y-2">
                    {selectedDump.analysis.distortions.map((d, i) => (
                      <div key={i} className={`p-2 rounded border text-sm ${getDistortionColor(d.type)}`}>
                        <strong>{d.type}:</strong> "{d.quote}"
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// Types are defined in src/types/speech-recognition.d.ts

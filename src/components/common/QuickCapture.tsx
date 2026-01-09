import { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Check, Loader2, Bell, ListTodo } from 'lucide-react';
import { addTask, addReminder, useSettings } from '../../hooks/useDatabase';
import { extractTasksAndUrges } from '../../utils/cognitiveAnalysis';
import type { VoiceLanguageCode } from './VoiceInput';

interface QuickCaptureProps {
  className?: string;
}

export function QuickCapture({ className = '' }: QuickCaptureProps) {
  const settings = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    tasksCreated: number;
    remindersCreated: number;
  } | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>('');

  const MAX_DURATION = 60; // 1 minute for quick capture

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Disable continuous for Android compatibility
        recognition.interimResults = true;
        recognition.lang = (settings?.voiceLanguage || 'en-US') as VoiceLanguageCode;

        recognition.onresult = (event) => {
          let sessionFinal = '';
          let currentInterim = '';

          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              sessionFinal += result[0].transcript + ' ';
            } else {
              currentInterim += result[0].transcript;
            }
          }

          // When we get final results, add to accumulated
          if (sessionFinal.trim()) {
            accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + sessionFinal).trim();
          }

          const displayText = accumulatedTranscriptRef.current + (currentInterim ? ' ' + currentInterim + ' [listening...]' : '');
          setTranscript(displayText.trim());
        };

        recognition.onerror = (event) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error('Speech recognition error:', event.error);
            stopRecording();
          }
        };

        recognition.onend = () => {
          if (isRecordingRef.current) {
            setTimeout(() => {
              if (isRecordingRef.current) {
                try {
                  recognition.start();
                } catch {
                  // Ignore
                }
              }
            }, 100);
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [settings?.voiceLanguage]);

  const startRecording = () => {
    setIsRecording(true);
    isRecordingRef.current = true;
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setResult(null);
    recordingTimeRef.current = 0;

    recognitionRef.current?.start();

    timerRef.current = setInterval(() => {
      recordingTimeRef.current += 1;
      if (recordingTimeRef.current >= MAX_DURATION) {
        stopRecording();
      }
    }, 1000);
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    recognitionRef.current?.stop();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const processCapture = async () => {
    const cleanTranscript = transcript.replace(/ \[listening\.\.\.\]$/, '').trim();

    if (!cleanTranscript || cleanTranscript.length < 3) {
      setIsOpen(false);
      return;
    }

    setIsProcessing(true);

    try {
      // Extract tasks and reminders from transcript
      const extracted = await extractTasksAndUrges(cleanTranscript, settings?.apiKey || '');

      let tasksCreated = 0;
      let remindersCreated = 0;

      // Create tasks
      for (const task of extracted.tasks) {
        await addTask({
          title: task.title,
          description: task.description,
          steps: [],
          status: 'pending',
          resistance: task.priority === 'high' ? 7 : task.priority === 'medium' ? 5 : 3,
          createdAt: new Date(),
        });
        tasksCreated++;
      }

      // Check for reminder patterns in transcript
      const reminderPatterns = [
        { regex: /remind me (?:to |about )?(.*?)(?:\s+(?:at|in|tomorrow|later))?/i, type: 'context' as const },
        { regex: /don'?t forget (?:to )?(.*)/i, type: 'context' as const },
        { regex: /remember to (.*)/i, type: 'context' as const },
      ];

      for (const pattern of reminderPatterns) {
        const match = cleanTranscript.match(pattern.regex);
        if (match && match[1]) {
          // Check if this is a time-based reminder
          const timeMatch = cleanTranscript.match(/at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
          let triggerType: 'time' | 'energy' | 'context' = 'context';
          let triggerValue = 'anytime';

          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const ampm = timeMatch[3]?.toLowerCase();

            if (ampm === 'pm' && hour < 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;

            triggerType = 'time';
            triggerValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          } else if (cleanTranscript.match(/when i have energy|high energy/i)) {
            triggerType = 'energy';
            triggerValue = 'high';
          } else if (cleanTranscript.match(/in the morning/i)) {
            triggerType = 'time';
            triggerValue = '09:00';
          } else if (cleanTranscript.match(/tonight|this evening/i)) {
            triggerType = 'time';
            triggerValue = '18:00';
          }

          await addReminder({
            message: match[1].trim(),
            triggerType,
            triggerValue,
          });
          remindersCreated++;
          break; // Only create one reminder per capture
        }
      }

      // If no tasks or reminders were created, create a task from the whole transcript
      if (tasksCreated === 0 && remindersCreated === 0) {
        await addTask({
          title: cleanTranscript.slice(0, 100),
          description: cleanTranscript.length > 100 ? cleanTranscript : undefined,
          steps: [],
          status: 'pending',
          resistance: 5,
          createdAt: new Date(),
        });
        tasksCreated = 1;
      }

      setResult({ tasksCreated, remindersCreated });

      // Auto-close after showing result
      setTimeout(() => {
        setIsOpen(false);
        setTranscript('');
        setResult(null);
      }, 2000);

    } catch (error) {
      console.error('Failed to process capture:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    stopRecording();
    setIsOpen(false);
    setTranscript('');
    setResult(null);
  };

  // Don't render on mobile nav area
  if (!recognitionRef.current && typeof window !== 'undefined') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return null; // Browser doesn't support speech recognition
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          startRecording();
        }}
        className={`fixed bottom-24 md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-40 ${className}`}
        title="Quick voice capture"
      >
        <Mic className="w-6 h-6" />
      </button>

      {/* Capture Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Quick Capture</h3>
              <button
                onClick={handleCancel}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-medium">Recording...</span>
              </div>
            )}

            {/* Transcript */}
            <div className="min-h-[100px] max-h-[200px] overflow-y-auto p-4 bg-slate-800/50 rounded-xl mb-4">
              {transcript ? (
                <p className="text-white whitespace-pre-wrap">{transcript}</p>
              ) : (
                <p className="text-slate-500 italic">
                  Say something like "Remind me to call mom" or "I need to finish the report"
                </p>
              )}
            </div>

            {/* Result */}
            {result && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-green-900/30 rounded-lg border border-green-800/50">
                <Check className="w-5 h-5 text-green-400" />
                <div className="text-sm">
                  {result.tasksCreated > 0 && (
                    <span className="flex items-center gap-1 text-green-400">
                      <ListTodo className="w-4 h-4" />
                      {result.tasksCreated} task{result.tasksCreated !== 1 ? 's' : ''} created
                    </span>
                  )}
                  {result.remindersCreated > 0 && (
                    <span className="flex items-center gap-1 text-green-400">
                      <Bell className="w-4 h-4" />
                      {result.remindersCreated} reminder{result.remindersCreated !== 1 ? 's' : ''} set
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </button>
              ) : isProcessing ? (
                <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 text-slate-300 rounded-xl">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </div>
              ) : !result ? (
                <>
                  <button
                    onClick={startRecording}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                  >
                    <Mic className="w-5 h-5" />
                    Record Again
                  </button>
                  <button
                    onClick={processCapture}
                    disabled={!transcript.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
                  >
                    <Check className="w-5 h-5" />
                    Save
                  </button>
                </>
              ) : null}
            </div>

            {/* Tips */}
            <p className="text-xs text-slate-500 text-center mt-4">
              Try: "Remind me to...", "I need to...", "Don't forget..."
            </p>
          </div>
        </div>
      )}
    </>
  );
}

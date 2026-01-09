import { useState, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';

export const VOICE_LANGUAGES = [
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'ar-SA', label: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'ur-PK', label: 'اردو (Urdu)', flag: '🇵🇰' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
] as const;

export type VoiceLanguageCode = typeof VOICE_LANGUAGES[number]['code'];

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  placeholder?: string;
  maxDuration?: number; // in seconds
  className?: string;
  compact?: boolean;
  language?: VoiceLanguageCode;
}

export function VoiceInput({
  onTranscript,
  onRecordingChange,
  placeholder = 'Click to speak...',
  maxDuration = 120,
  className = '',
  compact = false,
  language = 'en-US',
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const isRecordingRef = useRef<boolean>(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Build complete transcript from all results
      let fullFinal = '';
      let currentInterim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          fullFinal += result[0].transcript + ' ';
        } else {
          currentInterim += result[0].transcript;
        }
      }

      // Update only if we have new content
      const trimmedFinal = fullFinal.trim();
      if (trimmedFinal !== finalTranscriptRef.current) {
        finalTranscriptRef.current = trimmedFinal;
        onTranscript(trimmedFinal);
      }

      const displayText = trimmedFinal + (currentInterim ? ' [listening...]' : '');
      setTranscript(displayText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        stopRecording();
      }
    };

    recognition.onend = () => {
      // Only restart if still recording
      if (isRecordingRef.current) {
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
  }, [language]);

  const startRecording = () => {
    if (!recognitionRef.current || !isSupported) return;

    setTranscript('');
    setRecordingTime(0);
    setIsRecording(true);
    isRecordingRef.current = true;
    finalTranscriptRef.current = '';
    onRecordingChange?.(true);

    try {
      recognitionRef.current.start();
    } catch {
      setIsRecording(false);
      isRecordingRef.current = false;
      onRecordingChange?.(false);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= maxDuration) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    onRecordingChange?.(false);

    const cleanTranscript = finalTranscriptRef.current;
    setTranscript(cleanTranscript);
    if (cleanTranscript) {
      onTranscript(cleanTranscript);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className={`text-sm text-slate-500 ${className}`}>
        Voice input not supported in this browser
      </div>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleRecording}
        className={`p-2 rounded-lg transition-all ${
          isRecording
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        } ${className}`}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            isRecording
              ? 'bg-red-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4" />
              <span>Stop ({formatTime(recordingTime)})</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>{placeholder}</span>
            </>
          )}
        </button>
      </div>

      {transcript && (
        <div className="p-3 bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-300">{transcript}</p>
        </div>
      )}
    </div>
  );
}

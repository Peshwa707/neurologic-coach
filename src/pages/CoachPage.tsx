import { useState, useRef, useEffect } from 'react';
import { Send, Plus, MessageCircle, Check, Loader2, Trash2, ChevronLeft, Sparkles } from 'lucide-react';
import { Button, Modal, VoiceInput } from '../components/common';
import type { VoiceLanguageCode } from '../components/common';
import {
  useCoachSessions,
  useCoachSession,
  createCoachSession,
  addMessageToSession,
  resolveCoachSession,
  deleteCoachSession,
  useSettings,
} from '../hooks/useDatabase';
import { getCoachResponse } from '../utils/cognitiveAnalysis';
import type { CoachChatMessage } from '../utils/cognitiveAnalysis';
import { format } from 'date-fns';

const STARTER_PROMPTS = [
  { label: "I'm feeling anxious", emoji: "😰" },
  { label: "I'm overwhelmed with tasks", emoji: "📋" },
  { label: "I can't stop overthinking", emoji: "🔄" },
  { label: "I'm feeling down today", emoji: "😔" },
  { label: "I had a conflict with someone", emoji: "💬" },
  { label: "I'm struggling with motivation", emoji: "😴" },
];

export function CoachPage() {
  const settings = useSettings();
  const sessions = useCoachSessions(20);

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const activeSession = useCoachSession(activeSessionId || 0);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endMood, setEndMood] = useState(3);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  // Focus input when session changes
  useEffect(() => {
    if (activeSessionId) {
      inputRef.current?.focus();
    }
  }, [activeSessionId]);

  const handleStartNewSession = async (initialMessage?: string) => {
    const title = initialMessage?.slice(0, 50) || `Session ${new Date().toLocaleDateString()}`;
    const sessionId = await createCoachSession(title, initialMessage);
    setActiveSessionId(sessionId);
    setShowSidebar(false);

    if (initialMessage) {
      // Get coach response
      setIsLoading(true);
      try {
        const messages: CoachChatMessage[] = [{ role: 'user', content: initialMessage }];
        const response = await getCoachResponse(messages, settings?.apiKey || '');
        await addMessageToSession(sessionId, { role: 'coach', content: response });
      } catch (error) {
        console.error('Failed to get coach response:', error);
        let errorMessage: string;
        if (error instanceof Error) {
          if (error.message === 'API_KEY_REQUIRED') {
            errorMessage = "To use the Coach feature, please add your Moonshot AI API key in Settings. Go to Settings > API Key to configure it.";
          } else {
            errorMessage = `I'm sorry, I had trouble connecting: ${error.message}. Please check your API key in Settings and try again.`;
          }
        } else {
          errorMessage = "I'm sorry, I had trouble connecting. Please check your API key in Settings and try again.";
        }
        await addMessageToSession(sessionId, { role: 'coach', content: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeSessionId || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message
    await addMessageToSession(activeSessionId, { role: 'user', content: userMessage });

    // Get coach response
    setIsLoading(true);
    try {
      const allMessages: CoachChatMessage[] = [
        ...(activeSession?.messages || []).map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
        { role: 'user' as const, content: userMessage },
      ];

      const response = await getCoachResponse(allMessages, settings?.apiKey || '');
      await addMessageToSession(activeSessionId, { role: 'coach', content: response });
    } catch (error) {
      console.error('Failed to get coach response:', error);
      let errorMessage: string;
      if (error instanceof Error) {
        if (error.message === 'API_KEY_REQUIRED') {
          errorMessage = "To use the Coach feature, please add your Moonshot AI API key in Settings. Go to Settings > API Key to configure it.";
        } else {
          errorMessage = `I'm sorry, I had trouble connecting: ${error.message}. Please check your API key in Settings and try again.`;
        }
      } else {
        errorMessage = "I'm sorry, I had trouble connecting. Please check your API key in Settings and try again.";
      }
      await addMessageToSession(activeSessionId, {
        role: 'coach',
        content: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndSession = async () => {
    if (activeSessionId) {
      await resolveCoachSession(activeSessionId, endMood);
      setShowEndModal(false);
      setActiveSessionId(null);
      setShowSidebar(true);
    }
  };

  const handleDeleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await deleteCoachSession(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    }
  };

  const handleVoiceInput = (text: string) => {
    setInputMessage(prev => prev + (prev ? ' ' : '') + text);
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen flex">
      {/* Sidebar - Session List */}
      <div
        className={`${
          showSidebar ? 'w-full md:w-80' : 'hidden md:block md:w-80'
        } bg-slate-900/50 border-r border-slate-800 flex flex-col`}
      >
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-400" />
            Talk to Coach
          </h1>
          <p className="text-sm text-slate-400 mt-1">Have a supportive conversation</p>
        </div>

        {/* Quick Start Prompts */}
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs text-slate-500 mb-2">Quick start:</p>
          <div className="grid grid-cols-2 gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => handleStartNewSession(prompt.label)}
                className="flex items-center gap-2 p-2 text-left text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <span>{prompt.emoji}</span>
                <span className="truncate">{prompt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* New Session Button */}
        <div className="p-4">
          <Button onClick={() => handleStartNewSession()} className="w-full">
            <Plus className="w-4 h-4" />
            New Conversation
          </Button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs text-slate-500 mb-2">Recent conversations:</p>
          {sessions?.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                setActiveSessionId(session.id!);
                setShowSidebar(false);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setActiveSessionId(session.id!);
                  setShowSidebar(false);
                }
              }}
              className={`w-full text-left p-3 rounded-lg transition-colors group cursor-pointer ${
                activeSessionId === session.id
                  ? 'bg-indigo-600/20 border border-indigo-500'
                  : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{session.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {format(new Date(session.updatedAt), 'MMM d, h:mm a')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                      {session.messages.length} messages
                    </span>
                    {session.resolved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="w-3 h-3" />
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(session.id!, e)}
                  className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {(!sessions || sessions.length === 0) && (
            <p className="text-sm text-slate-500 text-center py-8">
              No conversations yet. Start one above!
            </p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!showSidebar ? 'block' : 'hidden md:flex'}`}>
        {activeSessionId && activeSession ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden p-2 text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Coach</h2>
                  <p className="text-xs text-slate-400">Here to help you through</p>
                </div>
              </div>
              {!activeSession.resolved && (
                <Button variant="secondary" size="sm" onClick={() => setShowEndModal(true)}>
                  <Check className="w-4 h-4" />
                  Mark Resolved
                </Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Welcome message if no messages */}
              {activeSession.messages.length === 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-4 rounded-2xl rounded-tl-sm bg-slate-800">
                    <p className="text-slate-200">
                      Hi there! I'm your coach. I'm here to listen and help you work through
                      whatever's on your mind. There's no judgment here - just support.
                    </p>
                    <p className="text-slate-200 mt-2">
                      What would you like to talk about today?
                    </p>
                  </div>
                </div>
              )}

              {activeSession.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-indigo-200' : 'text-slate-500'
                      }`}
                    >
                      {format(new Date(message.timestamp), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-4 rounded-2xl rounded-tl-sm bg-slate-800">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Coach is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    rows={1}
                    className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                  <VoiceInput
                    onTranscript={handleVoiceInput}
                    compact
                    className="absolute right-2 bottom-2"
                    language={(settings?.voiceLanguage || 'en-US') as VoiceLanguageCode}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="h-12 px-4"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          /* No Active Session */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Talk to Your Coach</h2>
              <p className="text-slate-400 mb-6">
                Have a supportive conversation about whatever's on your mind. Your coach is here to
                listen, help you explore your thoughts, and find your way forward.
              </p>
              <Button onClick={() => handleStartNewSession()} size="lg">
                <Plus className="w-5 h-5" />
                Start a Conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* End Session Modal */}
      <Modal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="How are you feeling now?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-400">
            Rate how you're feeling after our conversation:
          </p>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((mood) => (
              <button
                key={mood}
                onClick={() => setEndMood(mood)}
                className={`w-12 h-12 rounded-full text-2xl transition-all ${
                  endMood === mood
                    ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-110'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                {mood === 1 ? '😢' : mood === 2 ? '😕' : mood === 3 ? '😐' : mood === 4 ? '🙂' : '😊'}
              </button>
            ))}
          </div>
          <Button onClick={handleEndSession} className="w-full">
            <Check className="w-4 h-4" />
            Complete Session
          </Button>
        </div>
      </Modal>
    </div>
  );
}

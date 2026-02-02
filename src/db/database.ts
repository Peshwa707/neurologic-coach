import Dexie from 'dexie';
import type { Table } from 'dexie';

// Types
export interface Settings {
  id?: number;
  apiKey: string;
  pomodoroWork: number;
  pomodoroBreak: number;
  theme: 'dark' | 'light';
  voiceLanguage: string;
  // New ADHD-focused settings
  zenMode: boolean;
  chimeInterval: number; // minutes (0 = disabled, 15, 30, 60, 120)
  showRollingStats: boolean;
  sidebarCollapsed: boolean;
  bodyDoublingEnabled: boolean; // Virtual co-working presence
}

export interface Task {
  id?: number;
  title: string;
  description?: string;
  steps: TaskStep[];
  deadline?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'abandoned';
  estimatedMinutes?: number;
  actualMinutes?: number;
  resistance: number; // 1-10 scale of how much resistance felt
  createdAt: Date;
  completedAt?: Date;
}

export interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
  estimatedMinutes: number;
}

export interface TimeBlock {
  id?: number;
  title: string;
  description?: string;
  startTime: string; // HH:mm format
  endTime: string;
  date: string; // YYYY-MM-DD format
  color: string;
  completed: boolean;
  taskId?: number; // Link to task
  category?: 'work' | 'meeting' | 'self-care' | 'exercise' | 'meal' | 'personal' | 'break';
}

export interface PomodoroSession {
  id?: number;
  duration: number; // minutes
  type: 'work' | 'break';
  completedAt: Date;
  taskId?: number;
  interrupted: boolean;
}

export interface MoodLog {
  id?: number;
  mood: number; // 1-5 scale
  energy: number; // 1-5 scale
  notes?: string;
  triggers?: string[];
  timestamp: Date;
}

export interface ThoughtDump {
  id?: number;
  transcript: string;
  audioUrl?: string;
  analysis?: CognitiveAnalysis;
  timestamp: Date;
}

export interface CognitiveAnalysis {
  distortions: CognitiveDistortion[];
  realityChecks: string[];
  reframes: string[];
  overallAssessment: string;
  coachAdvice?: CoachAdvice;
}

export interface CoachAdvice {
  immediateAction: string;
  shortTermSteps: string[];
  copingStrategy?: string;
  affirmation: string;
}

export interface CognitiveDistortion {
  type: string;
  quote: string;
  explanation: string;
}

export interface ImpulseLog {
  id?: number;
  urge: string;
  intensity: number; // 1-10
  waited: boolean;
  waitDuration?: number; // seconds
  outcome: 'resisted' | 'acted' | 'modified';
  reflection?: string;
  timestamp: Date;
}

export interface CopingStrategy {
  id?: number;
  name: string;
  category: 'grounding' | 'breathing' | 'cognitive' | 'physical' | 'social';
  description: string;
  steps: string[];
  effectiveness?: number; // 1-5 based on user feedback
  timesUsed: number;
  isFavorite: boolean;
}

export interface JournalEntry {
  id?: number;
  content: string;
  prompt?: string;
  mood?: number;
  tags: string[];
  timestamp: Date;
}

export interface ChatMessage {
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

export interface CoachSession {
  id?: number;
  title: string;
  messages: ChatMessage[];
  topic?: string;
  resolved: boolean;
  moodBefore?: number;
  moodAfter?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id?: number;
  taskId?: number;
  message: string;
  triggerType: 'time' | 'energy' | 'context';
  triggerValue: string; // "HH:mm" for time, "high" for energy, or context keyword
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

// Win Tracker - small victories for positive reinforcement
export interface Win {
  id?: number;
  title: string;
  category: 'task' | 'focus' | 'habit' | 'milestone' | 'personal';
  description?: string;
  celebrationLevel: 1 | 2 | 3; // 1=small, 2=medium, 3=big
  timestamp: Date;
}

// Database class
class ExecFunctionDB extends Dexie {
  settings!: Table<Settings>;
  tasks!: Table<Task>;
  timeBlocks!: Table<TimeBlock>;
  pomodoroSessions!: Table<PomodoroSession>;
  moodLogs!: Table<MoodLog>;
  thoughtDumps!: Table<ThoughtDump>;
  impulseLogs!: Table<ImpulseLog>;
  copingStrategies!: Table<CopingStrategy>;
  journalEntries!: Table<JournalEntry>;
  coachSessions!: Table<CoachSession>;
  reminders!: Table<Reminder>;
  wins!: Table<Win>;

  constructor() {
    super('ExecFunctionDB');

    // Version 1: Initial schema
    this.version(1).stores({
      settings: '++id',
      tasks: '++id, status, createdAt, deadline',
      timeBlocks: '++id, date, startTime',
      pomodoroSessions: '++id, completedAt, taskId',
      moodLogs: '++id, timestamp, mood, energy',
      thoughtDumps: '++id, timestamp',
      impulseLogs: '++id, timestamp, outcome',
      copingStrategies: '++id, category',
      journalEntries: '++id, timestamp',
    });

    // Version 2: Added coachSessions
    this.version(2).stores({
      settings: '++id',
      tasks: '++id, status, createdAt, deadline',
      timeBlocks: '++id, date, startTime',
      pomodoroSessions: '++id, completedAt, taskId',
      moodLogs: '++id, timestamp, mood, energy',
      thoughtDumps: '++id, timestamp',
      impulseLogs: '++id, timestamp, outcome',
      copingStrategies: '++id, category',
      journalEntries: '++id, timestamp',
      coachSessions: '++id, createdAt, updatedAt',
    });

    // Version 3: Added reminders
    this.version(3).stores({
      settings: '++id',
      tasks: '++id, status, createdAt, deadline',
      timeBlocks: '++id, date, startTime',
      pomodoroSessions: '++id, completedAt, taskId',
      moodLogs: '++id, timestamp, mood, energy',
      thoughtDumps: '++id, timestamp',
      impulseLogs: '++id, timestamp, outcome',
      copingStrategies: '++id, category',
      journalEntries: '++id, timestamp',
      coachSessions: '++id, createdAt, updatedAt',
      reminders: '++id, taskId, triggerType, createdAt',
    });

    // Version 4: Removed boolean indexes (isFavorite, resolved, isActive) - they don't work with IndexedDB
    this.version(4).stores({
      settings: '++id',
      tasks: '++id, status, createdAt, deadline',
      timeBlocks: '++id, date, startTime',
      pomodoroSessions: '++id, completedAt, taskId',
      moodLogs: '++id, timestamp, mood, energy',
      thoughtDumps: '++id, timestamp',
      impulseLogs: '++id, timestamp, outcome',
      copingStrategies: '++id, category',
      journalEntries: '++id, timestamp',
      coachSessions: '++id, createdAt, updatedAt',
      reminders: '++id, taskId, triggerType, createdAt',
    });

    // Version 5: Added taskId index to timeBlocks for task-timeline linking
    this.version(5).stores({
      settings: '++id',
      tasks: '++id, status, createdAt, deadline',
      timeBlocks: '++id, date, startTime, taskId',
      pomodoroSessions: '++id, completedAt, taskId',
      moodLogs: '++id, timestamp, mood, energy',
      thoughtDumps: '++id, timestamp',
      impulseLogs: '++id, timestamp, outcome',
      copingStrategies: '++id, category',
      journalEntries: '++id, timestamp',
      coachSessions: '++id, createdAt, updatedAt',
      reminders: '++id, taskId, triggerType, createdAt',
    });

    // Version 6: Added wins table for positive reinforcement tracking
    this.version(6).stores({
      settings: '++id',
      tasks: '++id, status, createdAt, deadline',
      timeBlocks: '++id, date, startTime, taskId',
      pomodoroSessions: '++id, completedAt, taskId',
      moodLogs: '++id, timestamp, mood, energy',
      thoughtDumps: '++id, timestamp',
      impulseLogs: '++id, timestamp, outcome',
      copingStrategies: '++id, category',
      journalEntries: '++id, timestamp',
      coachSessions: '++id, createdAt, updatedAt',
      reminders: '++id, taskId, triggerType, createdAt',
      wins: '++id, category, timestamp',
    });
  }
}

export const db = new ExecFunctionDB();

// Initialize default settings if not exists
export async function initializeDatabase() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      apiKey: '',
      pomodoroWork: 25,
      pomodoroBreak: 5,
      theme: 'dark',
      voiceLanguage: 'en-US',
      zenMode: false,
      chimeInterval: 0,
      showRollingStats: true,
      sidebarCollapsed: false,
      bodyDoublingEnabled: false,
    });
  }

  // Add default coping strategies if none exist
  const strategiesCount = await db.copingStrategies.count();
  if (strategiesCount === 0) {
    await db.copingStrategies.bulkAdd([
      {
        name: '5-4-3-2-1 Grounding',
        category: 'grounding',
        description: 'Use your senses to ground yourself in the present moment',
        steps: [
          'Name 5 things you can SEE',
          'Name 4 things you can TOUCH',
          'Name 3 things you can HEAR',
          'Name 2 things you can SMELL',
          'Name 1 thing you can TASTE',
        ],
        timesUsed: 0,
        isFavorite: true,
      },
      {
        name: 'Box Breathing',
        category: 'breathing',
        description: 'A calming breathing technique used by Navy SEALs',
        steps: [
          'Breathe in for 4 seconds',
          'Hold for 4 seconds',
          'Breathe out for 4 seconds',
          'Hold for 4 seconds',
          'Repeat 4 times',
        ],
        timesUsed: 0,
        isFavorite: true,
      },
      {
        name: '4-7-8 Breathing',
        category: 'breathing',
        description: 'A relaxing breath pattern to reduce anxiety',
        steps: [
          'Breathe in through nose for 4 seconds',
          'Hold your breath for 7 seconds',
          'Exhale through mouth for 8 seconds',
          'Repeat 3-4 times',
        ],
        timesUsed: 0,
        isFavorite: false,
      },
      {
        name: 'Cognitive Reframe',
        category: 'cognitive',
        description: 'Challenge and reframe negative thoughts',
        steps: [
          'Identify the negative thought',
          'Ask: Is this thought based on facts?',
          'What evidence contradicts this thought?',
          'What would I tell a friend thinking this?',
          'Create a balanced alternative thought',
        ],
        timesUsed: 0,
        isFavorite: false,
      },
      {
        name: 'Progressive Muscle Relaxation',
        category: 'physical',
        description: 'Release tension by tensing and relaxing muscles',
        steps: [
          'Start with your feet - tense for 5 seconds',
          'Release and notice the relaxation',
          'Move to calves, then thighs',
          'Continue up through stomach, chest, arms',
          'Finish with face and head',
        ],
        timesUsed: 0,
        isFavorite: false,
      },
    ]);
  }
}

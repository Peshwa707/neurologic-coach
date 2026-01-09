import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Settings, Task, MoodLog, ThoughtDump, TimeBlock, PomodoroSession, ImpulseLog, CopingStrategy, JournalEntry, CoachSession, ChatMessage } from '../db/database';

// Re-export types for convenience
export type { Task, TaskStep, ThoughtDump, MoodLog, TimeBlock, PomodoroSession, ImpulseLog, CopingStrategy, JournalEntry, Settings, CoachSession, ChatMessage, Reminder } from '../db/database';

// Settings hooks
export function useSettings() {
  return useLiveQuery(() => db.settings.toCollection().first());
}

export async function updateSettings(updates: Partial<Settings>) {
  const settings = await db.settings.toCollection().first();
  if (settings?.id) {
    await db.settings.update(settings.id, updates);
  }
}

// Task hooks
export function useTasks(status?: Task['status']) {
  return useLiveQuery(() => {
    if (status) {
      return db.tasks.where('status').equals(status).reverse().sortBy('createdAt');
    }
    return db.tasks.reverse().sortBy('createdAt');
  }, [status]);
}

export function useTask(id: number) {
  return useLiveQuery(() => db.tasks.get(id), [id]);
}

export async function addTask(task: Omit<Task, 'id'>) {
  return db.tasks.add(task);
}

export async function updateTask(id: number, updates: Partial<Task>) {
  return db.tasks.update(id, updates);
}

export async function deleteTask(id: number) {
  return db.tasks.delete(id);
}

// Time block hooks
export function useTimeBlocks(date: string) {
  return useLiveQuery(
    () => db.timeBlocks.where('date').equals(date).sortBy('startTime'),
    [date]
  );
}

export async function addTimeBlock(block: Omit<TimeBlock, 'id'>) {
  return db.timeBlocks.add(block);
}

export async function updateTimeBlock(id: number, updates: Partial<TimeBlock>) {
  return db.timeBlocks.update(id, updates);
}

export async function deleteTimeBlock(id: number) {
  return db.timeBlocks.delete(id);
}

// Pomodoro hooks
export function usePomodoroSessions(limit = 50) {
  return useLiveQuery(
    () => db.pomodoroSessions.orderBy('completedAt').reverse().limit(limit).toArray()
  );
}

export function useTodayPomodoros() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return useLiveQuery(
    () => db.pomodoroSessions.where('completedAt').above(today).toArray()
  );
}

export async function addPomodoroSession(session: Omit<PomodoroSession, 'id'>) {
  return db.pomodoroSessions.add(session);
}

// Mood log hooks
export function useMoodLogs(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return useLiveQuery(
    () => db.moodLogs.where('timestamp').above(startDate).sortBy('timestamp')
  );
}

export function useRecentMoodLogs(limit = 10) {
  return useLiveQuery(
    () => db.moodLogs.orderBy('timestamp').reverse().limit(limit).toArray()
  );
}

export async function addMoodLog(log: Omit<MoodLog, 'id'>) {
  return db.moodLogs.add(log);
}

// Energy pattern hooks
export function useEnergyPatternLogs(days = 14) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return useLiveQuery(
    () => db.moodLogs.where('timestamp').above(startDate).toArray(),
    [days]
  );
}

export function useLatestEnergyLog() {
  return useLiveQuery(
    () => db.moodLogs.orderBy('timestamp').reverse().first()
  );
}

// Thought dump hooks
export function useThoughtDumps(limit = 20) {
  return useLiveQuery(
    () => db.thoughtDumps.orderBy('timestamp').reverse().limit(limit).toArray()
  );
}

export async function addThoughtDump(dump: Omit<ThoughtDump, 'id'>) {
  return db.thoughtDumps.add(dump);
}

export async function updateThoughtDump(id: number, updates: Partial<ThoughtDump>) {
  return db.thoughtDumps.update(id, updates);
}

// Impulse log hooks
export function useImpulseLogs(limit = 20) {
  return useLiveQuery(
    () => db.impulseLogs.orderBy('timestamp').reverse().limit(limit).toArray()
  );
}

export async function addImpulseLog(log: Omit<ImpulseLog, 'id'>) {
  return db.impulseLogs.add(log);
}

// Coping strategy hooks
export function useCopingStrategies(category?: CopingStrategy['category']) {
  return useLiveQuery(() => {
    if (category) {
      return db.copingStrategies.where('category').equals(category).toArray();
    }
    return db.copingStrategies.toArray();
  }, [category]);
}

export function useFavoriteCopingStrategies() {
  return useLiveQuery(
    () => db.copingStrategies.filter(s => s.isFavorite === true).toArray()
  );
}

export async function updateCopingStrategy(id: number, updates: Partial<CopingStrategy>) {
  return db.copingStrategies.update(id, updates);
}

export async function incrementStrategyUsage(id: number) {
  const strategy = await db.copingStrategies.get(id);
  if (strategy) {
    await db.copingStrategies.update(id, { timesUsed: strategy.timesUsed + 1 });
  }
}

// Journal hooks
export function useJournalEntries(limit = 20) {
  return useLiveQuery(
    () => db.journalEntries.orderBy('timestamp').reverse().limit(limit).toArray()
  );
}

export async function addJournalEntry(entry: Omit<JournalEntry, 'id'>) {
  return db.journalEntries.add(entry);
}

// Stats hooks
export async function getWeeklyStats() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const [tasks, pomodoros, moods] = await Promise.all([
    db.tasks.filter(t => t.completedAt !== undefined && new Date(t.completedAt) > startDate).toArray(),
    db.pomodoroSessions.where('completedAt').above(startDate).toArray(),
    db.moodLogs.where('timestamp').above(startDate).toArray(),
  ]);

  const completedTasks = tasks.length;
  const totalPomodoros = pomodoros.filter(p => p.type === 'work').length;
  const totalFocusMinutes = pomodoros
    .filter(p => p.type === 'work' && !p.interrupted)
    .reduce((sum, p) => sum + p.duration, 0);
  const avgMood = moods.length > 0
    ? moods.reduce((sum, m) => sum + m.mood, 0) / moods.length
    : 0;
  const avgEnergy = moods.length > 0
    ? moods.reduce((sum, m) => sum + m.energy, 0) / moods.length
    : 0;

  return {
    completedTasks,
    totalPomodoros,
    totalFocusMinutes,
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    moodLogs: moods.length,
  };
}

// Coach session hooks
export function useCoachSessions(limit = 20) {
  return useLiveQuery(
    () => db.coachSessions.orderBy('updatedAt').reverse().limit(limit).toArray()
  );
}

export function useCoachSession(id: number) {
  return useLiveQuery(() => db.coachSessions.get(id), [id]);
}

export function useActiveCoachSessions() {
  return useLiveQuery(
    async () => {
      const sessions = await db.coachSessions.filter(s => s.resolved === false).toArray();
      return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  );
}

export async function createCoachSession(title: string, initialMessage?: string): Promise<number> {
  const now = new Date();
  const messages: ChatMessage[] = initialMessage ? [{
    role: 'user',
    content: initialMessage,
    timestamp: now,
  }] : [];

  return db.coachSessions.add({
    title,
    messages,
    resolved: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function addMessageToSession(sessionId: number, message: Omit<ChatMessage, 'timestamp'>) {
  const session = await db.coachSessions.get(sessionId);
  if (session) {
    const newMessage: ChatMessage = {
      ...message,
      timestamp: new Date(),
    };
    await db.coachSessions.update(sessionId, {
      messages: [...session.messages, newMessage],
      updatedAt: new Date(),
    });
  }
}

export async function updateCoachSession(id: number, updates: Partial<CoachSession>) {
  return db.coachSessions.update(id, { ...updates, updatedAt: new Date() });
}

export async function resolveCoachSession(id: number, moodAfter?: number) {
  return db.coachSessions.update(id, {
    resolved: true,
    moodAfter,
    updatedAt: new Date(),
  });
}

export async function deleteCoachSession(id: number) {
  return db.coachSessions.delete(id);
}

// Reminder hooks
export function useActiveReminders() {
  return useLiveQuery(
    () => db.reminders.filter(r => r.isActive === true).toArray()
  );
}

export function useReminders(limit = 20) {
  return useLiveQuery(
    () => db.reminders.orderBy('createdAt').reverse().limit(limit).toArray()
  );
}

export async function addReminder(reminder: {
  taskId?: number;
  message: string;
  triggerType: 'time' | 'energy' | 'context';
  triggerValue: string;
}) {
  return db.reminders.add({
    ...reminder,
    isActive: true,
    createdAt: new Date(),
  });
}

export async function triggerReminder(id: number) {
  return db.reminders.update(id, {
    isActive: false,
    triggeredAt: new Date(),
  });
}

export async function deleteReminder(id: number) {
  return db.reminders.delete(id);
}

// Reminder scheduling and notification utilities

import type { Reminder } from '../db/database';

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Check if notifications are supported and enabled
export function notificationsEnabled(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// Show a browser notification
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!notificationsEnabled()) {
    console.log('Notifications not enabled');
    return null;
  }

  const notification = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  });

  // Auto-close after 10 seconds
  setTimeout(() => notification.close(), 10000);

  return notification;
}

// Check if a time-based reminder should trigger
export function checkTimeReminder(reminder: Reminder): boolean {
  if (reminder.triggerType !== 'time') return false;

  const now = new Date();
  const [hours, minutes] = reminder.triggerValue.split(':').map(Number);

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  // Trigger if we're within the same minute
  return currentHours === hours && currentMinutes === minutes;
}

// Check if an energy-based reminder should trigger
export function checkEnergyReminder(
  reminder: Reminder,
  currentEnergy: number | undefined
): boolean {
  if (reminder.triggerType !== 'energy' || currentEnergy === undefined) return false;

  const targetEnergy = reminder.triggerValue;

  if (targetEnergy === 'high' && currentEnergy >= 4) return true;
  if (targetEnergy === 'medium' && currentEnergy >= 3) return true;
  if (targetEnergy === 'low') return true; // Always trigger for low energy reminders

  return false;
}

// Check if a context-based reminder should trigger
// Context reminders trigger once per session or after a delay
export function checkContextReminder(
  reminder: Reminder,
  triggeredIds: Set<number>
): boolean {
  if (reminder.triggerType !== 'context') return false;
  if (!reminder.id) return false;

  // Don't re-trigger if already triggered this session
  if (triggeredIds.has(reminder.id)) return false;

  // Context reminders with 'anytime' trigger after 5 minutes from creation
  if (reminder.triggerValue === 'anytime') {
    const createdAt = new Date(reminder.createdAt);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return minutesSinceCreation >= 5;
  }

  return false;
}

// Check all active reminders and return those that should trigger
export function checkReminders(
  reminders: Reminder[],
  context: {
    currentEnergy?: number;
    triggeredIds: Set<number>;
  }
): Reminder[] {
  const triggeredReminders: Reminder[] = [];

  for (const reminder of reminders) {
    if (!reminder.isActive) continue;

    let shouldTrigger = false;

    switch (reminder.triggerType) {
      case 'time':
        shouldTrigger = checkTimeReminder(reminder);
        break;
      case 'energy':
        shouldTrigger = checkEnergyReminder(reminder, context.currentEnergy);
        break;
      case 'context':
        shouldTrigger = checkContextReminder(reminder, context.triggeredIds);
        break;
    }

    if (shouldTrigger) {
      triggeredReminders.push(reminder);
    }
  }

  return triggeredReminders;
}

// Format reminder trigger info for display
export function formatReminderTrigger(reminder: Reminder): string {
  switch (reminder.triggerType) {
    case 'time':
      return `At ${reminder.triggerValue}`;
    case 'energy':
      return `When energy is ${reminder.triggerValue}`;
    case 'context':
      return reminder.triggerValue === 'anytime' ? 'Anytime' : reminder.triggerValue;
    default:
      return '';
  }
}

// Get icon name for trigger type
export function getReminderIcon(triggerType: Reminder['triggerType']): string {
  switch (triggerType) {
    case 'time':
      return 'Clock';
    case 'energy':
      return 'Zap';
    case 'context':
      return 'Bell';
    default:
      return 'Bell';
  }
}

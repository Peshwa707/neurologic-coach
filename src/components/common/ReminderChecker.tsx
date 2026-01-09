import { useEffect, useRef, useCallback } from 'react';
import { useActiveReminders, useLatestEnergyLog, triggerReminder } from '../../hooks/useDatabase';
import {
  requestNotificationPermission,
  checkReminders,
  showNotification,
  notificationsEnabled,
} from '../../utils/reminders';

const CHECK_INTERVAL = 30000; // Check every 30 seconds

export function ReminderChecker() {
  const activeReminders = useActiveReminders();
  const latestEnergyLog = useLatestEnergyLog();
  const triggeredIdsRef = useRef<Set<number>>(new Set());
  const hasRequestedPermission = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (!hasRequestedPermission.current) {
      hasRequestedPermission.current = true;
      requestNotificationPermission().then((granted) => {
        if (granted) {
          console.log('Notification permission granted');
        }
      });
    }
  }, []);

  const checkAndTrigger = useCallback(async () => {
    if (!activeReminders || activeReminders.length === 0) return;

    // Get current energy level from most recent log (within last 2 hours)
    let currentEnergy: number | undefined;
    if (latestEnergyLog) {
      const logTime = new Date(latestEnergyLog.timestamp);
      const now = new Date();
      const hoursSinceLog = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLog <= 2) {
        currentEnergy = latestEnergyLog.energy;
      }
    }

    const remindersToTrigger = checkReminders(activeReminders, {
      currentEnergy,
      triggeredIds: triggeredIdsRef.current,
    });

    for (const reminder of remindersToTrigger) {
      // Show notification
      if (notificationsEnabled()) {
        showNotification('NeuroLogic Reminder', {
          body: reminder.message,
          tag: `reminder-${reminder.id}`,
          requireInteraction: true,
        });
      }

      // Mark as triggered in database
      if (reminder.id) {
        await triggerReminder(reminder.id);
        triggeredIdsRef.current.add(reminder.id);
      }
    }
  }, [activeReminders, latestEnergyLog]);

  // Set up periodic checking
  useEffect(() => {
    // Check immediately on mount/change
    checkAndTrigger();

    // Set up interval
    const intervalId = setInterval(checkAndTrigger, CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [checkAndTrigger]);

  // This component doesn't render anything
  return null;
}

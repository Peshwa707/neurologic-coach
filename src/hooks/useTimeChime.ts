import { useEffect, useRef } from 'react';
import { useSettings } from './useDatabase';

// Gentle chime frequencies (pleasant bell-like tones)
const CHIME_FREQUENCIES = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)

function playChime() {
  try {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    CHIME_FREQUENCIES.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

      // Gentle fade in and out
      const startTime = audioContext.currentTime + (index * 0.1);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);

      oscillator.start(startTime);
      oscillator.stop(startTime + 1.5);
    });

    // Show a subtle notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Time Check', {
        body: `It's ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. How are you doing?`,
        icon: '/icons/icon-192x192.png',
        silent: true,
        tag: 'time-chime',
      });
    }
  } catch (error) {
    console.warn('Could not play chime:', error);
  }
}

export function useTimeChime() {
  const settings = useSettings();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastChimeRef = useRef<number>(0);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const chimeInterval = settings?.chimeInterval || 0;

    // If chimes are disabled, do nothing
    if (chimeInterval === 0) return;

    // Convert minutes to milliseconds
    const intervalMs = chimeInterval * 60 * 1000;

    // Request notification permission on first enable
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Set up interval
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      // Prevent double-chimes (debounce to 30 seconds)
      if (now - lastChimeRef.current > 30000) {
        lastChimeRef.current = now;
        playChime();
      }
    }, intervalMs);

    // Cleanup on unmount or settings change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [settings?.chimeInterval]);

  // Return a function to manually trigger a chime (for testing)
  return { playChime };
}

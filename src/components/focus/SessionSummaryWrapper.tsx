import { usePomodoroOptional } from '../../contexts/PomodoroContext';
import { SessionSummary } from './SessionSummary';

export function SessionSummaryWrapper() {
  const pomodoro = usePomodoroOptional();

  if (!pomodoro) return null;

  const { sessionSummary, closeSessionSummary, todayWorkSessions, todayFocusMinutes } = pomodoro;

  return (
    <SessionSummary
      isOpen={sessionSummary.isOpen}
      onClose={closeSessionSummary}
      duration={sessionSummary.duration}
      wasInterrupted={sessionSummary.wasInterrupted}
      todaySessionCount={todayWorkSessions}
      todayFocusMinutes={todayFocusMinutes}
    />
  );
}

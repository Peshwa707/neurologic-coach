import { PomodoroTimer } from '../components/time/PomodoroTimer';
import { TimeBlocker } from '../components/time/TimeBlocker';

export function TimePage() {
  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Time Management</h1>
        <p className="text-slate-400 mt-1">Focus timer and schedule planning</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PomodoroTimer />
        <TimeBlocker />
      </div>
    </div>
  );
}

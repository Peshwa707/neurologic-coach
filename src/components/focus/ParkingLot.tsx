import { useState, useRef } from 'react';
import { ParkingCircle, CheckSquare, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { usePomodoroOptional } from '../../contexts/PomodoroContext';

export function ParkingLot() {
  const pomodoro = usePomodoroOptional();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only show during active work sessions
  if (!pomodoro || !pomodoro.isRunning || !pomodoro.isWorkSession) {
    return null;
  }

  const { parkingLot, addToParkingLot, removeFromParkingLot, convertToTask } = pomodoro;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      addToParkingLot(input);
      setInput('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard shortcut: Escape to close
    if (e.key === 'Escape') {
      setInput('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-40 w-72">
      {/* Collapsed view - just the input */}
      <div className="bg-slate-900/95 backdrop-blur-lg border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ParkingCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Parking Lot</span>
            {parkingLot.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-500/30 text-amber-300 rounded">
                {parkingLot.length}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-amber-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Quick input - always visible */}
        <form onSubmit={handleSubmit} className="p-2 border-b border-slate-800">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Park a thought for later..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-[10px] text-slate-500 mt-1 px-1">
            Quick capture intrusive thoughts to deal with later
          </p>
        </form>

        {/* Expanded list */}
        {isExpanded && parkingLot.length > 0 && (
          <div className="max-h-48 overflow-y-auto">
            {parkingLot.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 px-3 py-2 border-b border-slate-800 last:border-0 group"
              >
                <span className="flex-1 text-sm text-slate-300 break-words">
                  {item.text}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => convertToTask(item)}
                    className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                    title="Convert to task"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeFromParkingLot(item.id)}
                    className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                    title="Dismiss"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isExpanded && parkingLot.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-sm text-slate-500">No parked thoughts yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Type above to capture distracting thoughts
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

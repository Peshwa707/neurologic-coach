import { useState } from 'react';
import { X, Plus, Clock, Home, Briefcase, Sun, Moon, Dumbbell, BookOpen, ShoppingCart, Utensils } from 'lucide-react';
import { addTask } from '../../hooks/useDatabase';

interface TaskTemplate {
  id: string;
  name: string;
  icon: typeof Sun;
  color: string;
  description: string;
  tasks: {
    title: string;
    estimatedMinutes: number;
    energyLevel: 1 | 2 | 3 | 4 | 5;
    resistance: 1 | 2 | 3 | 4 | 5;
  }[];
}

const templates: TaskTemplate[] = [
  {
    id: 'morning',
    name: 'Morning Routine',
    icon: Sun,
    color: 'from-amber-500 to-orange-500',
    description: 'Start your day with structure',
    tasks: [
      { title: 'Make bed', estimatedMinutes: 2, energyLevel: 2, resistance: 1 },
      { title: 'Brush teeth & wash face', estimatedMinutes: 5, energyLevel: 2, resistance: 1 },
      { title: 'Get dressed', estimatedMinutes: 5, energyLevel: 2, resistance: 2 },
      { title: 'Breakfast', estimatedMinutes: 15, energyLevel: 3, resistance: 1 },
      { title: 'Review today\'s priorities', estimatedMinutes: 5, energyLevel: 3, resistance: 2 },
    ],
  },
  {
    id: 'evening',
    name: 'Evening Wind-Down',
    icon: Moon,
    color: 'from-indigo-500 to-purple-500',
    description: 'Prepare for restful sleep',
    tasks: [
      { title: 'Set out clothes for tomorrow', estimatedMinutes: 5, energyLevel: 2, resistance: 2 },
      { title: 'Quick tidy - 10 things', estimatedMinutes: 10, energyLevel: 2, resistance: 2 },
      { title: 'Prepare bag/items for tomorrow', estimatedMinutes: 5, energyLevel: 2, resistance: 2 },
      { title: 'Skincare routine', estimatedMinutes: 5, energyLevel: 1, resistance: 1 },
      { title: 'Screen-free wind down', estimatedMinutes: 30, energyLevel: 1, resistance: 3 },
    ],
  },
  {
    id: 'work-block',
    name: 'Deep Work Block',
    icon: Briefcase,
    color: 'from-blue-500 to-cyan-500',
    description: '90-minute focused work session',
    tasks: [
      { title: 'Clear workspace', estimatedMinutes: 5, energyLevel: 3, resistance: 2 },
      { title: 'Define session goal (1 thing)', estimatedMinutes: 3, energyLevel: 3, resistance: 2 },
      { title: 'Close distracting apps/tabs', estimatedMinutes: 2, energyLevel: 3, resistance: 3 },
      { title: 'Deep work sprint (25 min)', estimatedMinutes: 25, energyLevel: 4, resistance: 4 },
      { title: 'Quick break (5 min)', estimatedMinutes: 5, energyLevel: 2, resistance: 1 },
      { title: 'Deep work sprint (25 min)', estimatedMinutes: 25, energyLevel: 4, resistance: 4 },
      { title: 'Review progress & next steps', estimatedMinutes: 5, energyLevel: 3, resistance: 2 },
    ],
  },
  {
    id: 'exercise',
    name: 'Exercise Prep',
    icon: Dumbbell,
    color: 'from-emerald-500 to-teal-500',
    description: 'Remove friction from working out',
    tasks: [
      { title: 'Put on workout clothes', estimatedMinutes: 3, energyLevel: 2, resistance: 2 },
      { title: 'Fill water bottle', estimatedMinutes: 1, energyLevel: 2, resistance: 1 },
      { title: 'Quick warm-up stretches', estimatedMinutes: 5, energyLevel: 3, resistance: 2 },
      { title: 'Main workout', estimatedMinutes: 30, energyLevel: 5, resistance: 4 },
      { title: 'Cool down stretches', estimatedMinutes: 5, energyLevel: 2, resistance: 1 },
    ],
  },
  {
    id: 'study',
    name: 'Study Session',
    icon: BookOpen,
    color: 'from-purple-500 to-pink-500',
    description: 'ADHD-friendly study structure',
    tasks: [
      { title: 'Gather materials', estimatedMinutes: 5, energyLevel: 3, resistance: 2 },
      { title: 'Review what you already know', estimatedMinutes: 5, energyLevel: 3, resistance: 2 },
      { title: 'Active learning (15 min)', estimatedMinutes: 15, energyLevel: 4, resistance: 4 },
      { title: 'Movement break', estimatedMinutes: 5, energyLevel: 3, resistance: 1 },
      { title: 'Practice/apply (15 min)', estimatedMinutes: 15, energyLevel: 4, resistance: 3 },
      { title: 'Quick review - what did you learn?', estimatedMinutes: 5, energyLevel: 3, resistance: 2 },
    ],
  },
  {
    id: 'cleaning',
    name: 'Room Reset',
    icon: Home,
    color: 'from-rose-500 to-red-500',
    description: '20-minute room cleanup',
    tasks: [
      { title: 'Trash sweep (grab all trash)', estimatedMinutes: 3, energyLevel: 2, resistance: 2 },
      { title: 'Dishes to kitchen', estimatedMinutes: 2, energyLevel: 2, resistance: 2 },
      { title: 'Clothes to hamper/closet', estimatedMinutes: 3, energyLevel: 2, resistance: 2 },
      { title: 'Clear flat surfaces', estimatedMinutes: 5, energyLevel: 3, resistance: 3 },
      { title: 'Quick vacuum/sweep', estimatedMinutes: 5, energyLevel: 3, resistance: 3 },
      { title: 'Final scan - anything out of place?', estimatedMinutes: 2, energyLevel: 2, resistance: 1 },
    ],
  },
  {
    id: 'meal-prep',
    name: 'Meal Prep',
    icon: Utensils,
    color: 'from-orange-500 to-amber-500',
    description: 'Cook without overwhelm',
    tasks: [
      { title: 'Check recipe & gather ingredients', estimatedMinutes: 5, energyLevel: 3, resistance: 2 },
      { title: 'Prep all vegetables', estimatedMinutes: 10, energyLevel: 3, resistance: 3 },
      { title: 'Start cooking (main dish)', estimatedMinutes: 20, energyLevel: 3, resistance: 3 },
      { title: 'Clean as you go (5 min)', estimatedMinutes: 5, energyLevel: 2, resistance: 2 },
      { title: 'Plate & enjoy!', estimatedMinutes: 5, energyLevel: 2, resistance: 1 },
    ],
  },
  {
    id: 'grocery',
    name: 'Grocery Run',
    icon: ShoppingCart,
    color: 'from-lime-500 to-green-500',
    description: 'Structured shopping trip',
    tasks: [
      { title: 'Check pantry & make list', estimatedMinutes: 10, energyLevel: 3, resistance: 3 },
      { title: 'Organize list by store section', estimatedMinutes: 5, energyLevel: 3, resistance: 2 },
      { title: 'Grab bags & keys', estimatedMinutes: 2, energyLevel: 2, resistance: 1 },
      { title: 'Shop (stick to list!)', estimatedMinutes: 30, energyLevel: 3, resistance: 3 },
      { title: 'Put groceries away', estimatedMinutes: 10, energyLevel: 3, resistance: 2 },
    ],
  },
];

interface TaskTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskTemplates({ isOpen, onClose }: TaskTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAddTemplate = async (template: TaskTemplate) => {
    setIsAdding(true);
    try {
      const now = new Date();
      for (let i = 0; i < template.tasks.length; i++) {
        const task = template.tasks[i];
        await addTask({
          title: `${template.name}: ${task.title}`,
          description: `Part of ${template.name} routine`,
          steps: [],
          status: 'pending',
          estimatedMinutes: task.estimatedMinutes,
          resistance: task.resistance,
          createdAt: now,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to add template tasks:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              {selectedTemplate ? selectedTemplate.name : 'Task Templates'}
            </h2>
            <p className="text-sm text-slate-400">
              {selectedTemplate
                ? `${selectedTemplate.tasks.length} tasks • ${selectedTemplate.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)} minutes total`
                : 'Pre-built task sequences for common routines'
              }
            </p>
          </div>
          <button
            onClick={() => selectedTemplate ? setSelectedTemplate(null) : onClose()}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 max-h-[calc(85vh-8rem)]">
          {selectedTemplate ? (
            // Template detail view
            <div className="space-y-3">
              {selectedTemplate.tasks.map((task, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 font-mono text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{task.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimatedMinutes}m
                      </span>
                      <span className="text-xs text-slate-500">
                        Energy: {'⚡'.repeat(task.energyLevel)}
                      </span>
                      <span className="text-xs text-slate-500">
                        Resistance: {'🔥'.repeat(task.resistance)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add button */}
              <button
                onClick={() => handleAddTemplate(selectedTemplate)}
                disabled={isAdding}
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {isAdding ? 'Adding Tasks...' : 'Add All Tasks'}
              </button>
            </div>
          ) : (
            // Template grid
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => {
                const Icon = template.icon;
                const totalMinutes = template.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">{template.name}</h3>
                    <p className="text-xs text-slate-400 mb-2">{template.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{template.tasks.length} tasks</span>
                      <span>•</span>
                      <span>{totalMinutes}m</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

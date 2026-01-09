import { NavLink } from 'react-router-dom';
import {
  Clock,
  CheckSquare,
  Brain,
  Shield,
  Heart,
  Mic,
  Settings,
  LayoutDashboard,
  MessageCircle,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/coach', icon: MessageCircle, label: 'Coach' },
  { to: '/time', icon: Clock, label: 'Time' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/awareness', icon: Brain, label: 'Awareness' },
  { to: '/inhibition', icon: Shield, label: 'Inhibition' },
  { to: '/emotional', icon: Heart, label: 'Emotional' },
  { to: '/voice', icon: Mic, label: 'Voice Dump' },
];

export function Navigation() {
  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 bg-slate-900/50 border-r border-slate-800 p-4">
        <div className="flex items-center gap-3 px-3 py-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">NeuroLogic</h1>
            <p className="text-xs text-slate-400">Coach</p>
          </div>
        </div>

        <div className="space-y-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mt-auto ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </NavLink>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 z-50">
        <div className="flex justify-around items-center">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  isActive ? 'text-indigo-400' : 'text-slate-500'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/voice"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'text-indigo-400' : 'text-slate-500'
              }`
            }
          >
            <Mic className="w-5 h-5" />
            <span className="text-[10px] font-medium">Voice</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
}

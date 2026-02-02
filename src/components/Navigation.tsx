import { useState } from 'react';
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
  Key,
  X,
  Check,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useSettings, updateSettings } from '../hooks/useDatabase';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/coach', icon: MessageCircle, label: 'Coach' },
  { to: '/time', icon: Clock, label: 'Time' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/organize', icon: Sparkles, label: 'Organize' },
  { to: '/awareness', icon: Brain, label: 'Awareness' },
  { to: '/inhibition', icon: Shield, label: 'Inhibition' },
  { to: '/emotional', icon: Heart, label: 'Emotional' },
  { to: '/voice', icon: Mic, label: 'Voice Dump' },
];

export function Navigation() {
  const settings = useSettings();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveApiKey = async () => {
    await updateSettings({ apiKey });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowApiKeyModal(false);
    }, 1500);
  };

  const openApiKeyModal = () => {
    setApiKey(settings?.apiKey || '');
    setShowApiKeyModal(true);
  };

  return (
    <>
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowApiKeyModal(false)}
          />
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5">
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Claude API Key</h3>
                <p className="text-xs text-slate-400">Required for AI features</p>
              </div>
            </div>

            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-3"
            />

            <p className="text-xs text-slate-500 mb-4">
              Get your key at{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                console.anthropic.com
              </a>
            </p>

            <button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" />
                  Saved!
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Save API Key
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <nav className={`hidden md:flex flex-col ${settings?.sidebarCollapsed ? 'w-16' : 'w-64'} bg-slate-900/50 border-r border-slate-800 p-4 transition-all duration-300`}>
        <div className={`flex items-center ${settings?.sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-4 mb-6`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          {!settings?.sidebarCollapsed && (
            <div>
              <h1 className="font-bold text-white">NeuroLogic</h1>
              <p className="text-xs text-slate-400">Coach</p>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={() => updateSettings({ sidebarCollapsed: !settings?.sidebarCollapsed })}
          className={`flex items-center ${settings?.sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 mb-4 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all`}
          title={settings?.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {settings?.sidebarCollapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5" />
              <span className="font-medium text-sm">Collapse</span>
            </>
          )}
        </button>

        <div className="space-y-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={settings?.sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${settings?.sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!settings?.sidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </div>

        <NavLink
          to="/settings"
          title={settings?.sidebarCollapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            `flex items-center ${settings?.sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg transition-all mt-auto ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!settings?.sidebarCollapsed && <span className="font-medium">Settings</span>}
        </NavLink>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 z-50">
        <div className="flex justify-around items-center">
          {navItems.slice(0, 3).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
                  isActive ? 'text-indigo-400' : 'text-slate-500'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/organize"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
                isActive ? 'text-purple-400' : 'text-slate-500'
              }`
            }
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] font-medium">Organize</span>
          </NavLink>
          <NavLink
            to="/voice"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
                isActive ? 'text-indigo-400' : 'text-slate-500'
              }`
            }
          >
            <Mic className="w-5 h-5" />
            <span className="text-[10px] font-medium">Voice</span>
          </NavLink>
          <button
            onClick={openApiKeyModal}
            className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
              settings?.apiKey ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            <Key className="w-5 h-5" />
            <span className="text-[10px] font-medium">API Key</span>
          </button>
        </div>
      </nav>
    </>
  );
}

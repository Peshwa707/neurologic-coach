import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { QuickCapture, ReminderChecker } from './components/common';
import { Dashboard } from './pages/Dashboard';
import { TimePage } from './pages/TimePage';
import { TasksPage } from './pages/TasksPage';
import { AwarenessPage } from './pages/AwarenessPage';
import { InhibitionPage } from './pages/InhibitionPage';
import { EmotionalPage } from './pages/EmotionalPage';
import { VoicePage } from './pages/VoicePage';
import { CoachPage } from './pages/CoachPage';
import { Settings } from './pages/Settings';
import { initializeDatabase } from './db/database';

function App() {
  useEffect(() => {
    initializeDatabase().catch(err => {
      console.error('Database initialization failed:', err);
    });
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#0f0f1a]">
        <Navigation />
        <main className="flex-1 overflow-y-auto md:ml-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/time" element={<TimePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/awareness" element={<AwarenessPage />} />
            <Route path="/inhibition" element={<InhibitionPage />} />
            <Route path="/emotional" element={<EmotionalPage />} />
            <Route path="/voice" element={<VoicePage />} />
            <Route path="/coach" element={<CoachPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <QuickCapture />
        <ReminderChecker />
      </div>
    </BrowserRouter>
  );
}

export default App;

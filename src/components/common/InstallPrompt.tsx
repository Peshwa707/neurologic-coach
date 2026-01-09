import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from './Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay to not be intrusive
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect when app is installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setShowPrompt(false);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (!showPrompt || isInstalled || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 shadow-2xl border border-indigo-500/30">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm">Install NeuroLogic Coach</h3>
            <p className="text-xs text-indigo-100 mt-1">
              Add to your home screen for quick access and offline use. Your data stays private on your device.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-white text-indigo-600 hover:bg-indigo-50"
            size="sm"
          >
            <Download className="w-4 h-4" />
            Install App
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/20"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}

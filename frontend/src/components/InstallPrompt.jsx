import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show install prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Show again after 24 hours
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Don't show if dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < dayInMs) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-2xl p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/80 hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <Download className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Install TytajExpress</h3>
          <p className="text-sm text-white/90 mb-3">
            Install our app for faster access and offline capabilities!
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

export default InstallPrompt;

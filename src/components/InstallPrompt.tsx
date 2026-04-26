'use client';

import { useState, useEffect } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showForceRefresh, setShowForceRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Show force-refresh button when ?refresh=1 is in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('refresh') === '1') setShowForceRefresh(true);
    }

    const hasPrompted = localStorage.getItem('safi_pwa_prompted');
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!hasPrompted) setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log('PWA installed');
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('safi_pwa_prompted', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('safi_pwa_prompted', 'true');
  };

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      window.location.href = window.location.pathname; // reload without ?refresh=1
    }
  };

  return (
    <>
      {/* Force-refresh panel — visible only at ?refresh=1 */}
      <AnimatePresence>
        {showForceRefresh && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-black px-4 py-3 flex items-center justify-between gap-4 shadow-lg"
          >
            <span className="text-sm font-bold">Force-refresh mode: clears service worker + all caches</span>
            <div className="flex gap-2">
              <button
                onClick={handleForceRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg disabled:opacity-60"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Clearing…' : 'Clear & Reload'}
              </button>
              <button onClick={() => setShowForceRefresh(false)} className="p-1.5 hover:bg-amber-400 rounded">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install PWA prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-zinc-900 border border-[#0077B6]/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="p-4 flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6] to-[#7EC8E3] rounded-xl flex items-center justify-center flex-shrink-0">
                <img src="/maji-safi-logo-white.png" alt="Logo" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-sm font-bold text-white font-headline">Install Maji Safi OS</h3>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Add to home screen for a faster, app-like experience.</p>
              </div>
              <button onClick={handleDismiss} className="text-zinc-500 hover:text-white transition-colors self-start -mt-1 -mr-1">
                <X size={16} />
              </button>
            </div>
            <div className="flex border-t border-zinc-800">
              <button
                onClick={handleInstall}
                className="flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-bold text-[#7EC8E3] bg-[#0077B6]/10 hover:bg-[#0077B6]/20 transition-colors"
              >
                <Download size={16} />
                Install App
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

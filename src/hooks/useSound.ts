'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

// We use Web Audio API as a fallback if the MP3s don't exist
function playSyntheticSound(type: 'success' | 'alert') {
  if (typeof window === 'undefined') return;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  if (type === 'success') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } else {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(349.23, ctx.currentTime); // F4
    osc.frequency.setValueAtTime(329.63, ctx.currentTime + 0.15); // E4
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }
}

export function useSound() {
  const { user } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      const prefs = ((user as any).preferences as Record<string, any>) || {};
      const enabled = prefs.sound_enabled ?? localStorage.getItem('safi_sound_enabled') !== 'false';
      setSoundEnabled(enabled);
    } else {
      setSoundEnabled(localStorage.getItem('safi_sound_enabled') !== 'false');
    }
  }, [user]);

  const toggleSound = async () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('safi_sound_enabled', String(newVal));
    
    if (user) {
      const prefs = ((user as any).preferences as Record<string, any>) || {};
      await supabase.from('team_members').update({ preferences: { ...prefs, sound_enabled: newVal } }).eq('id', user.id);
    }
    
    // Play test sound if enabling
    if (newVal) play('success');
  };

  const play = useCallback((type: 'success' | 'alert') => {
    if (!soundEnabled) return;
    
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.4;
    audio.play().catch(() => {
      // Fallback to synthetic if mp3 not found
      playSyntheticSound(type);
    });
  }, [soundEnabled]);

  return { play, soundEnabled, toggleSound };
}

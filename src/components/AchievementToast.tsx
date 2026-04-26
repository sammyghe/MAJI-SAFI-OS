'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  name: string;
  description: string;
  icon: string;
  rarity: string;
}

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

const RARITY_COLOR: Record<string, string> = {
  common:    '#64748b',
  uncommon:  '#0077B6',
  rare:      '#8b5cf6',
  legendary: '#f59e0b',
};

function spawnConfetti() {
  if (typeof document === 'undefined') return;
  const colors = ['#0077B6', '#7EC8E3', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div');
    const size = 6 + Math.random() * 6;
    el.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;z-index:9999;
      background:${colors[i % colors.length]};
      border-radius:${i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0'};
      top:${10 + Math.random() * 30}vh;left:${Math.random() * 100}vw;
      animation:confettiFall ${1.2 + Math.random() * 2}s ease-in forwards;
      pointer-events:none;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

export default function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    if (!achievement) return;
    spawnConfetti();
    const t = setTimeout(onDismiss, 5500);
    return () => clearTimeout(t);
  }, [achievement, onDismiss]);

  const color = achievement ? (RARITY_COLOR[achievement.rarity] ?? '#0077B6') : '#0077B6';

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          key="ach-toast"
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={onDismiss}
          style={{
            position: 'fixed', bottom: 104, right: 24, zIndex: 8900,
            background: '#0A0A0A', border: `2px solid ${color}`,
            borderRadius: 20, padding: '16px 20px', width: 300, cursor: 'pointer',
            boxShadow: `0 0 40px ${color}40`,
          }}
        >
          <div style={{ fontSize: 9, color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            🏆 Achievement Unlocked · {achievement.rarity}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 40, lineHeight: 1 }}>{achievement.icon}</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: 'Montserrat, sans-serif' }}>
                {achievement.name}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
                {achievement.description}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

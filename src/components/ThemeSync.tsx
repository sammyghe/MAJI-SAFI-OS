'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function ThemeSync() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Enforce light mode unless user has explicitly chosen dark in settings
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme || savedTheme === 'system') {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (theme) localStorage.setItem('theme', theme);
  }, [theme]);

  return null;
}

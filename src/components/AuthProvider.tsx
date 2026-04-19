'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface User {
  id: string;
  name: string;
  role: string;
  department_slug: string;
  departments: string[];
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function pingLastSeen(userId: string) {
  try {
    await supabase
      .from('team_members')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);
  } catch {
    // silent — last_seen_at is best-effort
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPing = (u: User) => {
    pingLastSeen(u.id);
    if (pingRef.current) clearInterval(pingRef.current);
    pingRef.current = setInterval(() => pingLastSeen(u.id), 60_000);
  };

  const stopPing = () => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('maji-safi-user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser) as User;
        setUser(u);
        startPing(u);
      } catch {
        localStorage.removeItem('maji-safi-user');
      }
    }
    setLoading(false);
    return () => stopPing();
  }, []);

  const login = async (pin: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) throw new Error('Invalid PIN');
      const userData = await response.json() as User;
      setUser(userData);
      localStorage.setItem('maji-safi-user', JSON.stringify(userData));
      startPing(userData);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    stopPing();
    setUser(null);
    localStorage.removeItem('maji-safi-user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

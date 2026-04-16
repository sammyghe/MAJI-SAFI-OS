'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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

// Default founder user for dev/demo
const DEFAULT_USER: User = {
  id: '1',
  name: 'Samuel Ghedamu',
  role: 'founder',
  department_slug: 'founder-office',
  departments: ['founder-office', 'finance'],
  phone: '+256700000000',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-login with default user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('maji-safi-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        setUser(DEFAULT_USER);
        localStorage.setItem('maji-safi-user', JSON.stringify(DEFAULT_USER));
      }
    } else {
      // Auto-login with default user
      setUser(DEFAULT_USER);
      localStorage.setItem('maji-safi-user', JSON.stringify(DEFAULT_USER));
    }
    setLoading(false);
  }, []);

  const login = async (pin: string) => {
    setLoading(true);
    try {
      // Call the PIN authentication API
      const response = await fetch('/api/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        throw new Error('Invalid PIN');
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('maji-safi-user', JSON.stringify(userData));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

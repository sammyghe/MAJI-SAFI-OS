'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Droplet } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setIsLoading(true);
    try {
      await login(pin);
      router.push('/founder-office');
    } catch (err) {
      setError('Invalid PIN. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#10141a] flex items-center justify-center relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0077B6]/10 to-transparent opacity-50" />

      {/* Animated background elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#0077B6]/5 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#7EC8E3]/5 rounded-full blur-3xl opacity-50" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6 py-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-8 backdrop-blur-xl">
          {/* Header */}
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-gradient-to-br from-[#0077B6] to-[#7EC8E3] rounded-lg">
              <Droplet className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-white mb-2 font-headline">
            Maji Safi OS
          </h1>
          <p className="text-center text-zinc-400 text-sm mb-8 font-label">Hydrate. Elevate.</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="pin" className="block text-sm font-semibold text-zinc-300 mb-2 font-label">
                Enter 4-Digit PIN
              </label>
              <input
                type="password"
                id="pin"
                inputMode="numeric"
                pattern="\d{4}"
                value={pin}
                onChange={handlePinChange}
                placeholder="••••"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-2xl font-mono text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0077B6] transition-colors"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400 text-center font-label">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || pin.length !== 4}
              className="w-full py-3 px-4 bg-[#0077B6] hover:bg-[#0077B6]/90 enabled:hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-200 font-label"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-zinc-500 mt-6 font-label">
            Maji Safi - Water Purification Management System
          </p>
        </div>
      </div>
    </div>
  );
}

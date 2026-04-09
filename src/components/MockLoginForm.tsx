"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import Logo from './Logo';

export default function MockLoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError || !data) {
        // Automatically "Register" them as pending if no account found
        const { error: insertError } = await supabase
          .from('users')
          .insert([{ email, name: email.split('@')[0], status: 'pending' }]);
          
        if (insertError) {
          setError('Failed to contact database.');
        } else {
          setSuccessMsg('Request submitted! A founder must approve your access in the HR portal.');
        }
      } else if (data.status === 'pending') {
        setSuccessMsg('Your account is still pending approval from a founder.');
      } else if (data.status === 'rejected') {
        setError('Your access has been revoked.');
      } else {
        // Successful login (status === 'approved')
        document.cookie = `maji_user_email=${data.email}; path=/; max-age=86400`;
        document.cookie = `maji_user_role=${data.role}; path=/; max-age=86400`;
        router.refresh(); // Tells Next.js server to re-evaluate layouts with the new cookies
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }

    setLoading(false);
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4 bg-transparent">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Team Authentication</h2>
        <p className="text-gray-400 text-sm mb-8">Enter your company email. New addresses act as registration requests.</p>
        
        {successMsg ? (
          <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-xl flex items-center gap-3 text-cyan-400 text-sm text-left animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p>{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 text-xs text-left animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {error}
              </p>
            )}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? 'Verifying...' : <>Continue <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

'use client';

import { supabase } from '@/utils/supabase';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'twitter') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center relative px-4 overflow-hidden">
      {/* Decorative Neon Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-md glassmorphism rounded-3xl p-8 space-y-8 relative z-10 border border-white/5">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter italic neon-text-cyan">
            STAN<span className="text-white">.</span>DOM
          </h1>
          <p className="text-zinc-400 text-sm font-medium tracking-widest uppercase">
            Global K-POP Fandom Hub
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black font-bold rounded-xl hover-glow-cyan transform active:scale-95 transition-all"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            onClick={() => handleSocialLogin('twitter')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-black text-white border border-white/10 font-bold rounded-xl hover-glow-magenta transform active:scale-95 transition-all"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z"
              />
            </svg>
            <span>Continue with X</span>
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#050505] px-2 text-zinc-500 font-bold">New to STAN.DOM?</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-zinc-500">
            By continuing, you agree to our{' '}
            <a href="#" className="underline hover:text-cyan-400">Terms</a> and{' '}
            <a href="#" className="underline hover:text-cyan-400">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* Decorative Text */}
      <div className="absolute bottom-10 left-10 pointer-events-none opacity-20 hidden md:block">
        <h2 className="text-8xl font-black text-transparent stroke-text tracking-widest uppercase">
          CYBERPUNK
        </h2>
      </div>
      
      <style jsx>{`
        .stroke-text {
          -webkit-text-stroke: 1px var(--neon-cyan);
        }
      `}</style>
    </div>
  );
}

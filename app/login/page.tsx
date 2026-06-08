'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, AtSign, ShieldCheck, ChevronRight, Check } from 'lucide-react';
import CountrySelector from '@/components/CountrySelector';
import { Country } from '@/constants/countryData';
import LanguageSwitcher from '@/components/LanguageSwitcher';

import { getT, Language } from '@/constants/i18n';

type AuthMode = 'login' | 'signup' | 'social';

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<AuthMode>('social');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Language>('EN');

  const router = useRouter();

  // Initialize lang from localStorage, handle bfcache and redirect if already logged in
  useEffect(() => {
    const savedLang = localStorage.getItem('stan_lang') as Language;
    if (savedLang && ['EN', 'KO', 'ES'].includes(savedLang)) {
      setLang(savedLang);
    }
    
    // Redirect if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.replace('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        window.location.replace('/');
      }
    });

    // Check if we just came back from an aborted OAuth flow (bfcache or standard back navigation)
    if (sessionStorage.getItem('oauth_in_progress') === 'true') {
      sessionStorage.removeItem('oauth_in_progress');
      // A hard location replace clears Next.js corrupted state and forces a clean initial load
      window.location.replace('/login');
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const t = getT(lang);

  const handleSelectLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('stan_lang', l);
  };

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);


  const handleSocialLogin = async (provider: 'google') => {
    try {
      setLoading(true);
      sessionStorage.setItem('oauth_in_progress', 'true');
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://standom.online';
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert(t('fillEmailPass'));
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          throw new Error(t('verifyFirst'));
        }
        throw error;
      }
      window.location.replace('/');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !userId || !country) {
      return alert(t('fillAll'));
    }
    if (!privacyAgreed) {
      return alert(t('agreePrivacy'));
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            custom_id: userId,
            country_code: country.code,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`
          }
        }
      });

      if (error) throw error;

      if (data.user?.identities?.length === 0) {
        alert(t('emailExists'));
      } else {
        alert(t('signUpSuccess'));
        setMode('login'); // Switch back to login
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center relative px-4 overflow-hidden scrollbar-none" translate="no">
      <div className="absolute inset-0 bg-black -z-20" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-lime-600/10 blur-[120px] rounded-full -z-10" />


      <div className="w-full max-w-md glassmorphism rounded-3xl p-8 space-y-6 relative z-10 border border-white/5 shadow-2xl mt-8 mb-8 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        <div className="flex justify-center">
          <LanguageSwitcher lang={lang} onSelect={handleSelectLang} />
        </div>

        <div className="text-center space-y-2">
          <img src="/stan_dom_logo_transparent2.png" alt="STAN.DOM Logo" className="h-24 mx-auto cursor-pointer object-contain" onClick={() => setMode('social')} />
          <p className="text-zinc-400 text-sm font-medium tracking-widest uppercase">
            {t('hubSub')}
          </p>
        </div>

        {/* --- SOCIAL ENTRY VIEW --- */}
        {mode === 'social' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(55,197,97,0.4)] transform active:scale-95 transition-all"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{t('continueGoogle')}</span>
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#050505] px-3 border border-white/5 rounded-full text-zinc-500 font-bold py-1">{t('orContinueEmail')}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('login')} className="py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all">{t('login')}</button>
              <button onClick={() => setMode('signup')} className="py-3 bg-neon-lime/10 border border-neon-lime/50 rounded-xl text-xs font-bold text-neon-lime hover:bg-neon-lime/20 transition-all shadow-[0_0_15px_rgba(55,197,97,0.1)]">{t('nominate')}</button>
            </div>

            <Link href="/" className="mt-8 flex items-center justify-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
              <span>{t('guest')}</span> <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* --- LOGIN VIEW --- */}
        {mode === 'login' && (
          <form onSubmit={handleEmailSignIn} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input type="email" placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-neon-cyan transition-colors" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-neon-cyan transition-colors" />
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full py-4 bg-neon-lime text-black font-black rounded-xl hover:shadow-[0_0_20px_rgba(55,197,97,0.4)] transform active:scale-95 transition-all text-sm tracking-widest uppercase">
              {loading ? t('authenticating') : t('signIn')}
            </button>

            <div className="flex justify-between items-center text-xs pt-4 font-black text-zinc-500">
              <button type="button" onClick={() => setMode('social')} className="hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"><ChevronLeft size={14} /> {t('back')}</button>
              <button type="button" onClick={() => setMode('signup')} className="hover:text-neon-lime transition-colors uppercase tracking-widest">{t('signUp')}</button>
            </div>
          </form>
        )}

        {/* --- SIGN UP VIEW --- */}
        {mode === 'signup' && (
          <form onSubmit={handleEmailSignUp} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input type="email" placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-neon-magenta transition-colors" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-neon-magenta transition-colors" />
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input type="text" placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-neon-magenta transition-colors" />
                </div>
                <div className="relative flex-1">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input type="text" placeholder={t('nickname')} value={userId} onChange={e => setUserId(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-neon-magenta transition-colors" />
                </div>
              </div>

              {/* Country Node Selector */}
              <div className="bg-black/50 border border-white/10 rounded-xl p-1">
              <div className="bg-black/50 border border-white/10 rounded-xl p-1 relative">
                <div className="flex items-center px-3 py-2 text-xs font-black tracking-widest text-zinc-400 uppercase gap-2 mb-1">
                  <ShieldCheck size={14} className="text-neon-cyan" /> {t('selectCountry')}
                </div>
                <div className="px-2 pb-2">
                  <CountrySelector selected={country} onSelect={setCountry} lang={lang} />
                  {!country && (
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-red-500 text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-500/20 z-20">
                      {t('required')}
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Policy */}
              <div className="flex items-start gap-3 mt-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <button type="button" onClick={() => setPrivacyAgreed(!privacyAgreed)} className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${privacyAgreed ? 'bg-neon-cyan border-neon-cyan text-black' : 'border-zinc-500 bg-transparent'}`}>
                  {privacyAgreed && <Check size={14} />}
                </button>
                <label className="text-[10px] text-zinc-400 leading-relaxed cursor-pointer" onClick={() => setPrivacyAgreed(!privacyAgreed)}>
                  {t('privacyRequired')}
                </label>
              </div>

              {/* Email Confirmation Explanation */}
              <div className="bg-neon-magenta/10 border border-neon-magenta/30 rounded-xl p-3 mt-2 text-[10px] text-zinc-300 leading-relaxed">
                <strong className="text-neon-magenta font-black block mb-1">📧 {t('authEmailVerify')}</strong>
                {t('authEmailNote')}
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full py-4 mt-2 bg-neon-magenta text-white font-black rounded-xl hover-glow-magenta transform active:scale-95 transition-all text-sm tracking-widest uppercase shadow-[0_0_15px_rgba(255,0,255,0.3)]">
              {loading ? t('initializing') : t('register')}
            </button>

            <div className="flex justify-between items-center text-xs pt-4 font-black text-zinc-500">
              <button type="button" onClick={() => setMode('social')} className="hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"><ChevronLeft size={14} /> {t('back')}</button>
              <button type="button" onClick={() => setMode('login')} className="hover:text-neon-magenta transition-colors uppercase tracking-widest flex items-center gap-1">{t('hasAccount')}</button>
            </div>
          </form>
        )}
      </div>

      {/* Decorative Elements Removed */}

      <style jsx>{`
        .stroke-text {
          -webkit-text-stroke: 1px var(--neon-cyan);
        }
      `}</style>
    </div>
  );
}

function ChevronLeft({ className, size }: { className?: string, size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6" /></svg>
}

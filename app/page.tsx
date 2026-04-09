'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { voteForArtist } from '@/actions/vote';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Vote, Search, PlusCircle, Sparkles, Globe as GlobeIcon, Map } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Language, getT } from '@/constants/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CountryRankingPopup from '@/components/CountryRankingPopup';
import CountrySelector, { Country } from '@/components/CountrySelector';

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), { ssr: false });
const FlatMap = dynamic(() => import('@/components/FlatMap'), { ssr: false });

type MapView = 'globe' | 'flat';

interface Artist {
  id: string;
  name: string;
  image_url: string | null;
  total_votes: number;
}

export default function Dashboard() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [countryStats, setCountryStats] = useState<Record<string, number>>({});
  const [countryArtistVotes, setCountryArtistVotes] = useState<Record<string, Record<string, number>>>({});
  const [lastVoteCountry, setLastVoteCountry] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lang, setLang] = useState<Language>('EN');
  const [countryPopup, setCountryPopup] = useState<{ code: string; name: string } | null>(null);
  const [userCountry, setUserCountry] = useState<Country | null>(null);
  const [mapView, setMapView] = useState<MapView>('globe');

  const t = getT(lang);

  useEffect(() => {
    const browserLang = navigator.language?.startsWith('ko') ? 'KO' : 'EN';
    setLang(browserLang);
    fetchInitialData();

    const artistsChannel = supabase
      .channel('artists_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artists' }, () => fetchArtists())
      .subscribe();

    const votesChannel = supabase
      .channel('votes_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' },
        (payload) => {
          const v = payload.new as { country_code: string; artist_id: string };
          handleIncomingVote(v.country_code, v.artist_id);
        })
      .subscribe();

    return () => {
      supabase.removeChannel(artistsChannel);
      supabase.removeChannel(votesChannel);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchArtists(), fetchCountryStats()]);
    setLoading(false);
  };

  const fetchArtists = async () => {
    const { data, error } = await supabase.from('artists').select('*').order('total_votes', { ascending: false });
    if (!error) setArtists(data || []);
  };

  const fetchCountryStats = async () => {
    const { data, error } = await supabase.from('votes').select('country_code, artist_id');
    if (error) return;
    const stats: Record<string, number> = {};
    const artistVotes: Record<string, Record<string, number>> = {};
    for (const row of data || []) {
      const code = row.country_code || 'UN';
      stats[code] = (stats[code] || 0) + 1;
      if (!artistVotes[code]) artistVotes[code] = {};
      artistVotes[code][row.artist_id] = (artistVotes[code][row.artist_id] || 0) + 1;
    }
    setCountryStats(stats);
    setCountryArtistVotes(artistVotes);
  };

  const handleIncomingVote = useCallback((countryCode: string, artistId: string) => {
    setLastVoteCountry(countryCode);
    setTimeout(() => setLastVoteCountry(undefined), 100);
    setCountryStats(prev => ({ ...prev, [countryCode]: (prev[countryCode] || 0) + 1 }));
    setCountryArtistVotes(prev => ({
      ...prev,
      [countryCode]: { ...(prev[countryCode] || {}), [artistId]: ((prev[countryCode] || {})[artistId] || 0) + 1 }
    }));
  }, []);

  const handleVote = async (id: string, currentVotes: number) => {
    if (!userCountry) {
      // Shake prompt if no country selected
      const el = document.getElementById('country-selector-wrap');
      el?.classList.add('animate-shake');
      setTimeout(() => el?.classList.remove('animate-shake'), 600);
      return;
    }

    // Splash effect on button
    const btn = document.getElementById(`vote-btn-${id}`);
    if (btn) {
      const splash = document.createElement('div');
      splash.className = 'absolute inset-0 pointer-events-none flex items-center justify-center';
      splash.innerHTML = `<span class="text-xs font-black neon-text-cyan animate-ping">${t('vote')}!</span>`;
      btn.appendChild(splash);
      setTimeout(() => splash.remove(), 1000);
    }

    setArtists(prev => prev.map(a => a.id === id ? { ...a, total_votes: (a.total_votes || 0) + 1 } : a));

    const result = await voteForArtist(id, userCountry.code);
    if (!result.success) { fetchArtists(); }
    else { handleIncomingVote(userCountry.code, id); }
  };

  const getCountryTop3 = useCallback((countryCode: string) => {
    return Object.entries(countryArtistVotes[countryCode] || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([artistId, votes], i) => ({
        name: artists.find(a => a.id === artistId)?.name ?? '???',
        votes, rank: i + 1
      }));
  }, [countryArtistVotes, artists]);

  const filteredArtists = artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const top3 = filteredArtists.slice(0, 3);
  const others = filteredArtists.slice(3);

  if (loading && artists.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white relative pb-20 selection:bg-cyan-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-purple-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[60%] h-[60%] bg-cyan-600/5 blur-[120px] rounded-full" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glassmorphism border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-black italic tracking-tighter neon-text-cyan">
            STAN<span className="text-white">.</span>DOM
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-white/5 rounded-full px-4 py-2 gap-2 border border-white/5">
              <Search size={14} className="text-zinc-500" />
              <input type="text" placeholder={t('searchPlaceholder')}
                className="bg-transparent border-none outline-none text-xs w-32 focus:w-40 transition-all"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <LanguageSwitcher lang={lang} onToggle={() => setLang(l => l === 'EN' ? 'KO' : 'EN')} />
            <Link href="/login" className="px-4 py-2 bg-white text-black rounded-full text-xs font-black uppercase tracking-tighter hover:bg-cyan-400 transition-colors">
              {t('login')}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Country Selector + Map Toggle ── */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Country Selector */}
        <div id="country-selector-wrap" className="w-full sm:w-auto">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
            {lang === 'KO' ? '내 거주 국가 / 지역 선택' : 'Select Your Country / Region'}
          </p>
          <CountrySelector selected={userCountry} onSelect={setUserCountry} lang={lang} />
        </div>

        {/* Map View Toggle */}
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mr-1">{lang === 'KO' ? '지도 모드' : 'Map Mode'}</p>
          <button
            onClick={() => setMapView('globe')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all ${mapView === 'globe' ? 'bg-cyan-500 text-black' : 'glassmorphism border border-white/10 text-zinc-400 hover:border-cyan-500/30'}`}
          >
            <GlobeIcon size={14} /> {lang === 'KO' ? '지구본' : 'Globe'}
          </button>
          <button
            onClick={() => setMapView('flat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all ${mapView === 'flat' ? 'bg-cyan-500 text-black' : 'glassmorphism border border-white/10 text-zinc-400 hover:border-cyan-500/30'}`}
          >
            <Map size={14} /> {lang === 'KO' ? '평면 지도' : 'Flat Map'}
          </button>
        </div>
      </div>

      {/* ── Map Section ── */}
      <section className="relative w-full max-w-7xl mx-auto px-4 pb-4">
        <AnimatePresence mode="wait">
          {mapView === 'globe' ? (
            <motion.div key="globe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <GlobeMap
                stats={countryStats}
                lastVoteCountry={lastVoteCountry}
                userCountry={userCountry}
                onCountryClick={(code, name) => setCountryPopup({ code, name })}
                lang={lang}
              />
            </motion.div>
          ) : (
            <motion.div key="flat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <FlatMap
                stats={countryStats}
                lastVoteCountry={lastVoteCountry}
                userCountry={userCountry}
                onCountryClick={(code, name) => setCountryPopup({ code, name })}
                lang={lang}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Country Popup */}
        <AnimatePresence>
          {countryPopup && (
            <CountryRankingPopup
              countryCode={countryPopup.code}
              countryName={countryPopup.name}
              artists={getCountryTop3(countryPopup.code)}
              onClose={() => setCountryPopup(null)}
              lang={lang}
            />
          )}
        </AnimatePresence>
      </section>

      {/* ── Ranking ── */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-20">
        {/* Prompt banner if no country selected */}
        {!userCountry && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glassmorphism border border-cyan-500/30 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-[0_0_20px_rgba(0,243,255,0.1)]"
          >
            <span className="text-2xl">🌍</span>
            <div>
              <p className="font-black text-sm">
                {lang === 'KO' ? '투표 전에 국가를 선택해 주세요!' : 'Please select your country before voting!'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {lang === 'KO' ? '지구본/지도에 내 응원 화력이 표시됩니다.' : 'Your vote power will appear on the map.'}
              </p>
            </div>
          </motion.div>
        )}

        <section>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black italic tracking-tighter mb-2">{t('globalRanking')}</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em]">{t('realTimeTrends')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
            <AnimatePresence mode='popLayout'>
              {top3.map((a, index) => {
                const rank = index + 1;
                const isFirst = rank === 1;
                const orderClass = isFirst ? 'md:order-2' : rank === 2 ? 'md:order-1' : 'md:order-3';
                const heightClass = isFirst ? 'h-[400px]' : 'h-[320px]';
                const borderGlow = isFirst ? 'border-magenta-500/50' : 'border-white/10';

                return (
                  <motion.div key={a.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className={`relative flex flex-col items-center justify-between glassmorphism rounded-[2.5rem] p-8 border ${borderGlow} ${heightClass} ${orderClass} transition-all duration-500`}
                  >
                    <div className={`absolute -top-4 px-6 py-1 rounded-full font-black text-xs italic border ${isFirst ? 'bg-magenta-600 border-magenta-400' : 'bg-zinc-800 border-white/20'}`}>
                      {t('rank')} {rank}
                    </div>
                    <div className="flex flex-col items-center flex-1 justify-center w-full">
                      <Link href={`/artist/${a.id}`} className="relative w-28 h-28 mb-6 block group">
                        <div className={`absolute inset-0 blur-2xl opacity-30 rounded-full group-hover:opacity-60 transition-opacity ${isFirst ? 'bg-magenta-500' : 'bg-cyan-500'}`} />
                        <div className="relative w-full h-full rounded-full border-2 border-white/10 overflow-hidden bg-zinc-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {a.image_url ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-zinc-700">{a.name[0]}</span>}
                        </div>
                        {isFirst && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black p-1.5 rounded-lg rotate-12 z-10"><Trophy size={20} /></div>}
                      </Link>
                      <Link href={`/artist/${a.id}`} className="hover:text-cyan-400 transition-colors truncate w-full text-center">
                        <h3 className="text-2xl font-black tracking-tighter mb-1 truncate w-full pt-1">{a.name}</h3>
                      </Link>
                    </div>
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{t('totalVotes')}</span>
                        <span className="font-mono font-black text-xl italic">{(a.total_votes || 0).toLocaleString()}</span>
                      </div>
                      <button id={`vote-btn-${a.id}`} onClick={() => handleVote(a.id, a.total_votes)}
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 relative overflow-hidden ${isFirst ? 'bg-magenta-600' : 'bg-white text-black'} ${!userCountry ? 'opacity-60' : ''}`}
                      >
                        <Vote size={16} /> <span>{t('vote')}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-white/5 pb-4">
            <h3 className="text-xl font-black flex items-center gap-2 italic">
              <Sparkles size={20} className="text-cyan-400" /> {t('upcomingArtists')}
            </h3>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{others.length} {t('artists')}</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode='popLayout'>
              {others.map((a, index) => (
                <motion.div key={a.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="glassmorphism p-5 rounded-[1.5rem] flex items-center justify-between group border border-white/5 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <span className="w-6 font-mono text-zinc-600 font-black italic">#{index + 4}</span>
                    <Link href={`/artist/${a.id}`} className="flex items-center gap-6 group/link">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center group-hover/link:border-cyan-500/50 transition-colors">
                        {a.image_url ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" /> : <span className="font-black text-2xl text-zinc-700">{a.name[0]}</span>}
                      </div>
                      <h4 className="font-black text-xl tracking-tight leading-none group-hover/link:text-cyan-400 transition-colors">{a.name}</h4>
                    </Link>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">{t('score')}</p>
                      <p className="font-mono font-black text-2xl italic">{(a.total_votes || 0).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleVote(a.id, a.total_votes)}
                      className={`w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-cyan-500 hover:text-black transition-all active:scale-90 ${!userCountry ? 'opacity-60' : ''}`}
                    >
                      <PlusCircle size={28} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <footer className="mt-32 border-t border-white/5 bg-black/20 backdrop-blur-md pt-12 pb-8 text-center">
        <p className="text-zinc-600 text-xs font-bold tracking-[0.2em] uppercase">{t('footer')}</p>
      </footer>
    </main>
  );
}

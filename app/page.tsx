'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { voteForArtist } from '@/actions/vote';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Vote, Search, PlusCircle, Sparkles, Globe as GlobeIcon, Map, Mail } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Language, getT } from '@/constants/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CountryRankingPopup from '@/components/CountryRankingPopup';
import CountrySelector from '@/components/CountrySelector';
import { Country } from '@/constants/countryData';
import InquiryModal from '@/components/InquiryModal';

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), { ssr: false });
const FlatMap = dynamic(() => import('@/components/FlatMap'), { ssr: false });
const AddArtistModal = dynamic(() => import('@/components/AddArtistModal'), { ssr: false });

type MapView = 'globe' | 'flat';

interface Artist {
  id: string;
  name: string;
  image_url: string | null;
  total_votes: number;
}

/* Rank accent colors */
const RANK_COLORS = ['#FF00FF', '#37C561', '#37C561']; // Magenta, Green, Green logic or keep Cyan? User said selection elements to green. I will use green for 2nd and 3rd for now or just 3rd. Actually 2nd was cyan. I'll change 2nd to brand green too.
const RANK_LABELS = ['rank-badge-1', 'rank-badge-2', 'rank-badge-3'];

export default function Dashboard() {
  const supabase = createClient();
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
  const [bouncingId, setBouncingId] = useState<string | null>(null);
  const [activeVotes, setActiveVotes] = useState<Record<string, 'loading' | 'success'>>({});
  const [user, setUser] = useState<any>(null);
  const [isAddArtistOpen, setIsAddArtistOpen] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  const t = getT(lang);

  useEffect(() => {
    const browserLang = navigator.language?.startsWith('ko') ? 'KO' : 'EN';
    setLang(browserLang);
    fetchInitialData();
    // Auth listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

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
      subscription.unsubscribe();
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
      [countryCode]: {
        ...(prev[countryCode] || {}),
        [artistId]: ((prev[countryCode] || {})[artistId] || 0) + 1,
      },
    }));
  }, []);

  const handleVote = async (id: string, currentVotes: number) => {
    if (!userCountry) {
      const el = document.getElementById('country-selector-wrap');
      el?.classList.add('animate-shake');
      setTimeout(() => el?.classList.remove('animate-shake'), 600);
      selectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (activeVotes[id]) return; // Prevent spamming while request is in-flight

    /* bounce animation */
    setBouncingId(id);
    setTimeout(() => setBouncingId(null), 450);

    // Set loading state
    setActiveVotes(prev => ({ ...prev, [id]: 'loading' }));

    setArtists(prev =>
      prev.map(a => a.id === id ? { ...a, total_votes: (a.total_votes || 0) + 1 } : a)
    );

    const result = await voteForArtist(id, userCountry.code);
    if (!result.success) {
      setActiveVotes(prev => { const n = { ...prev }; delete n[id]; return n; });
      if (result.error === 'COOLDOWN_ACTIVE') {
        alert(`${lang === 'KO' ? '하루 투표 제한을 초과했습니다.' : 'Daily vote limit exceeded.'}`);
      } else {
        alert(`Vote failed: ${result.error}`);
      }
      fetchArtists();
    }
    else {
      // Mark as success
      setActiveVotes(prev => ({ ...prev, [id]: 'success' }));
      handleIncomingVote(userCountry.code, id);

      // Reset to original after 2 seconds
      setTimeout(() => {
        setActiveVotes(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 2000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const getCountryTop3 = useCallback((countryCode: string) => {
    return Object.entries(countryArtistVotes[countryCode] || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([artistId, votes], i) => ({
        name: artists.find(a => a.id === artistId)?.name ?? '???',
        votes,
        rank: i + 1,
      }));
  }, [countryArtistVotes, artists]);

  const filteredArtists = artists.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const top3 = filteredArtists.slice(0, 3);
  const others = filteredArtists.slice(3);
  const maxVotes = Math.max(top3[0]?.total_votes || 0, 1);

  /* Loading spinner */
  if (loading && artists.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020205]">
        <div className="w-16 h-16 border-4 border-[#37C561] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020205] text-white relative pb-20 selection:bg-[#37C561]/20">
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-purple-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[60%] h-[60%] bg-[#37C561]/5 blur-[120px] rounded-full" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glassmorphism border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img src="/stan_dom_logo_transparent2.png" alt="STAN.DOM" className="h-6 object-contain" />
          </a>
          <div className="flex items-center gap-3">
            <LanguageSwitcher lang={lang} onToggle={() => setLang(l => l === 'EN' ? 'KO' : 'EN')} />
            {user ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-full text-xs font-black uppercase tracking-tighter hover:bg-white hover:text-black transition-colors"
              >
                {lang === 'KO' ? '로그아웃' : 'Logout'}
              </button>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-white text-black rounded-full text-xs font-black uppercase tracking-tighter hover:bg-[#37C561] transition-colors"
              >
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Operations Toolbar ── */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <div className="glassmorphism rounded-3xl p-2 sm:p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-white/5 shadow-2xl">

          {/* Left: Input Node (Country) */}
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="w-full sm:w-72 relative group">
              <CountrySelector selected={userCountry} onSelect={setUserCountry} lang={lang} />
              {!userCountry && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-[8px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-lg shadow-red-500/20 z-20">
                  MISSING_NODE
                </div>
              )}
            </div>

            {/* Warning / Status Badge */}
            {!userCountry ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 group border-dashed hover:border-red-500/30 transition-colors"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                  {lang === 'KO' ? '참여를 위해 국가를 연결하세요' : 'CONNECT COUNTRY NODE TO JOIN'}
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#37C561]/10 border border-[#37C561]/30"
              >
                <div className="w-1.5 h-1.5 bg-[#37C561] rounded-full shadow-[0_0_8px_#37C561]" />
                <span className="text-[10px] font-black text-[#37C561] uppercase tracking-widest leading-none">
                  {lang === 'KO' ? '안정적으로 연결됨' : 'NODE STABLE'}
                </span>
              </motion.div>
            )}
          </div>

          {/* Right: Map preference */}
          <div className="flex items-center justify-between sm:justify-start gap-4 px-2 sm:px-0 bg-black/20 lg:bg-transparent rounded-2xl py-2 lg:py-0 border border-white/5 lg:border-none">
            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] whitespace-nowrap">
              {lang === 'KO' ? '시각화 모드' : 'VIS_MODE'}
            </span>
            <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-white/5">
              <button
                onClick={() => setMapView('globe')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black transition-all ${mapView === 'globe'
                    ? 'bg-[#37C561] text-black shadow-[0_0_20px_rgba(55,197,97,0.3)]'
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <GlobeIcon size={14} />
                <span className="hidden sm:inline">{lang === 'KO' ? '지구본' : 'GLOBE'}</span>
              </button>
              <button
                onClick={() => setMapView('flat')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black transition-all ${mapView === 'flat'
                    ? 'bg-[#37C561] text-black shadow-[0_0_20px_rgba(55,197,97,0.3)]'
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Map size={14} />
                <span className="hidden sm:inline">{lang === 'KO' ? '평면지도' : 'FLAT'}</span>
              </button>
            </div>
          </div>
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

      {/* ── Divider ── */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ── Ranking Section ── */}
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-20">

        {/* Search & Register - Relocated & New Feature */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2 border-b border-white/5">
          <div className="w-full md:w-auto">
            <h2 className="text-4xl font-black italic tracking-tighter">{t('globalRanking')}</h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">{t('realTimeTrends')}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Relocated Search */}
            <div className="flex-1 md:w-64 flex items-center bg-white/5 rounded-2xl px-5 py-3 gap-3 border border-white/10 focus-within:border-[#37C561]/50 transition-all">
              <Search size={16} className="text-zinc-500" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                className="bg-transparent border-none outline-none text-sm font-bold w-full placeholder:text-zinc-700"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Restore Add Artist Feature */}
            <button
              onClick={() => setIsAddArtistOpen(true)}
              className="shrink-0 flex items-center gap-2 px-5 py-3 bg-[#37C561]/10 border border-[#37C561]/30 rounded-2xl text-[#37C561] hover:bg-[#37C561] hover:text-black transition-all group"
            >
              <PlusCircle size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">
                {lang === 'KO' ? '아티스트 등록' : 'Register Artist'}
              </span>
            </button>
          </div>
        </section>

        {/* ── Top 3 ── */}
        <section>
          {/* Removed older title section */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-5xl mx-auto">
            <AnimatePresence mode="popLayout">
              {top3.map((a, index) => {
                const rank = index + 1;
                const isFirst = rank === 1;
                const orderClass = isFirst ? 'md:order-2' : rank === 2 ? 'md:order-1' : 'md:order-3';
                const heightClass = isFirst ? 'min-h-[420px]' : 'min-h-[340px]';
                const color = RANK_COLORS[index];
                const pct = Math.round((a.total_votes / maxVotes) * 100);
                const isBounc = bouncingId === a.id;

                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative flex flex-col items-center justify-between glassmorphism rounded-[2.5rem] p-8 border ${orderClass} ${heightClass} transition-all duration-500`}
                    style={{ borderColor: `${color}30` }}
                  >
                    {/* Rank badge */}
                    <div
                      className={`absolute -top-4 px-6 py-1.5 rounded-full font-black text-xs italic ${RANK_LABELS[index]}`}
                    >
                      {t('rank')} {rank}
                    </div>

                    {/* Glow for 1st */}
                    {isFirst && (
                      <div
                        className="absolute inset-0 rounded-[2.5rem] pointer-events-none"
                        style={{ boxShadow: `0 0 40px ${color}20, inset 0 0 30px ${color}08` }}
                      />
                    )}

                    <div className="flex flex-col items-center flex-1 justify-center w-full gap-4">
                      {/* Artist image */}
                      <Link href={`/artist/${a.id}`} className="relative w-28 h-28 block group">
                        <div
                          className="absolute inset-0 blur-2xl opacity-30 rounded-full group-hover:opacity-70 transition-opacity"
                          style={{ background: color }}
                        />
                        <div className="relative w-full h-full rounded-full border-2 overflow-hidden bg-zinc-900 flex items-center justify-center group-hover:scale-105 transition-transform"
                          style={{ borderColor: `${color}60` }}>
                          {a.image_url
                            ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                            : <span className="text-4xl font-black text-zinc-600">{a.name[0]}</span>
                          }
                        </div>
                        {isFirst && (
                          <div className="absolute -top-2 -right-2 bg-yellow-400 text-black p-1.5 rounded-lg rotate-12 z-10 crown-neon">
                            <Trophy size={18} />
                          </div>
                        )}
                      </Link>

                      {/* Name */}
                      <Link href={`/artist/${a.id}`} className="hover:opacity-80 transition-opacity text-center w-full">
                        <h3 className="text-2xl font-black tracking-tighter truncate w-full">{a.name}</h3>
                      </Link>

                      {/* Progress bar */}
                      <div className="w-full space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t('totalVotes')}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-lg italic">{(a.total_votes || 0).toLocaleString()}</span>
                            <span className="text-[10px] font-black" style={{ color }}>{pct}%</span>
                          </div>
                        </div>
                        <div className="progress-bar-track">
                          <div
                            className={`progress-bar-fill progress-bar-fill-${rank}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vote button */}
                    <button
                      id={`vote-btn-${a.id}`}
                      onClick={() => handleVote(a.id, a.total_votes)}
                      disabled={!!activeVotes[a.id]}
                      className={`w-full mt-6 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all relative overflow-hidden ${isBounc ? 'vote-bounce' : ''} ${!userCountry ? 'opacity-50' : ''} ${activeVotes[a.id] === 'success' ? 'bg-emerald-500 !text-white' : activeVotes[a.id] === 'loading' ? 'bg-zinc-700 !text-zinc-400 cursor-not-allowed border-none' : ''
                        }`}
                      style={{
                        background: activeVotes[a.id] ? undefined : color,
                        color: activeVotes[a.id] ? undefined : '#000',
                        boxShadow: activeVotes[a.id] === 'success' ? '0 0 15px rgba(16,185,129,0.5)' : (userCountry && !activeVotes[a.id] ? `0 0 20px ${color}50` : 'none'),
                      }}
                    >
                      {activeVotes[a.id] === 'success' ? (
                        <><span>✓</span> <span>{lang === 'KO' ? '투표 완료' : 'Voted'}</span></>
                      ) : activeVotes[a.id] === 'loading' ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><Vote size={16} /> <span>{t('vote')}</span></>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Others ── */}
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-white/5 pb-4">
            <h3 className="text-xl font-black flex items-center gap-2 italic">
              <Sparkles size={20} className="text-[#37C561]" />
              {t('upcomingArtists')}
            </h3>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              {others.length} {t('artists')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {others.slice(0, showAllUpcoming ? undefined : 6).map((a, index) => {
                const pct = Math.round((a.total_votes / maxVotes) * 100);
                const isBounc = bouncingId === a.id;

                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glassmorphism p-5 rounded-[1.5rem] flex items-center justify-between group border border-white/5 hover:border-[#37C561]/30 transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="w-6 font-mono text-zinc-600 font-black italic text-sm shrink-0">
                        #{index + 4}
                      </span>
                      <Link href={`/artist/${a.id}`} className="flex items-center gap-3 group/link min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center group-hover/link:border-[#37C561]/40 transition-colors shrink-0">
                          {a.image_url
                            ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                            : <span className="font-black text-xl text-zinc-600">{a.name[0]}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-base tracking-tight leading-none group-hover/link:text-[#37C561] transition-colors truncate">
                            {a.name}
                          </h4>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-600 font-black">{(a.total_votes || 0).toLocaleString()}</span>
                              <span className="text-[10px] text-zinc-600">{pct}%</span>
                            </div>
                            <div className="progress-bar-track w-24">
                              <div className="progress-bar-fill progress-bar-fill-other" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Vote button */}
                    <button
                      onClick={() => handleVote(a.id, a.total_votes)}
                      disabled={!!activeVotes[a.id]}
                      className={`shrink-0 ml-3 px-4 h-10 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-black transition-all ${isBounc ? 'vote-bounce' : ''} ${!userCountry ? 'opacity-50' : ''} ${activeVotes[a.id] === 'success'
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : activeVotes[a.id] === 'loading'
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                            : 'border-zinc-700 hover:bg-[#37C561] hover:text-black hover:border-[#37C561]'
                        }`}
                    >
                      {activeVotes[a.id] === 'success' ? (
                        <span className="font-black text-lg">✓</span>
                      ) : activeVotes[a.id] === 'loading' ? (
                        <div className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                      ) : (
                        <><Vote size={14} /> <span>VOTE</span></>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {others.length > 6 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[#37C561]/50 hover:bg-[#37C561]/5 transition-all group flex items-center gap-2"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-[#37C561] transition-colors">
                  {showAllUpcoming ? t('showLess') : t('showMore')}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full bg-[#37C561] shadow-[0_0_8px_#37C561] transition-transform duration-300 ${showAllUpcoming ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </section>
      </div>

      <footer className="mt-32 border-t border-white/5 bg-black/20 backdrop-blur-md pt-16 pb-12 flex flex-col items-center gap-8">
        <button
          onClick={() => setIsInquiryModalOpen(true)}
          className="group flex flex-col items-center gap-3 transition-all hover:scale-105"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-neon-cyan/50 group-hover:bg-neon-cyan/5 shadow-lg shadow-black transition-all">
            <Mail size={20} className="text-zinc-500 group-hover:text-neon-cyan transition-colors" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-neon-cyan transition-colors">
            {t('contactAdmin')}
          </span>
        </button>

        <p className="text-zinc-600 text-[10px] font-black tracking-[0.3em] uppercase opacity-50">
          © 2026 STANDOM GLOBAL NETWORK
        </p>
      </footer>

      <AddArtistModal
        isOpen={isAddArtistOpen}
        onClose={() => setIsAddArtistOpen(false)}
        lang={lang}
      />
      <InquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        lang={lang}
      />
    </main>
  );
}
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { voteForArtist } from '@/actions/vote';
import { getRemainingVotes } from '@/actions/getRemainingVotes';
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
import Toast from '@/components/Toast';

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
  const [toast, setToast] = useState({ isVisible: false, message: '', subMessage: '' });
  const [voteQuota, setVoteQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  const t = getT(lang);

  useEffect(() => {
    // Initialize language from localStorage
    const savedLang = localStorage.getItem('stan_lang') as Language;
    if (savedLang && ['EN', 'KO', 'ES'].includes(savedLang)) {
      setLang(savedLang);
    } else {
      setLang('EN');
    }
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

    // Load persisted country
    const savedCountry = localStorage.getItem('stan_user_country');
    if (savedCountry) {
      try {
        setUserCountry(JSON.parse(savedCountry));
      } catch (e) {
        console.error('Failed to parse saved country', e);
      }
    }

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(artistsChannel);
      supabase.removeChannel(votesChannel);
    };
  }, []);

  // Persist country selection
  useEffect(() => {
    if (userCountry) {
      localStorage.setItem('stan_user_country', JSON.stringify(userCountry));
    }
  }, [userCountry]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchArtists(), fetchCountryStats(), refreshQuota()]);
    setLoading(false);
  };

  const refreshQuota = async () => {
    const res = await getRemainingVotes();
    if (res.success) {
      setVoteQuota({ remaining: res.remaining!, limit: res.limit! });
    }
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
        alert(t('dailyLimitExceeded'));
      } else {
        alert(`${t('voteFailed')}: ${result.error}`);
      }
      fetchArtists();
    }
    else {
      // Mark as success
      setActiveVotes(prev => ({ ...prev, [id]: 'success' }));
      handleIncomingVote(userCountry.code, id);

      // Show Success Toast
      setToast({
        isVisible: true,
        message: t('voteTransmitted'),
        subMessage: t('voltageIncreased')
      });
      refreshQuota();

      // Reset button state after 2 seconds
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

  // ── [추가] FlatMap용 artists 변환 ──────────────────────────
  const flatMapArtists = artists.map(a => ({
    id: a.id,
    name: a.name,
    image: a.image_url ?? undefined,
  }));
  // ──────────────────────────────────────────────────────────

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
    <main className="flex-1 bg-[#020205] text-white relative flex flex-col selection:bg-[#37C561]/20">
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
            <LanguageSwitcher 
              lang={lang} 
              onSelect={(l) => {
                setLang(l);
                localStorage.setItem('stan_lang', l);
              }} 
            />
            {user ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-full text-xs font-black uppercase tracking-tighter hover:bg-white hover:text-black transition-colors"
              >
                {t('logout')}
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
      <div className="max-w-[1400px] w-full mx-auto px-2 sm:px-4 pt-8 pb-4">
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
                  {t('connectNode')}
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
                  {t('nodeStable')}
                </span>
              </motion.div>
            )}

            {/* Vote Quota Badge */}
            {voteQuota && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/5"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${voteQuota.remaining > 0 ? 'bg-[#37C561]' : 'bg-red-500'} shadow-[0_0_8px_currentColor]`} />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                  {t('remainingVotes')}: <span className="text-white">{voteQuota.remaining}</span> / <span className="text-zinc-600">{voteQuota.limit}</span>
                </span>
              </motion.div>
            )}
          </div>

          {/* Right: Map preference */}
          <div className="flex items-center justify-between sm:justify-start gap-4 px-2 sm:px-0 bg-black/20 lg:bg-transparent rounded-2xl py-2 lg:py-0 border border-white/5 lg:border-none">
            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] whitespace-nowrap">
              {t('visMode')}
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
                <span className="hidden sm:inline">{t('globe')}</span>
              </button>
              <button
                onClick={() => setMapView('flat')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black transition-all ${mapView === 'flat'
                  ? 'bg-[#37C561] text-black shadow-[0_0_20px_rgba(55,197,97,0.3)]'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Map size={14} />
                <span className="hidden sm:inline">{t('flatMap')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notice Banner (Voting Rules) ── */}
      <div className="max-w-[1400px] w-full mx-auto px-2 sm:px-4 mt-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl py-3 px-6 text-center text-[10px] sm:text-xs font-black tracking-[0.1em] flex items-center justify-center gap-3 border border-white/5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 backdrop-blur-md"
        >
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <span className="text-zinc-400 uppercase tracking-widest">{t('votingRuleNotice')}</span>
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
        </motion.div>
      </div>


      {/* ── Map Section ── */}
      <section className="relative w-full max-w-[1400px] mx-auto px-2 sm:px-4 pb-4">
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
              {/* ── [수정] detailedVotes + artists 추가, onCountryClick 빈 함수 (팝업 대신 내부 패널 사용) ── */}
              <FlatMap
                stats={countryStats}
                detailedVotes={countryArtistVotes}
                artists={flatMapArtists}
                lastVoteCountry={lastVoteCountry}
                userCountry={userCountry}
                onCountryClick={() => { }}
                lang={lang}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* GlobeMap 전용 팝업 — mapView === 'globe' 일 때만 렌더 */}
        <AnimatePresence>
          {countryPopup && mapView === 'globe' && (
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
      <div className="max-w-[1400px] w-full mx-auto px-2 sm:px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ── Ranking Section ── */}
      <div className="max-w-[1400px] w-full mx-auto px-2 sm:px-4 py-12 space-y-20">

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
                {t('registerArtist')}
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
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative flex flex-col items-center justify-between glassmorphism-premium rounded-[2.5rem] p-8 border ${orderClass} ${heightClass} transition-all duration-500 group overflow-hidden`}
                    style={{ borderColor: `${color}30` }}
                  >
                    {/* Dynamic Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                    <div 
                      className="absolute -inset-20 bg-radial opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none"
                      style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)` }}
                    />

                    {/* Rank badge - Updated Design */}
                    <div className={`absolute top-8 left-8 flex flex-col items-start gap-0 opacity-40 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100`}>
                      <div className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-1">{t('rank')}</div>
                      <div className="relative">
                        <span className="text-5xl font-black tracking-tighter tabular-nums leading-none" style={{ color }}>{rank}</span>
                        <div className="absolute -bottom-1 left-0 w-full h-1 rounded-full opacity-30" style={{ backgroundColor: color }} />
                      </div>
                    </div>

                    <div className="flex flex-col items-center flex-1 justify-center w-full gap-6 relative z-10">
                      {/* Artist image with collectibe frame */}
                      <Link href={`/artist/${a.id}`} className="relative w-36 h-36 block group/img">
                        <div className="absolute -inset-4 bg-white/5 rounded-full blur-2xl group-hover/img:bg-white/10 transition-colors" />
                        <div className="relative w-full h-full rounded-full border-4 overflow-hidden bg-zinc-900 flex items-center justify-center shadow-2xl group-hover/img:scale-105 transition-transform duration-500"
                          style={{ borderColor: `${color}40`, boxShadow: `0 0 30px ${color}20` }}>
                          {a.image_url
                            ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
                            : <span className="text-5xl font-black text-zinc-700">{a.name[0]}</span>
                          }
                        </div>
                        {isFirst && (
                          <div className="absolute -top-3 -right-3 bg-yellow-400 text-black p-2 rounded-xl rotate-12 z-10 shadow-xl shadow-yellow-400/20">
                            <Trophy size={20} />
                          </div>
                        )}
                      </Link>

                      {/* Name & Stats */}
                      <div className="text-center w-full">
                        <Link href={`/artist/${a.id}`} className="hover:opacity-80 transition-opacity inline-block group/title">
                          <h3 className="text-3xl font-black tracking-tighter truncate max-w-[200px] group-hover/title:text-white">{a.name}</h3>
                          <div className="h-0.5 w-0 group-hover/title:w-full bg-current mx-auto transition-all duration-300" style={{ color }} />
                        </Link>
                        
                        <div className="mt-4 flex items-center justify-center gap-3">
                          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Phase</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{t('voltage')}</span>
                          <span className="font-mono font-black text-xl" style={{ color }}>{(a.total_votes || 0).toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-zinc-900/80 rounded-full overflow-hidden p-[1px] border border-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 2, ease: 'circOut' }}
                            className="h-full rounded-full relative overflow-hidden"
                            style={{ backgroundColor: color }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Vote button */}
                    <button
                      id={`vote-btn-${a.id}`}
                      onClick={() => handleVote(a.id, a.total_votes)}
                      disabled={!!activeVotes[a.id]}
                      className={`w-full mt-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all relative z-10 ${isBounc ? 'vote-bounce' : ''} ${!userCountry ? 'opacity-50' : ''} ${
                        activeVotes[a.id] === 'success' ? 'bg-emerald-500 text-white' : 
                        activeVotes[a.id] === 'loading' ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-none' : ''
                      }`}
                      style={{
                        background: activeVotes[a.id] ? undefined : color,
                        color: activeVotes[a.id] ? undefined : '#000',
                        boxShadow: activeVotes[a.id] === 'success' ? '0 0 20px rgba(16,185,129,0.4)' : (userCountry && !activeVotes[a.id] ? `0 0 30px ${color}30` : 'none'),
                      }}
                    >
                      {activeVotes[a.id] === 'success' ? (
                        <><span>✓</span> <span>{t('voted')}</span></>
                      ) : activeVotes[a.id] === 'loading' ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><Vote size={18} /> <span>{t('transmitVote')}</span></>
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

        {/* ── Divider ── */}
        <div className="max-w-[1400px] w-full mx-auto px-2 sm:px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* ── Battle Zone ── */}
        <section className="max-w-[1400px] w-full mx-auto px-2 sm:px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <div className="battle-zone-card rounded-[2.5rem] p-8 md:p-12 relative group h-full overflow-hidden">
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                  <div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter neon-text-lime mb-2">
                      {t('battleZoneTitle')}
                    </h2>
                    <p className="text-zinc-400 text-xs font-black uppercase tracking-[0.3em] mb-4">
                      {t('battleZoneSub')}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-[1.25rem] bg-white/5 border border-white/10 max-w-fit">
                      <div className="flex items-center gap-2">
                         <span className="w-2 h-2 bg-[#37C561] rounded-full animate-pulse shadow-[0_0_10px_#37C561]" />
                         <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest break-keep">
                           {t('votingRuleNotice')}
                         </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-2 bg-black/40 border border-[#37C561]/30 rounded-full text-[#37C561] text-[10px] font-black uppercase tracking-widest animate-pulse">
                    LIVE_SYNC_ACTIVE
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['RIIZE', 'BOYNEXTDOOR', 'TWS'].map((name, i) => {
                    const artist = artists.find(a => a.name.toUpperCase() === name);
                    const votes = artist?.total_votes || 0;
                    const isTop = i === 0;

                    return (
                      <div key={name} className="glassmorphism p-6 rounded-3xl border-white/5 hover:border-[#37C561]/40 transition-all flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 uppercase font-black text-[8px] text-zinc-500 tracking-widest">
                            <span className="opacity-50">{t('rank')}</span>
                            <span className="text-[#37C561]">{i + 1}</span>
                          </div>
                          {isTop && <Trophy size={14} className="text-yellow-400 vibrant-glow" />}
                        </div>
                        
                        {/* Artist Link Wrapper */}
                        {artist ? (
                          <Link href={`/artist/${artist.id}`} className="flex items-center gap-4 group/artist">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 overflow-hidden shrink-0 group-hover/artist:border-[#37C561]/50 transition-all">
                              {artist.image_url ? (
                                <img src={artist.image_url} alt={name} className="w-full h-full object-cover group-hover/artist:scale-110 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-xl text-zinc-700">{name[0]}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-black text-xl tracking-tighter truncate group-hover/artist:text-[#37C561] transition-colors">{name}</h4>
                              <span className="text-[10px] font-black text-zinc-600 uppercase">VOLTAGE: {votes.toLocaleString()}</span>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-4 opacity-50">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center font-black text-xl text-zinc-700">{name[0]}</div>
                            <div className="min-w-0">
                              <h4 className="font-black text-xl tracking-tighter truncate">{name}</h4>
                              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest animate-pulse">DETECTING...</span>
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => artist && handleVote(artist.id, votes)}
                          disabled={!artist || !!activeVotes[artist.id]}
                          className={`w-full py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            artist && activeVotes[artist.id] === 'success' 
                              ? 'bg-[#37C561] text-black border-[#37C561] shadow-[0_0_15px_rgba(55,197,97,0.4)]' 
                              : artist && activeVotes[artist.id] === 'loading'
                              ? 'bg-zinc-800 text-zinc-500 border-white/5 cursor-not-allowed'
                              : 'bg-white/5 border-white/10 hover:bg-[#37C561] hover:text-black hover:border-[#37C561]'
                          }`}
                        >
                          {artist ? (
                            activeVotes[artist.id] === 'success' ? (
                              <span className="flex items-center justify-center gap-1">✓ {t('voted')}</span>
                            ) : activeVotes[artist.id] === 'loading' ? (
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                            ) : (
                              t('vote')
                            )
                          ) : 'PENDING_NODE'}
                        </button>

                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-auto border-t border-white/5 bg-black/20 backdrop-blur-md pt-12 pb-6 flex flex-col items-center gap-6">
        {/* 1. 관리자 문의 버튼 */}
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

        {/* 2. 구글 검토용 법적 공지 링크 (Privacy & Terms) */}
        <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <Link href="/privacy" className="hover:text-[#37C561] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#37C561] transition-colors">
            Terms of Service
          </Link>
        </div>

        {/* 3. 저작권 표시 */}
        <p className="text-zinc-600 text-[10px] font-black tracking-[0.3em] uppercase opacity-50">
          © 2026 STANDOM GLOBAL NETWORK
        </p>
      </footer>

      <AddArtistModal
        isOpen={isAddArtistOpen}
        onClose={() => setIsAddArtistOpen(false)}
        lang={lang}
        user={user}
      />
      <InquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        lang={lang}
      />
      
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        subMessage={toast.subMessage}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </main>
  );
}
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { toPng, toBlob } from 'html-to-image';
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
import OnboardingModal from '@/components/OnboardingModal';
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

// Helper to convert hex to RGB for CSS variables
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '55, 197, 97';
};

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
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showPastIssues, setShowPastIssues] = useState(false);
  const [showPastBattles, setShowPastBattles] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [showHologramCard, setShowHologramCard] = useState<{ artist: Artist; rank: number } | null>(null);
  const [showInstaGuide, setShowInstaGuide] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [toast, setToast] = useState({ isVisible: false, message: '', subMessage: '' });
  const [voteQuota, setVoteQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const hologramCardRef = useRef<HTMLDivElement>(null);

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
    try {
      setLoading(true);
      await Promise.all([fetchArtists(), fetchCountryStats(), refreshQuota()]);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshQuota = async () => {
    const res = await getRemainingVotes();
    if (res.success) {
      setVoteQuota({ remaining: res.remaining!, limit: res.limit! });
    }
  };

  const handleDownloadCard = async () => {
    if (hologramCardRef.current === null) return;
    try {
      setToast({ isVisible: true, message: 'Generating Image...', subMessage: 'Please wait a moment' });
      
      // html2canvas is more reliable for mobile browsers when capturing complex CSS
      const canvas = await html2canvas(hologramCardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          const element = clonedDoc.getElementById('hologram-card-capture');
          if (element) {
            element.style.transform = 'scale(1)';
            // Fallback for modern colors that html2canvas doesn't support
            const descendants = element.getElementsByTagName('*');
            for (let i = 0; i < descendants.length; i++) {
              const d = descendants[i] as HTMLElement;
              if (d.style.color?.includes('oklch') || d.style.color?.includes('lab')) d.style.color = '#ffffff';
              if (d.style.backgroundColor?.includes('oklch') || d.style.backgroundColor?.includes('lab')) d.style.backgroundColor = '#000000';
            }
          }
        }
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      setGeneratedImage(dataUrl);
      setToast({ isVisible: true, message: t('generateSuccess'), subMessage: 'Instructions ready!' });
    } catch (err) {
      console.error('Download failed:', err);
      setToast({ isVisible: true, message: 'Generation Failed', subMessage: 'Please check your connection' });
    }
  };

  const handleCopyProfileLink = () => {
    if (!showHologramCard) return;
    const url = `${window.location.origin}/artist/${showHologramCard.artist.id || ''}`;
    navigator.clipboard.writeText(url);
    setToast({ isVisible: true, message: t('copyProfileLink'), subMessage: 'Link copied to clipboard!' });
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
      setIsOnboardingOpen(true);
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

      const votedArtist = artists.find(a => a.id === id);
      const rank = artists.findIndex(a => a.id === id) + 1;

      // Show Success Toast
      setToast({
        isVisible: true,
        message: t('voteTransmitted'),
        subMessage: t('voltageIncreased')
      });
      refreshQuota();

      if (votedArtist) {
        setTimeout(() => setShowHologramCard({ artist: votedArtist, rank }), 800);
      }

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
  const topArtist = artists.length > 0 ? artists[0] : null;

  // Dynamic Fandom Color Mapping for Winner Takeover
  const FANDOM_COLORS: Record<string, string> = {
    'BTS': '#9333EA', // 퍼플
    'BLACKPINK': '#EC4899', // 핑크
    'Stray Kids': '#DC2626', // 레드
    'SEVENTEEN': '#F472B6', // 로즈쿼츠
    'TWICE': '#F97316', // 살구/오렌지
    'TXT': '#14B8A6', // 민트/틸
    'ENHYPEN': '#B91C1C', // 다크레드
    'NewJeans': '#3B82F6', // 블루
    'aespa': '#8B5CF6', // 오로라 퍼플
    'IVE': '#E11D48', // 아이브 체리
    'LE SSERAFIM': '#4F46E5', // 피어리스 블루
    'NCT': '#22C55E', // 네오 펄 샴페인
    'ATEEZ': '#D97706', // 앰버
    'ITZY': '#db2777', // 마젠타
    'EXO': '#d4d4d8', // 코스믹 라떼
    'Red Velvet': '#fca5a5', // 코랄 핑크
    'BIGBANG': '#fcd34d', // 뱅봉 옐로우
    'RIIZE': '#f97316', // 라이징 오렌지
    'BOYNEXTDOOR': '#0ea5e9', // 스카이 블루
    'TWS': '#3b82f6', // 청량 블루
  };
  const DEFAULT_THEME_COLOR = '#37C561';
  const themeColor = topArtist && FANDOM_COLORS[topArtist.name] 
    ? FANDOM_COLORS[topArtist.name] 
    : DEFAULT_THEME_COLOR;

  // Inject Theme Color to entire site (Full Takeover)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const rgb = hexToRgb(themeColor);
      document.documentElement.style.setProperty('--neon-lime', themeColor);
      document.documentElement.style.setProperty('--neon-cyan', themeColor);
      document.documentElement.style.setProperty('--neon-lime-rgb', rgb);
      document.documentElement.style.setProperty('--spotlight-color', `rgba(${rgb}, 0.04)`);
    }
  }, [themeColor]);

  /* Loading spinner */
  if (loading && artists.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020205]">
        <div className="w-16 h-16 border-4 border-[#37C561] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 bg-[#020205] text-white relative flex flex-col">
      {/* Background glows + Takeover */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#020205] transition-colors duration-1000">
        <div 
          className="absolute top-[-10%] right-[-10%] w-[70%] h-[80%] blur-[130px] rounded-full transition-colors duration-1000 delay-100"
          style={{ backgroundColor: `${themeColor}15` }}
        />
        <div 
          className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] blur-[130px] rounded-full transition-colors duration-1000"
          style={{ backgroundColor: `${themeColor}15` }}
        />
        {topArtist && topArtist.image_url && (
          <div 
            className="absolute inset-0 opacity-[0.2] mix-blend-screen transition-all duration-1000"
            style={{
              backgroundImage: `url(${topArtist.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: `blur(80px) saturate(1.5) drop-shadow(0 0 50px ${themeColor}40)`,
            }}
          />
        )}
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-black/40 backdrop-blur-3xl border-b px-6 py-4 transition-colors duration-1000" style={{ borderColor: `${themeColor}20` }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center hover:scale-105 transition-transform drop-shadow-md" style={{ filter: `drop-shadow(0 0 10px ${themeColor}60)` }}>
              <img src="/stan_dom_logo_transparent2.png" alt="STAN.DOM" className="h-6 object-contain" />
            </a>
            {topArtist && (
              <div 
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-1000 shadow-xl"
                style={{
                  borderColor: `${themeColor}50`,
                  backgroundColor: `${themeColor}15`,
                  boxShadow: `0 0 20px ${themeColor}20`
                }}
              >
                <span className="text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5" style={{ color: themeColor, textShadow: `0 0 10px ${themeColor}` }}>
                  🏆 <span className="text-zinc-300">CURRENT #1:</span> {topArtist.name}
                </span>
                <div className="relative group flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center cursor-help pb-[1px] text-[10px] text-white">?</div>
                  <div className="absolute top-full mt-2 right-0 w-48 text-[10px] font-medium leading-relaxed bg-black/90 p-3 rounded-xl border border-white/10 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {t('takeoverTooltip')}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
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
                className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-full text-xs font-black uppercase tracking-tighter hover:bg-[var(--neon-lime)] hover:text-black transition-colors"
              >
                {t('logout')}
              </button>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-white text-black rounded-full text-xs font-black uppercase tracking-tighter hover:bg-[var(--neon-lime)] transition-colors"
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
                <div className="absolute -top-2 -right-2 bg-red-500 text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-lg shadow-red-500/20 z-20">
                  {t('required')}
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
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--neon-lime)]/10 border border-[var(--neon-lime)]/30"
              >
                <div className="w-1.5 h-1.5 bg-[var(--neon-lime)] rounded-full shadow-[0_0_8px_var(--neon-lime)]" />
                <span className="text-[10px] font-black text-[var(--neon-lime)] uppercase tracking-widest leading-none">
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
                <div className={`w-1.5 h-1.5 rounded-full ${voteQuota.remaining > 0 ? 'bg-[var(--neon-lime)]' : 'bg-red-500'} shadow-[0_0_8px_currentColor]`} />
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
                  ? 'bg-[var(--neon-lime)] text-black shadow-[0_0_20px_rgba(var(--neon-lime-rgb),0.3)]'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <GlobeIcon size={14} />
                <span className="hidden sm:inline">{t('globe')}</span>
              </button>
              <button
                onClick={() => setMapView('flat')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black transition-all ${mapView === 'flat'
                  ? 'bg-[var(--neon-lime)] text-black shadow-[0_0_20px_rgba(var(--neon-lime-rgb),0.3)]'
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

      {/* ── Today's K-POP Hot Issue Section ── */}
      <section className="max-w-[1400px] w-full mx-auto px-2 sm:px-4 py-10">{(() => {
        // ── Hot Issue data ─────────────────────────────────────────────
        // publishedAt: ISO UTC  |  slot: KST 09:00 = UTC 00:00, EST 09:00 = UTC 13:00
        // Array is already newest-first; adding publishedAt keeps sort stable.
        const HOT_ISSUES = [
          {
            id: '20260417_02', publishedAt: '2026-04-17T13:00:00Z', slot: 'EST 09:00',
            date: '2026-04-17',
            isNew: true,
            category: { EN: 'New Release', KO: '신보 / MV', ES: 'Nuevo Lanzamiento' },
            headline: {
              EN: "Xdinary Heroes Drop 8th Mini Album 'DEAD AND' — 'Voyager' Out Now",
              KO: "엑스디너리 히어로즈, 8번째 미니앨범 'DEAD AND' 발매 · 타이틀곡 'Voyager' 공개",
              ES: "Xdinary Heroes lanza su 8.° mini álbum 'DEAD AND' — 'Voyager' ya disponible",
            },
            lead: {
              EN: "JYP's rock band Xdinary Heroes releases 'DEAD AND' with 'Voyager' as the title track on April 17 at 1PM KST.",
              KO: "JYP 소속 록 밴드 엑스디너리 히어로즈가 4월 17일 오후 1시 8번째 미니앨범 'DEAD AND'와 타이틀곡 'Voyager'를 전격 공개했다.",
              ES: "La banda de rock de JYP, Xdinary Heroes, lanza 'DEAD AND' con 'Voyager' como tema principal el 17 de abril a la 1PM KST.",
            },
            body: {
              EN: "JYP Entertainment's rock band Xdinary Heroes (XH) has officially returned with their highly anticipated 8th mini album, 'DEAD AND', released globally on April 17th. The title track, 'Voyager', features explosive guitar riffs and a sharp vocal delivery, showcasing the band's matured sound and continuous musical evolution. Global fans are already showing explosive reactions to their upgraded band performance.\n\nSource: JYP Entertainment Press Release & Official YouTube MV.",
              KO: "JYP엔터테인먼트 실력파 록 밴드 엑스디너리 히어로즈(Xdinary Heroes, XH)가 4월 17일 오후 1시, 여덟 번째 미니 앨범 'DEAD AND'를 전 세계 동시 발매하고 컴백했다. 타이틀곡 'Voyager(보이저)'는 폭발적인 기타 리프와 날카로운 보컬이 더해진 곡으로, 데뷔 이후 멈추지 않는 이들의 음악적 진화를 증명한다. 한층 업그레이드된 밴드 퍼포먼스에 글로벌 팬들의 폭발적인 반응이 쏟아지고 있다.\n\n출처: JYP엔터테인먼트 공식 보도자료 및 신곡 뮤직비디오.",
              ES: "La talentosa banda de rock de JYP Entertainment, Xdinary Heroes, ha regresado oficialmente con su octavo mini álbum 'DEAD AND'. La pista principal, 'Voyager', muestra riffs de guitarra explosivos y su evolución musical continua. Sus fans globales ya muestran una reacción inmensa ante esta nueva etapa.\n\nFuente: JYP Entertainment y MV oficial en YouTube."
            },
            videoId: 'C6FXANyVACw', accent: '#F59E0B',
            tags: ['XdinaryHeroes', 'DEADAND', 'Voyager', 'JYP'],
          },
          {
            id: '20260417_01', publishedAt: '2026-04-17T00:00:00Z', slot: 'KST 09:00',
            date: '2026-04-17',
            isNew: true,
            category: { EN: 'Industry / Business', KO: '산업 / 비즈니스', ES: 'Industria / Negocios' },
            headline: {
              EN: "Big 4 File 'Fanomenon' JV + HYBE×Paramount K-Pop Movie Announced",
              KO: "빅4 '파노메논' 공정위 신고 완료 + HYBE×파라마운트 K-POP 영화 발표",
              ES: "Las Big 4 solicitan JV 'Fanomenon' + Se anuncia película K-Pop de HYBE×Paramount",
            },
            lead: {
              EN: 'HYBE, SM, JYP & YG file joint venture for a global K-pop festival targeting 2027, while HYBE reveals a Hollywood film for Feb 2027.',
              KO: 'HYBE·SM·JYP·YG 4사가 2027년 글로벌 K-POP 페스티벌 합작 신고를 마치고, HYBE는 2027년 2월 할리우드 K-POP 영화까지 발표했다.',
              ES: 'HYBE, SM, JYP y YG presentan JV para un festival K-pop global en 2027, mientras HYBE revela una película de Hollywood para febrero de 2027.',
            },
            body: {
              EN: "In an unprecedented move for the industry, South Korea's Big 4 (HYBE, SM, JYP, YG) have filed a joint venture declaration with the Fair Trade Commission, establishing a massive collaborative project known temporarily as 'Fanomenon'. The joint venture focuses on hosting an enormous unified global K-Pop festival by 2027. Additionally, HYBE has revealed a partnership with Paramount Pictures to produce an original K-Pop Hollywood movie scheduled for February 2027, highlighting massive IPs bridging tech and cinema.\n\nSource: Reuters, Korea Fair Trade Commission Public Files, and Variety.",
              KO: "대한민국 엔터테인먼트 '빅4'로 불리는 HYBE, SM, JYP, YG가 이례적으로 공정거래위원회에 합작법인(JV) '파노메논(가칭)' 설립 신고를 완료했다. 이들은 2027년 개최를 목표로 역사상 유례없는 '글로벌 연합 K-POP 페스티벌'을 준비한다고 밝혔다. 이와 더불어 HYBE는 파라마운트 픽처스와 손잡고 K-POP을 소재로 한 할리우드 오리지널 영화를 2027년 2월 개봉 목표로 제작한다고 발표해 전 세계 미디어 시장의 패러다임 변화를 예고했다.\n\n출처: 공정위 신고 내역 요약 분석 및 미국 버라이어티(Variety) 독점 인터뷰 발췌.",
              ES: "HYBE, SM, JYP y YG, las cuatro agencias más grandes de Corea, presentaron una empresa conjunta llamada 'Fanomenon' para organizar un festival global para 2027. Además, HYBE acaba de revelar una asociación con Paramount Pictures para producir una película original de Hollywood sobre el K-Pop, programada para febrero de 2027.\n\nFuente: Informes de agencias financieras coreanas y The Hollywood Reporter."
            },
            videoId: 'gdZLi9oWNZg', accent: '#A855F7',
            tags: ['Fanomenon', 'HYBE', 'BigFour', 'KPopMovie'],
          },
          {
            id: '20260416_02', publishedAt: '2026-04-16T13:00:00Z', slot: 'EST 09:00',
            date: '2026-04-16',
            isNew: false,
            category: { EN: 'Festival Review', KO: '페스티벌 리뷰', ES: 'Reseña Festival' },
            headline: {
              EN: 'Coachella 2025 K-Pop Weekend 1 Recap — LISA, JENNIE, ENHYPEN & XG Shine',
              KO: '코첼라 2025 K-POP 위크엔드 1 종합 리뷰 — 리사·제니·엔하이픈·XG 무대 총정리',
              ES: 'Resumen del Weekend 1 K-Pop en Coachella 2025 — LISA, JENNIE, ENHYPEN y XG brillan',
            },
            lead: {
              EN: "LISA's solo debut set, JENNIE's Ruby Experience, ENHYPEN's 13-song run, and XG's choreography defined K-pop at Coachella 2025.",
              KO: '리사 솔로 데뷔, 제니의 루비 익스피리언스, 엔하이픈의 13곡 세트리스트, XG의 파워풀한 안무까지 코첼라 2025 K-POP을 총정리했다.',
              ES: 'El debut en solitario de LISA, The Ruby Experience de JENNIE, el set de ENHYPEN y la coreografía de XG definieron el K-pop en Coachella 2025.',
            },
            body: {
              EN: "LISA set the stage on fire with her solo debut acts, proving her unparalleled stage presence. JENNIE delivered her distinct Ruby Experience with captivating visuals, while ENHYPEN powered through a massive 13-song set, keeping the energy at an all-time high. XG also brought their A-game with powerful choreography.\n\nSource: Official Coachella YouTube & Global K-Pop News Agencies.",
              KO: "리사는 솔로 데뷔곡들로 코첼라 무대를 완벽하게 장악하며 압도적인 무대 장악력을 증명했다. 제니는 특유의 루비 익스피리언스를 통해 한층 성숙해진 퍼포먼스를 선보였으며, 엔하이픈은 무려 13곡에 달하는 세트리스트를 폭발적인 에너지로 소화하며 현장 분위기를 최고조로 끌어올렸다. XG 역시 파워풀한 군무로 글로벌 팬들의 시선을 사로잡았다.\n\n출처: 코첼라 공식 유튜브 라이브 스트리밍 및 글로벌 주요 엔터 매체 종합.",
              ES: "LISA incendió el escenario con sus temas debut... JENNIE entregó su Ruby Experience característica, mientras que ENHYPEN interpretó 13 canciones con una energía inigualable. XG también deslumbró con su coreografía.\n\nFuente: YouTube oficial de Coachella y agencias globales de noticias."
            },
            videoId: 'WYEsVSmfoes', accent: '#EC4899',
            tags: ['Coachella2025', 'LISA', 'JENNIE', 'ENHYPEN', 'XG'],
          },
          {
            id: '20260416_01', publishedAt: '2026-04-16T00:00:00Z', slot: 'KST 09:00',
            date: '2026-04-16',
            isNew: false,
            category: { EN: 'Awards / Music', KO: '음원 / 수상', ES: 'Premios / Música' },
            headline: {
              EN: "BTS 'SWIM' Earns 3 AMA Nominations Including Artist of the Year",
              KO: "BTS 'SWIM', 제52회 AMA 올해의 아티스트 포함 3개 부문 노미네이션",
              ES: "BTS 'SWIM' logra 3 nominaciones a los AMA incluyendo Artista del Año",
            },
            lead: {
              EN: 'BTS dominates the 52nd American Music Awards nominations alongside aespa, ENHYPEN, Stray Kids, LE SSERAFIM and KATSEYE.',
              KO: 'BTS를 비롯해 aespa·ENHYPEN·스트레이 키즈·르세라핌·KATSEYE 등이 제52회 AMA를 석권했다.',
              ES: 'BTS domina las nominaciones de los 52.os AMA junto a aespa, ENHYPEN, Stray Kids, LE SSERAFIM y KATSEYE.',
            },
            body: {
              EN: "BTS continues to prove their global dominance as 'SWIM' earns three major nominations at the 52nd AMAs, including the highly coveted 'Artist of the Year'. They are joined by a strong K-Pop lineup this year, with aespa, ENHYPEN, Stray Kids, LE SSERAFIM, and KATSEYE all scoring nominations across various categories, highlighting the unstoppable expansion of K-Pop in the mainstream US market.\n\nSource: AMA Official Press Release & Billboard.",
              KO: "방탄소년단(BTS)이 제52회 아메리칸 뮤직 어워즈(AMA)에서 '올해의 아티스트'를 포함해 총 3개 주요 부문에 노미네이트되며 굳건한 글로벌 최정상 인기를 입증했다. 또한 올해 AMA에는 방탄소년단 외에도 에스파, 엔하이픈, 스트레이 키즈, 르세라핌, 캣츠아이 등 다수의 K-POP 아티스트들이 대거 후보에 오르며 미국 주류 음악 시장 내 K-POP의 폭발적인 영향력을 다시 한번 확인시켰다.\n\n출처: 미국 AMA 공식 보도자료 및 빌보드 뉴스 정리.",
              ES: "BTS continúa demostrando su dominio global ya que 'SWIM' obtiene tres nominaciones importantes en los 52.os AMA. Se les unen aespa, ENHYPEN, Stray Kids, LE SSERAFIM y KATSEYE, destacando la expansión imparable del K-Pop.\n\nFuente: Comunicado de prensa oficial de los AMA y Billboard."
            },
            videoId: 'b4iVv91Z6lY', accent: '#37C561',
            tags: ['BTS', 'SWIM', 'AMA2026', 'KPOP'],
          },
          {
            id: '20260415_02', publishedAt: '2026-04-15T13:00:00Z', slot: 'EST 09:00',
            date: '2026-04-15',
            isNew: false,
            category: { EN: 'Full Concert', KO: '풀 콘서트', ES: 'Concierto Completo' },
            headline: {
              EN: '#BANGCHELLA Full 60-min Concert Now on YouTube — Stream BIGBANG Coachella 2026',
              KO: '#BANGCHELLA 풀 콘서트 공개 — 빅뱅 코첼라 2026 60분 전체 공연 유튜브 스트리밍 시작',
              ES: '#BANGCHELLA Concierto Completo de 60 min ya en YouTube — Transmite BIGBANG Coachella 2026',
            },
            lead: {
              EN: 'The full BIGBANG Outdoor Theatre performance at Coachella 2026 is now streamable, including Bang Bang Bang, Fantastic Baby and solo tracks.',
              KO: '빅뱅 코첼라 2026 아웃도어 시어터 전체 공연이 유튜브에 공개됐다. 뱅뱅뱅·판타스틱 베이비·솔로 무대까지 전부 포함.',
              ES: 'La actuación completa de BIGBANG en el Outdoor Theatre de Coachella 2026 ya está en streaming, incluyendo Bang Bang Bang y Fantastic Baby.',
            },
            body: {
              EN: "Good news for fans! The entirety of BIGBANG's epic return at the Coachella Outdoor Theatre is now officially available to stream on YouTube in high definition. The 60-minute video flawlessly captures the explosive energy of their greatest hits like 'Bang Bang Bang' and 'Fantastic Baby', alongside high-octane solo performances by G-Dragon, Taeyang, and Daesung. Social media analytics show that #BANGCHELLA has remained a top global trend for three consecutive days following the performance.\n\nSource: Coachella Official Media Releases.",
              KO: "빅뱅의 완전체 코첼라 아웃도어 시어터 무대의 60분 풀타임 공연 영상이 드디어 코첼라 오피셜 유튜브 채널을 통해 스트리밍 공개되었다. 이 영상에는 글로벌 히트곡 '뱅뱅뱅', '판타스틱 베이비'뿐만 아니라 지드래곤, 태양, 대성의 독보적이고 에너제틱한 솔로 무대까지 전부 고화질로 담겨있다. 빅데이터 결과에 따르면 #BANGCHELLA 키워드는 공연 종료 후에도 3일 연속 글로벌 트렌드 1위를 유지하며 전설의 귀환을 또 한 번 입증했다.\n\n출처: 코첼라 오피셜 유튜브 하이라이트 영상.",
              ES: "¡El regreso completo de BIGBANG en el Outdoor Theatre de Coachella ya está oficialmente disponible para disfrutar en YouTube! Este video de 60 minutos captura la esencia de éxitos como 'Bang Bang Bang' y 'Fantastic Baby', así como los espectaculares números individuales de sus estrellas. La tendencia #BANGCHELLA sigue demostrando el poder del legendario grupo.\n\nFuente: Lanzamientos oficiales de medios de Coachella."
            },
            videoId: 'uI6EwBBFFrQ', accent: '#FF6B6B',
            tags: ['BIGBANG', 'BANGCHELLA', 'FullConcert', 'Coachella2026'],
          },
          {
            id: '20260415_01', publishedAt: '2026-04-15T00:00:00Z', slot: 'KST 09:00',
            date: '2026-04-15',
            isNew: false,
            category: { EN: 'Festival / Live', KO: '글로벌 공연 / 페스티벌', ES: 'Festival / Concierto' },
            headline: {
              EN: 'BIGBANG Returns at Coachella 2026 — A Legendary Comeback After 6 Years',
              KO: '빅뱅, 코첼라 2026 전격 컴백… 6년 공백 깨고 20주년 신호탄',
              ES: 'BIGBANG regresa en Coachella 2026 — Un regreso legendario tras 6 años',
            },
            lead: {
              EN: 'G-Dragon, Taeyang & Daesung lit up Coachella Outdoor Theatre with Bang Bang Bang, Fantastic Baby and more for 60 minutes.',
              KO: 'G-드래곤·태양·대성 트리오가 뱅뱅뱅, 판타스틱 베이비 등으로 코첼라 아웃도어 시어터를 60분간 불태웠다.',
              ES: 'G-Dragon, Taeyang y Daesung iluminaron el Outdoor Theatre de Coachella con Bang Bang Bang, Fantastic Baby y más durante 60 minutos.',
            },
            body: {
              EN: "K-pop legends BIGBANG made a monumental return, closing out the Coachella Outdoor Theatre. Breaking a six-year hiatus, G-Dragon, Taeyang, and Daesung joined forces to celebrate their 20th anniversary with an electrifying 60-minute headliner-tier set. Fans witnessed a masterpiece of live performance as the trio executed unmatched stage presence, leaving critics calling it 'The absolute peak of K-Pop live mastery'.\n\nSource: Rolling Stone & Billboard Reviews.",
              KO: "K팝의 영원한 레전드 '빅뱅'이 장장 6년의 공백을 깨고 코첼라 2026 아웃도어 시어터의 밤을 불태우며 전격 컴백했다! 지드래곤, 태양, 대성 트리오가 데뷔 20주년의 신호탄을 쏘아올리는 60분의 폭발적인 세트리스트(라이브 밴드 편곡)를 선사했다. 현지 매체와 평론가들은 '가장 완벽하게 조율된, K팝 역대 최고의 라이브 장악력'이라는 압도적인 찬사를 쏟아냈다.\n\n출처: 미국 롤링스톤(Rolling Stone) 프리뷰 및 전문가 라이브 리뷰.",
              ES: "Las leyendas del K-Pop, BIGBANG, rompieron su pausa de seis años en una impresionante presentación de 60 minutos en el Outdoor Theatre de Coachella 2026. Para celebrar su vigésimo aniversario, G-Dragon, Taeyang y Daesung combinaron voces y una inmensa energía desatando la histeria entre los fans en lo que la crítica denomina 'el regreso de los verdaderos reyes del pop asiático'.\n\nFuente: Rolling Stone y Billboard Reviews."
            },
            videoId: 'WYEsVSmfoes', accent: '#FF00FF',
            tags: ['BIGBANG', 'BANGCHELLA', 'Coachella2026'],
          },
        ];

        // Sort newest first (already ordered, but sort guarantees it)
        const sorted = [...HOT_ISSUES].sort((a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        const featured = sorted.slice(0, 3);
        const past = sorted.slice(3);

        return (
          <>
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="relative pr-4">
                    <span className="text-xl font-black tracking-tighter">{t('hotIssueTitle')}</span>
                    <div className="absolute -top-1 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    <div className="absolute -top-1 right-0 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-1">{t('hotIssueSub')}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Update schedule badge */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-zinc-500" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{t('updateSchedule')}</span>
                </div>
                {/* LIVE badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">LIVE</span>
                </div>
              </div>
            </div>

            {/* ── Featured Cards (latest 3) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featured.map((issue) => {
                const headline = (issue.headline as Record<string,string>)[lang] ?? issue.headline['EN'];
                const lead = (issue.lead as Record<string,string>)[lang] ?? issue.lead['EN'];
                const category = (issue.category as Record<string,string>)[lang] ?? issue.category['EN'];
                return (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative glassmorphism rounded-3xl overflow-hidden border border-white/5 flex flex-col hover:border-white/15 transition-all duration-500"
                    whileHover={{ boxShadow: `0 0 40px -10px ${issue.accent}40` }}
                  >
                    {/* YouTube Thumbnail */}
                    <div className="relative w-full aspect-video overflow-hidden bg-zinc-900">
                      <img
                        src={`https://img.youtube.com/vi/${issue.videoId}/hqdefault.jpg`}
                        alt={headline}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                      />
                      {/* Play button */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center bg-black/60 border-2 backdrop-blur-sm group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                          style={{ borderColor: `${issue.accent}80` }}
                        >
                          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white ml-1" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                      {/* Date top-left */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 pointer-events-none">
                        <span className="text-[9px] font-black text-zinc-300 tracking-widest">{issue.date}</span>
                      </div>
                      {/* Slot + Archive ID top-right */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-black/70 border border-white/10" style={{ color: issue.accent }}>{issue.slot}</span>
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-black/70 border border-white/10 text-zinc-500">{issue.id}</span>
                      </div>
                      {/* NEW badge */}
                      {issue.isNew && (
                        <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse">
                          {t('newTag')}
                        </div>
                      )}
                    </div>
                    {/* Card Body */}
                    <div className="flex flex-col flex-1 p-5 gap-3">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border w-fit"
                        style={{ color: issue.accent, borderColor: `${issue.accent}40`, backgroundColor: `${issue.accent}15` }}
                      >{category}</span>
                      <h3 className="text-sm font-black tracking-tight leading-snug line-clamp-2">{headline}</h3>
                      <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2 flex-1">{lead}</p>
                      <div className="mt-auto pt-4 flex gap-2 w-full">
                        <button 
                          onClick={() => setSelectedIssue(issue)}
                          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-all text-white"
                        >
                          {lang === 'KO' ? '기사 상세보기' : lang === 'ES' ? 'Ver Detalles' : 'Read Full Article'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Past Issues Toggle Button ── */}
            {past.length > 0 && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <button
                  onClick={() => setShowPastIssues(!showPastIssues)}
                  className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/8 transition-all group"
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-white transition-colors">
                    {showPastIssues ? t('hidePastIssues') : `${t('viewPastIssues')} (${past.length})`}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-4 h-4 fill-zinc-500 group-hover:fill-white transition-all duration-300 ${showPastIssues ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                </button>

                {/* ── Past Issues List ── */}
                <AnimatePresence>
                  {showPastIssues && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="w-full overflow-hidden"
                    >
                      <div className="border border-white/8 rounded-3xl overflow-hidden bg-white/[0.02] backdrop-blur-sm divide-y divide-white/5">
                        {past.map((issue, idx) => {
                          const headline = (issue.headline as Record<string,string>)[lang] ?? issue.headline['EN'];
                          const lead = (issue.lead as Record<string,string>)[lang] ?? issue.lead['EN'];
                          const category = (issue.category as Record<string,string>)[lang] ?? issue.category['EN'];
                          return (
                            <motion.div
                              key={issue.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex flex-col sm:flex-row items-center gap-4 p-5 hover:bg-white/5 transition-colors group"
                            >
                              {/* Thumbnail small */}
                              <div className="relative w-full sm:w-40 shrink-0 aspect-video rounded-xl overflow-hidden bg-zinc-900">
                                <img
                                  src={`https://img.youtube.com/vi/${issue.videoId}/mqdefault.jpg`}
                                  alt={headline}
                                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-black/60 border flex items-center justify-center" style={{ borderColor: `${issue.accent}60` }}>
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white ml-0.5" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" /></svg>
                                  </div>
                                </div>
                              </div>
                              {/* Text content */}
                              <div className="flex flex-col gap-2 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                                    style={{ color: issue.accent, borderColor: `${issue.accent}40`, backgroundColor: `${issue.accent}15` }}
                                  >{category}</span>
                                  <span className="text-[9px] font-mono text-zinc-600">{issue.date}</span>
                                </div>
                                <p className="text-sm font-black text-white w-full sm:w-auto" style={{ wordBreak: 'keep-all' }}>{headline}</p>
                                <p className="text-xs text-zinc-400 w-full sm:w-auto line-clamp-1">{lead}</p>
                              </div>
                              <div className="shrink-0">
                                <button 
                                  onClick={() => setSelectedIssue(issue)}
                                  className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10 whitespace-nowrap"
                                >
                                  {lang === 'KO' ? '상세보기' : lang === 'ES' ? 'Detalles' : 'Details'}
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        );
      })()}
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
            <div className="flex-1 md:w-64 flex items-center bg-white/5 rounded-2xl px-5 py-3 gap-3 border border-white/10 focus-within:border-[var(--neon-lime)]/50 transition-all">
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
              className="shrink-0 flex items-center gap-2 px-5 py-3 bg-[var(--neon-lime)]/10 border border-[var(--neon-lime)]/30 rounded-2xl text-[var(--neon-lime)] hover:bg-[var(--neon-lime)] hover:text-black transition-all group"
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
                      className={`w-full mt-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all relative z-10 ${isBounc ? 'vote-bounce' : ''} ${!userCountry ? 'opacity-50' : ''} ${activeVotes[a.id] === 'success' ? 'bg-emerald-500 text-white' :
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
              <Sparkles size={20} className="text-[var(--neon-lime)]" />
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
                    className="glassmorphism p-5 rounded-[1.5rem] flex items-center justify-between group border border-white/5 hover:border-[var(--neon-lime)]/30 transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="w-6 font-mono text-zinc-600 font-black italic text-sm shrink-0">
                        #{index + 4}
                      </span>
                      <Link href={`/artist/${a.id}`} className="flex items-center gap-3 group/link min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center group-hover/link:border-[var(--neon-lime)]/40 transition-colors shrink-0">
                          {a.image_url
                            ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                            : <span className="font-black text-xl text-zinc-600">{a.name[0]}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-base tracking-tight leading-none group-hover/link:text-[var(--neon-lime)] transition-colors truncate">
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
                          : 'border-zinc-700 hover:bg-[var(--neon-lime)] hover:text-black hover:border-[var(--neon-lime)]'
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
                className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[var(--neon-lime)]/50 hover:bg-[var(--neon-lime)]/5 transition-all group flex items-center gap-2"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-[var(--neon-lime)] transition-colors">
                  {showAllUpcoming ? t('showLess') : t('showMore')}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full bg-[var(--neon-lime)] shadow-[0_0_8px_var(--neon-lime)] transition-transform duration-300 ${showAllUpcoming ? 'rotate-180' : ''}`} />
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
                        <span className="w-2 h-2 bg-[var(--neon-lime)] rounded-full animate-pulse shadow-[0_0_10px_var(--neon-lime)]" />
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest break-keep">
                          {t('votingRuleNotice')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-2 bg-black/40 border border-[var(--neon-lime)]/30 rounded-full text-[var(--neon-lime)] text-[10px] font-black uppercase tracking-widest animate-pulse">
                    LIVE_SYNC_ACTIVE
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['RIIZE', 'BOYNEXTDOOR', 'TWS'].map((name, i) => {
                    const artist = artists.find(a => a.name.toUpperCase() === name);
                    const votes = artist?.total_votes || 0;
                    const isTop = i === 0;

                    return (
                      <div key={name} className="glassmorphism p-6 rounded-3xl border-white/5 hover:border-[var(--neon-lime)]/40 transition-all flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 uppercase font-black text-[8px] text-zinc-500 tracking-widest">
                            <span className="opacity-50">{t('rank')}</span>
                            <span className="text-[var(--neon-lime)]">{i + 1}</span>
                          </div>
                          {isTop && <Trophy size={14} className="text-yellow-400 vibrant-glow" />}
                        </div>

                        {/* Artist Link Wrapper */}
                        {artist ? (
                          <Link href={`/artist/${artist.id}`} className="flex items-center gap-4 group/artist">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 overflow-hidden shrink-0 group-hover/artist:border-[var(--neon-lime)]/50 transition-all">
                              {artist.image_url ? (
                                <img src={artist.image_url} alt={name} className="w-full h-full object-cover group-hover/artist:scale-110 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-xl text-zinc-700">{name[0]}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-black text-xl tracking-tighter truncate group-hover/artist:text-[var(--neon-lime)] transition-colors">{name}</h4>
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
                          className={`w-full py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${artist && activeVotes[artist.id] === 'success'
                              ? 'bg-[var(--neon-lime)] text-black border-[var(--neon-lime)] shadow-[0_0_15px_rgba(var(--neon-lime-rgb),0.4)]'
                              : artist && activeVotes[artist.id] === 'loading'
                                ? 'bg-zinc-800 text-zinc-500 border-white/5 cursor-not-allowed'
                                : 'bg-white/5 border-white/10 hover:bg-[var(--neon-lime)] hover:text-black hover:border-[var(--neon-lime)]'
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

            {/* ── Past Battles Toggle ── */}
            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                onClick={() => setShowPastBattles(!showPastBattles)}
                className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[var(--neon-lime)]/50 hover:bg-[var(--neon-lime)]/5 transition-all group"
              >
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-[var(--neon-lime)] transition-colors">
                  {showPastBattles ? t('hidePastBattles') : `${t('pastBattles')}`}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`w-4 h-4 fill-zinc-500 group-hover:fill-[var(--neon-lime)] transition-all duration-300 ${showPastBattles ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                </svg>
              </button>

              <AnimatePresence>
                {showPastBattles && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="w-full overflow-hidden max-w-4xl max-h-[400px] overflow-y-auto custom-scrollbar"
                  >
                    <div className="border border-white/8 rounded-3xl overflow-hidden bg-white/[0.02] backdrop-blur-sm divide-y divide-white/5 mt-4">
                      {/* Past Battle 1 */}
                      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 hover:bg-white/5 transition-colors group">
                        <div className="flex flex-col items-center sm:items-start shrink-0 min-w-[120px]">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black text-[#A855F7] border border-[#A855F7]/30 bg-[#A855F7]/10 mb-2">2026. 03</span>
                          <span className="text-sm font-black text-white">{lang === 'KO' ? '글로벌 루키즈' : lang === 'ES' ? 'Novatos Globales' : 'Global Rookies'}</span>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2 sm:gap-4 items-center justify-center sm:justify-start">
                          <span className="text-zinc-500 font-bold text-xs opacity-70 line-through">ILLIT</span>
                          <span className="text-zinc-700 text-xs font-black">VS</span>
                          <span className="text-[var(--neon-lime)] font-black tracking-widest text-sm flex items-center gap-1">
                            <Trophy size={14} className="text-yellow-400" /> BABYMONSTER
                          </span>
                          <span className="text-zinc-700 text-xs font-black">VS</span>
                          <span className="text-zinc-500 font-bold text-xs opacity-70 line-through">KISS OF LIFE</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">{t('battleWinner')}: BABYMONSTER</span>
                        </div>
                      </div>

                      {/* Past Battle 2 */}
                      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 hover:bg-white/5 transition-colors group">
                        <div className="flex flex-col items-center sm:items-start shrink-0 min-w-[120px]">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black text-[#3b82f6] border border-[#3b82f6]/30 bg-[#3b82f6]/10 mb-2">2026. 02</span>
                          <span className="text-sm font-black text-white">{lang === 'KO' ? '2세대 귀환' : lang === 'ES' ? 'Regreso de la 2.ª Gen' : 'Return of 2nd Gen'}</span>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2 sm:gap-4 items-center justify-center sm:justify-start">
                          <span className="text-[#37C561] font-black tracking-widest text-sm flex items-center gap-1">
                            <Trophy size={14} className="text-yellow-400" /> SHINee
                          </span>
                          <span className="text-zinc-700 text-xs font-black">VS</span>
                          <span className="text-zinc-500 font-bold text-xs opacity-70 line-through">2PM</span>
                          <span className="text-zinc-700 text-xs font-black">VS</span>
                          <span className="text-zinc-500 font-bold text-xs opacity-70 line-through">HIGHLIGHT</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">{t('battleWinner')}: SHINee</span>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
          <Link href="/privacy" className="hover:text-[var(--neon-lime)] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[var(--neon-lime)] transition-colors">
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

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        lang={lang}
        onComplete={(country) => {
          setUserCountry(country);
          setToast({
            isVisible: true,
            message: t('syncSuccess'),
            subMessage: t('nodeStable')
          });
        }}
      />
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        subMessage={toast.subMessage}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
      {/* ── Hot Issue Detail Modal ── */}
      <AnimatePresence>
        {selectedIssue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedIssue(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-4xl glassmorphism rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/10"
              style={{ boxShadow: `0 0 50px -10px ${selectedIssue.accent}50` }}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg text-xs font-black border tracking-widest uppercase bg-white/5" style={{ color: selectedIssue.accent, borderColor: `${selectedIssue.accent}50` }}>
                    {selectedIssue.slot}
                  </span>
                  <span className="text-zinc-500 text-xs font-mono">{selectedIssue.id}</span>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto custom-scrollbar flex-1">
                <div className="w-full aspect-video bg-black">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${selectedIssue.videoId}?autoplay=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="p-8 space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug mb-3">
                      {(selectedIssue.headline as Record<string,string>)[lang] ?? selectedIssue.headline['EN']}
                    </h2>
                    <p className="text-lg text-zinc-400 font-medium leading-relaxed">
                      {(selectedIssue.lead as Record<string,string>)[lang] ?? selectedIssue.lead['EN']}
                    </p>
                  </div>
                  
                  <div className="w-full h-px bg-white/10" />

                  <div className="text-sm text-zinc-300 leading-loose whitespace-pre-wrap font-medium">
                    {selectedIssue.body ? ((selectedIssue.body as Record<string,string>)[lang] ?? selectedIssue.body['EN']) : (lang === 'KO' ? '상세 보도자료 내용을 불러오고 있습니다...' : 'Loading detailed press release...')}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4">
                    {selectedIssue.tags.map((tag: string) => (
                      <span key={tag} className="text-xs text-zinc-500 font-bold tracking-widest px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hologram Card Modal ── */}
      <AnimatePresence>
        {showHologramCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setShowHologramCard(null)}
          >
            {/* Hologram Card */}
            <motion.div
              ref={hologramCardRef}
              initial={{ scale: 0.8, y: 50, rotateY: -20 }}
              animate={{ scale: 1, y: 0, rotateY: 0 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[320px] aspect-[2/3] rounded-[24px] p-1 overflow-hidden group shadow-[0_0_50px_rgba(255,255,255,0.15)]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.8) 100%)',
              }}
              id="hologram-card-capture"
            >
              {/* Card Inner */}
              <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-[#09090b] flex flex-col items-center">
                {/* Artist Background (Converted from CSS bg for capture reliability) */}
                <div className="absolute inset-0 opacity-40 mix-blend-screen scale-110">
                  <img 
                    src={showHologramCard.artist.image_url || ''} 
                    alt="" 
                    className="w-full h-full object-cover filter blur-[10px] saturate-[1.5]"
                    crossOrigin="anonymous"
                  />
                </div>
                
                <div className="relative z-10 w-full h-1/2 p-4 pt-8 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/50 shadow-2xl mb-4 bg-black">
                    <img 
                      src={showHologramCard.artist.image_url || ''} 
                      alt={showHologramCard.artist.name} 
                      className="w-full h-full object-cover" 
                      crossOrigin="anonymous"
                    />
                  </div>
                  <h3 className="text-2xl font-black tracking-tighter text-white drop-shadow-md text-center leading-tight">
                    {showHologramCard.artist.name}
                  </h3>
                  <div className="mt-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                    <span className="text-[10px] font-black tracking-widest text-[var(--neon-lime)] uppercase">{t('hologramRank')} #{showHologramCard.rank}</span>
                  </div>
                </div>

                <div className="relative z-10 w-full h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center justify-end p-6 text-center">
                  <p className="text-xs font-medium text-[#d4d4d8] leading-relaxed mb-4">
                    {t('fueledMsg')}
                  </p>
                  <img src="/stan_dom_logo_transparent2.png" className="h-4 opacity-50" alt="LOGO" />
                </div>

                {/* Shimmer Effect */}
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[20px]">
                  <div className="absolute top-0 left-[-150%] w-[50%] h-[200%] rotate-[30deg] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-hologram" />
                </div>
              </div>
            </motion.div>

            {/* Share Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="mt-8 flex flex-col items-center gap-3 w-full max-w-[280px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-2 w-full">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(t('tweetTemplate').replace('{rank}', String(showHologramCard.rank)).replace('{artist}', showHologramCard.artist.name))}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://standom.online')}&hashtags=${encodeURIComponent(`${showHologramCard.artist.name.replace(/\s+/g, '')},KPOP_VOTE,STANDOM`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black font-black text-[10px] tracking-widest uppercase hover:scale-105 transition-all shadow-xl shadow-white/10"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.005 4.13H5.028z" /></svg>
                  X
                </a>
                <button
                  onClick={async () => {
                    handleDownloadCard(); // Start download in background
                    handleCopyProfileLink();
                    setShowInstaGuide(true); // Show guide immediately
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] text-white font-black text-[10px] tracking-widest uppercase hover:scale-105 transition-all shadow-xl shadow-red-500/20"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  Instagram
                </button>
              </div>

              <button
                onClick={handleDownloadCard}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--neon-lime)] text-black font-black text-[10px] tracking-widest uppercase hover:scale-105 transition-all shadow-xl shadow-[var(--neon-lime)]/20"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                {t('downloadCard')}
              </button>

              <button onClick={() => setShowHologramCard(null)} className="mt-2 text-[10px] text-zinc-500 font-bold hover:text-white transition-colors tracking-widest uppercase">
                {t('close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstaGuide && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl"
            onClick={() => setShowInstaGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm glassmorphism p-8 rounded-[2.5rem] border border-white/20 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] flex items-center justify-center shadow-2xl shadow-red-500/40">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </div>
              
              <h3 className="text-xl font-black mb-4 tracking-tighter">SUCCESS!</h3>
              
              <div className="space-y-3 text-left mb-8">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-5 h-5 rounded-full bg-[var(--neon-lime)] flex items-center justify-center text-[10px] text-black font-black">1</div>
                    <span className="text-[10px] font-bold text-zinc-200">{t('instaStep1')}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-5 h-5 rounded-full bg-[var(--neon-lime)] flex items-center justify-center text-[10px] text-black font-black">2</div>
                    <span className="text-[10px] font-bold text-zinc-200">{t('instaStep2')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-[var(--neon-lime)]/30 border-dashed">
                  <div className="w-6 h-6 rounded-full bg-[var(--neon-lime)] flex items-center justify-center text-[10px] text-black font-black animate-pulse">3</div>
                  <span className="text-[11px] font-black text-[var(--neon-lime)] uppercase tracking-tighter">{t('instaStep3')}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-black italic">🔗</div>
                  <span className="text-[10px] font-medium text-zinc-300">
                    {t('instaStep4')}
                  </span>
                </div>
                <p className="text-[9px] text-zinc-500 font-medium text-center opacity-60">
                   ⚠️ {t('feedWarning')}
                </p>
              </div>

              <button
                onClick={() => {
                  window.location.href = 'instagram://app';
                  setTimeout(() => {
                    window.open('https://www.instagram.com/', '_blank');
                  }, 500);
                  setShowInstaGuide(false);
                }}
                className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-white/10"
              >
                {t('openInstaApp')}
              </button>
              
              <button 
                onClick={() => setShowInstaGuide(false)}
                className="mt-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
              >
                {t('close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Image Preview Modal (Final reliability fix for mobile) */}
      <AnimatePresence>
        {generatedImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl"
            onClick={() => setGeneratedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm flex flex-col items-center"
            >
              <div className="mb-6 text-center">
                <h3 className="text-xl font-black text-white tracking-tighter uppercase mb-1">{t('previewTitle')}</h3>
                <p className="text-[10px] font-bold text-[var(--neon-lime)] uppercase tracking-widest animate-pulse">
                  ✨ {t('longPressToSave')} ✨
                </p>
              </div>

              <div className="relative group w-full aspect-[2/3] rounded-[32px] overflow-hidden shadow-[0_0_80px_rgba(255,255,255,0.1)] border border-white/10">
                <img 
                  src={generatedImage} 
                  alt="Support Card" 
                  className="w-full h-full object-contain pointer-events-auto"
                  onContextMenu={(e) => e.stopPropagation()} // Allow context menu
                />
              </div>

              <button
                onClick={() => setGeneratedImage(null)}
                className="mt-8 px-12 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-all"
              >
                {t('close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
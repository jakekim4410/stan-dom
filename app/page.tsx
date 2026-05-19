'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { domToJpeg } from 'modern-screenshot';
import { toJpeg, toBlob } from 'html-to-image';
import { createClient } from '@/utils/supabase/client';
import { voteForArtist } from '@/actions/vote';
import { getRemainingVotes } from '@/actions/getRemainingVotes';
import { getTodayBirthdays } from '@/actions/getTodayBirthdays';
import { getLangName } from '@/utils/localization';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Vote, Search, PlusCircle, Sparkles, Globe as GlobeIcon, Map, Mail, Cake, CheckCircle2, Music2, Gift, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Language, getT } from '@/constants/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CountryRankingPopup from '@/components/CountryRankingPopup';
import CountrySelector from '@/components/CountrySelector';
import OnboardingModal from '@/components/OnboardingModal';
import { Country } from '@/constants/countryData';
import InquiryModal from '@/components/InquiryModal';
import RewardedAdModal from '@/components/RewardedAdModal';
import Toast from '@/components/Toast';
import ExitNotification from '@/components/ExitNotification';
import { getHotIssues, type HotIssue } from '@/actions/getHotIssues';

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), { ssr: false });
const FlatMap = dynamic(() => import('@/components/FlatMap'), { ssr: false });
const AddArtistModal = dynamic(() => import('@/components/AddArtistModal'), { ssr: false });
const BirthdayPromotion = dynamic(() => import('@/components/BirthdayPromotion'), { ssr: false });

type MapView = 'globe' | 'flat';

interface Artist {
  id: string;
  name: string; // Now expected to be a JSON string like {"EN":"...", "KO":"..."}
  image_url: string | null;
  total_votes: number;
  birthday: string | null;
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
  const [showAdModal, setShowAdModal] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showPastIssues, setShowPastIssues] = useState(false);
  const [pastIssuePage, setPastIssuePage] = useState(0);
  const [showPastBattles, setShowPastBattles] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [issueVideoActive, setIssueVideoActive] = useState(false);
  const [hotIssues, setHotIssues] = useState<HotIssue[]>([]);
  const [hotIssuesLoading, setHotIssuesLoading] = useState(true);
  const [showHologramCard, setShowHologramCard] = useState<{ artist: Artist; rank: number } | null>(null);
  const [showInstaGuide, setShowInstaGuide] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [toast, setToast] = useState({ isVisible: false, message: '', subMessage: '' });
  const [voteQuota, setVoteQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const [birthdayArtistIds, setBirthdayArtistIds] = useState<Set<string>>(new Set());
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [isAppEnv, setIsAppEnv] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const hologramCardRef = useRef<HTMLDivElement>(null);
  const staticHologramCardRef = useRef<HTMLDivElement>(null);

  // Detect if running inside React Native WebView (mobile app)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isApp = !!(window as any).ReactNativeWebView || !!(window as any).isAppEnv || !!(window as any).STAN_DOM_APP;
      setIsAppEnv(isApp);
    }
  }, []);

  const t = getT(lang);

  // Helper to detect generic placeholder or missing videos
  const isPlaceholderVideo = useCallback((vidId: string | null | undefined) => {
    if (!vidId) return true;
    const placeholders = ['gdZLi9oWNZg', 'ArmDp-zijuc', 'fE2h3lGlOsk', 'Zp804HSY03A', 'k6a7Zon-p64', 'd9IxdwEFk1c', 'wkZpBWkhbck', 'invalid', ''];
    return placeholders.includes(vidId);
  }, []);

  // 뉴스 모달이 열리면 바로 영상이 재생되도록 상태 수정
  useEffect(() => {
    if (selectedIssue) {
      setIssueVideoActive(true);
    } else {
      setIssueVideoActive(false);
    }
  }, [selectedIssue]);

  // Auto-close Toast after 2.5 seconds to prevent blocking UI
  useEffect(() => {
    if (toast.isVisible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, isVisible: false }));
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.isVisible]);

  const closeAllModals = useCallback(() => {
    let closedAny = false;
    if (selectedIssue) { setSelectedIssue(null); closedAny = true; }
    if (showHologramCard) { setShowHologramCard(null); closedAny = true; }
    if (isAddArtistOpen) { setIsAddArtistOpen(false); closedAny = true; }
    if (isInquiryModalOpen) { setIsInquiryModalOpen(false); closedAny = true; }
    if (showAdModal) { setShowAdModal(false); closedAny = true; }
    if (isOnboardingOpen) { setIsOnboardingOpen(false); closedAny = true; }
    if (showInstaGuide) { setShowInstaGuide(false); closedAny = true; }
    return closedAny;
  }, [selectedIssue, showHologramCard, isAddArtistOpen, isInquiryModalOpen, showAdModal, isOnboardingOpen, showInstaGuide]);

  // Handle Backspace/Escape keyboard inputs to act exactly like the X close button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      )) {
        return; // Allow normal deletion in text inputs
      }
      if (e.key === 'Backspace' || e.key === 'Escape') {
        const closed = closeAllModals();
        if (closed) {
          e.preventDefault();
        } else if (e.key === 'Backspace') {
          // If no modals were open and backspace was pressed, it's the root exit trigger!
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('request-app-exit'));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAllModals]);

  const modalOpenRef = useRef(false);
  const isAnyModalOpen = !!(selectedIssue || showHologramCard || isAddArtistOpen || isInquiryModalOpen || showAdModal || isOnboardingOpen || showInstaGuide);

  // Sync modal state with browser history for Android Back Button & Swipe Back support
  useEffect(() => {
    if (isAnyModalOpen) {
      if (!modalOpenRef.current) {
        window.history.pushState({ modalOpen: true }, '');
        modalOpenRef.current = true;
      }
    } else {
      if (modalOpenRef.current) {
        modalOpenRef.current = false;
        if (typeof window !== 'undefined' && window.history.state?.modalOpen) {
          window.history.back();
        }
      }
    }
  }, [isAnyModalOpen]);

  // Trap root back button/popstate to trigger exit confirmation
  useEffect(() => {
    // Push an initial base state so that canGoBack is true and we can trap the next back press
    if (typeof window !== 'undefined' && !window.history.state?.rootBase) {
      // Push twice so the back button is definitively trapped
      window.history.pushState({ rootBase: true }, '');
      window.history.pushState({ rootBase: true }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (modalOpenRef.current) {
        closeAllModals();
        modalOpenRef.current = false;
      } else if (!isAnyModalOpen) {
        // Root back action triggered! Intercept and show exit confirmation modal.
        window.dispatchEvent(new CustomEvent('request-app-exit'));
      }
      // ALWAYS push the base state back to trap it again and prevent navigating to external oauth screens
      window.history.pushState({ rootBase: true }, '');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [closeAllModals, isAnyModalOpen]);

  // Listen to close-all-modals event from React Native WebView
  useEffect(() => {
    const handleCloseAll = () => {
      closeAllModals();
    };
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, [closeAllModals]);

  // Sync isRoot and isAnyModalOpen state with React Native WebView
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.ReactNativeWebView) {
        win.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'APP_STATE',
          isRoot: true,
          isAnyModalOpen
        }));
      }
    }
  }, [isAnyModalOpen]);

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
      await Promise.all([
        fetchArtists(),
        fetchCountryStats(),
        refreshQuota(),
        fetchBirthdays(),
        fetchHotIssues(),
      ]);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotIssues = async () => {
    try {
      const issues = await getHotIssues();
      setHotIssues(issues);
    } catch (err) {
      console.error('[fetchHotIssues]', err);
    } finally {
      setHotIssuesLoading(false);
    }
  };

  const refreshQuota = async () => {
    const res = await getRemainingVotes();
    if (res.success) {
      setVoteQuota({ remaining: res.remaining!, limit: res.limit! });
    }
  };

  const fetchBirthdays = async () => {
    const res = await getTodayBirthdays();
    if (res.success && res.birthdays) {
      // 오늘 생일인 대상(isUpcoming이 아닌)만 필터링해서 artist ID 추출
      const todayStars = res.birthdays.filter((b: any) => !b.isUpcoming);
      const ids = new Set<string>();
      todayStars.forEach((star: any) => {
        if (star.type === 'artist') ids.add(star.id);
        else if (star.artist_id) ids.add(star.artist_id);
      });
      setBirthdayArtistIds(ids);
    }
  };

  const handleDownloadCard = async () => {
    if (staticHologramCardRef.current === null) return;
    try {
      setToast({ isVisible: true, message: 'Generating Image...', subMessage: 'Please wait a moment' });
      setIsCapturing(true); // Disable shimmer for clean capture
      
      // Delay to ensure shimmer is hidden
      await new Promise(resolve => setTimeout(resolve, 100));

      let dataUrl: string;
      try {
        dataUrl = await toJpeg(staticHologramCardRef.current, {
          quality: 0.8,
          backgroundColor: '#020205',
          pixelRatio: 2,
          skipAutoScale: true,
          cacheBust: true,
        });
      } catch (pngErr) {
        console.warn('[Download] toJpeg failed, trying domToJpeg fallback:', pngErr);
        dataUrl = await domToJpeg(staticHologramCardRef.current, {
          scale: 1.5,
          quality: 0.8,
          backgroundColor: '#020205',
        });
      }
      
      setGeneratedImage(dataUrl);
      setIsCapturing(false);
      setToast({ isVisible: false, message: '', subMessage: '' }); 
    } catch (err) {
      console.error('Download failed:', err);
      setIsCapturing(false);
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
    // 1. Fetch all artists
    const { data: artistsData, error: artError } = await supabase
        .from('artists')
        .select('*');
    if (artError) throw artError;

    // 2. Fetch the true vote counts by aggregating votes table rows
    const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('artist_id');
    
    let trueVoteCounts: Record<string, number> = {};
    if (!votesError && votesData) {
      votesData.forEach(v => {
        if (v.artist_id) {
          trueVoteCounts[v.artist_id] = (trueVoteCounts[v.artist_id] || 0) + 1;
        }
      });
    }

    // Pre-parse names and set the REAL aggregated total_votes
    const parsedData = (artistsData || []).map(a => {
      let nameObj = a.name;
      if (typeof a.name === 'string' && (a.name.startsWith('{') || a.name.startsWith('['))) {
        try {
          nameObj = JSON.parse(a.name);
        } catch (e) {
          console.warn('Failed to parse artist name JSON', a.id);
        }
      }
      // Use the actual votes count from votes table if available, fallback to total_votes
      const realVotes = trueVoteCounts[a.id] !== undefined ? trueVoteCounts[a.id] : (a.total_votes || 0);
      return { ...a, name: nameObj, total_votes: realVotes };
    });

    // Sort by the true, updated total_votes descending
    parsedData.sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0));

    setArtists(parsedData);
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

      // Confetti celebration with theme color and birthday flair
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.7 },
        colors: [themeColor || '#37C561', '#ffffff', '#FFD700', '#FF00FF'],
        disableForReducedMotion: true
      });

      const votedArtist = artists.find(a => a.id === id);
      const rank = artists.findIndex(a => a.id === id) + 1;

      refreshQuota();
      fetchArtists(); // Dynamically sync the new DB votes count immediately!

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
        name: getLangName(artists.find(a => a.id === artistId)?.name, lang) || '???',
        votes,
        rank: i + 1,
      }));
  }, [countryArtistVotes, artists, lang]);

  // ── [추가] FlatMap용 artists 변환 ──────────────────────────
  const flatMapArtists = artists.map(a => ({
    id: a.id,
    name: getLangName(a.name, lang),
    image: a.image_url ?? undefined,
  }));
  // ──────────────────────────────────────────────────────────

  const filteredArtists = artists.filter(a =>
    getLangName(a.name, lang).toLowerCase().includes(searchQuery.toLowerCase()) ||
    getLangName(a.name, 'EN').toLowerCase().includes(searchQuery.toLowerCase()) ||
    getLangName(a.name, 'KO').toLowerCase().includes(searchQuery.toLowerCase())
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
  const themeColor = topArtist && FANDOM_COLORS[getLangName(topArtist.name, 'EN')] 
    ? FANDOM_COLORS[getLangName(topArtist.name, 'EN')] 
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
    <main className="flex-1 bg-[#020205] text-white relative flex flex-col overflow-x-hidden">
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
      <nav className="sticky top-0 z-50 bg-black/40 backdrop-blur-3xl border-b px-4 sm:px-6 py-3 sm:py-4 transition-colors duration-1000" style={{ borderColor: `${themeColor}20` }}>
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between">
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
                  🏆 <span className="text-zinc-300">CURRENT #1:</span> {getLangName(topArtist.name, lang)}
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
            <button
              onClick={async () => {
                setRefreshLoading(true);
                try {
                  await Promise.all([fetchArtists(), refreshQuota()]);
                } catch (e) {
                  console.error(e);
                } finally {
                  setTimeout(() => setRefreshLoading(false), 500);
                }
              }}
              className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all border border-white/10 flex items-center justify-center"
              aria-label="Refresh Data"
            >
              <RefreshCw size={14} className={refreshLoading ? 'animate-spin' : ''} />
            </button>
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
      <div className="max-w-[1400px] w-full mx-auto px-2 sm:px-4 pt-4 sm:pt-8 pb-4">
        <div className="glassmorphism rounded-[2rem] p-4 sm:p-5 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between border-white/5 shadow-2xl">
          
          {/* Left/Top Group: Country Selector & Map Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-72 relative group flex-shrink-0 z-20">
              <CountrySelector selected={userCountry} onSelect={setUserCountry} lang={lang} />
              {!userCountry && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-lg shadow-red-500/20 z-20">
                  {t('required')}
                </div>
              )}
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/10 flex-shrink-0" />

            <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 flex-shrink-0">
              <button
                onClick={() => setMapView('globe')}
                className={`flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-xl text-[11px] font-black transition-all ${mapView === 'globe'
                  ? 'bg-[var(--neon-lime)] text-black shadow-[0_0_20px_rgba(var(--neon-lime-rgb),0.3)]'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <GlobeIcon size={14} />
                <span className="hidden sm:inline">{t('globe')}</span>
              </button>
              <button
                onClick={() => setMapView('flat')}
                className={`flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-xl text-[11px] font-black transition-all ${mapView === 'flat'
                  ? 'bg-[var(--neon-lime)] text-black shadow-[0_0_20px_rgba(var(--neon-lime-rgb),0.3)]'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Map size={14} />
                <span className="hidden sm:inline">{t('flatMap')}</span>
              </button>
            </div>
          </div>

          {/* Right/Bottom Group: Status & Mega Music Hook */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:justify-end">
            
            {/* Status + Vote Quota */}
            <div className="flex flex-wrap items-center gap-2">
              {!userCountry ? (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/5 border-dashed hover:border-red-500/30 transition-colors"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[var(--neon-lime)]/10 border border-[var(--neon-lime)]/30"
                >
                  <div className="w-1.5 h-1.5 bg-[var(--neon-lime)] rounded-full shadow-[0_0_8px_var(--neon-lime)]" />
                  <span className="text-[10px] font-black text-[var(--neon-lime)] uppercase tracking-widest leading-none">
                    {t('nodeStable')}
                  </span>
                </motion.div>
              )}

              {voteQuota && (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/5"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${voteQuota.remaining > 0 ? 'bg-[var(--neon-lime)]' : 'bg-red-500'} shadow-[0_0_8px_currentColor]`} />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                      {t('remainingVotes')}: <span className="text-white">{voteQuota.remaining}</span> / <span className="text-zinc-600">{voteQuota.limit}</span>
                    </span>
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setShowAdModal(true)}
                    className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400 hover:text-amber-300 hover:scale-105 active:scale-95 transition-all overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    <Gift size={14} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">+3V</span>
                  </motion.button>
                </>
              )}
            </div>

            <div className="hidden lg:block w-px h-8 bg-white/10 flex-shrink-0" />

            {/* Mega Music CTA */}
            <Link
              href="/music"
              className="relative group flex items-center justify-center sm:justify-start gap-3 px-5 py-3 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 flex-shrink-0 shadow-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(55,197,97,0.15), rgba(55,197,97,0.05))',
                border: '1px solid rgba(55,197,97,0.6)',
                boxShadow: '0 0 25px rgba(55,197,97,0.2), inset 0 0 20px rgba(55,197,97,0.1)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#37C561]/0 via-[#37C561]/25 to-[#37C561]/0 opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer_1.5s_infinite] transition-opacity duration-400 pointer-events-none" />
              <div className="relative flex items-center justify-center shrink-0">
                <div className="absolute w-6 h-6 bg-[#37C561] rounded-full animate-ping opacity-40" />
                <Music2 size={20} className="relative text-[#37C561]" />
              </div>
              <div className="flex flex-col items-start pr-1">
                <span className="relative text-[11px] sm:text-xs font-black uppercase tracking-widest text-white leading-tight mb-0.5" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                  {t('musicChartBtn')}
                </span>
                <span className="relative text-[9px] font-bold tracking-[0.2em] text-[#37C561] leading-none opacity-90 uppercase">
                  FREE STREAMING
                </span>
              </div>
              <span className="relative ml-1 text-[9px] px-2 py-1 bg-[#37C561] text-black rounded-lg font-black tracking-widest leading-none shrink-0 shadow-[0_0_10px_rgba(55,197,97,0.5)]">
                LIVE
              </span>
            </Link>
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
                detailedVotes={countryArtistVotes}
                artists={artists}
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
        // ── Hot Issues from Supabase (state: hotIssues, loaded via getHotIssues server action) ──
        const featured = hotIssues.slice(0, 3);
        const past = hotIssues.slice(3);
        if (hotIssuesLoading) return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="glassmorphism rounded-3xl overflow-hidden border border-white/5 flex flex-col animate-pulse">
                <div className="w-full aspect-video bg-zinc-800/70" />
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="h-3 bg-zinc-800/70 rounded-full w-16" />
                  <div className="h-4 bg-zinc-800/70 rounded-lg w-full" />
                  <div className="h-4 bg-zinc-800/70 rounded-lg w-3/4" />
                  <div className="flex gap-2 mt-auto pt-8">
                    <div className="flex-1 h-10 bg-zinc-800/70 rounded-xl" />
                    <div className="flex-1 h-10 bg-zinc-800/70 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

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
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{t('live')}</span>
                </div>
              </div>
            </div>

            {/* ── Featured Cards (latest 3) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featured.map((issue) => {
                const headline = (issue.headline as Record<string,string>)[lang] ?? issue.headline['EN'];
                const lead = (issue.lead as Record<string,string>)[lang] ?? issue.lead['EN'];
                const category = (issue.category as Record<string,string>)[lang] ?? issue.category['EN'];
                const hasNoRealVideo = isPlaceholderVideo(issue.videoId);

                return (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative glassmorphism rounded-3xl overflow-hidden border border-white/5 flex flex-col hover:border-white/15 transition-all duration-500"
                    whileHover={{ boxShadow: `0 0 40px -10px ${issue.accent}40` }}
                  >
                    {/* Thumbnail area – click to watch details immediately */}
                    <div
                      onClick={() => setSelectedIssue(issue)}
                      className="relative w-full aspect-video overflow-hidden bg-zinc-900 block cursor-pointer"
                    >
                      <img
                        src={hasNoRealVideo
                          ? "/kpop-news-fallback.jpg"
                          : `https://img.youtube.com/vi/${issue.videoId}/hqdefault.jpg`
                        }
                        alt={headline}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85 group-hover:opacity-100"
                      />
                      
                      {/* Play button overlay – only show if it has a real video */}
                      {!hasNoRealVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center bg-black/60 border-2 backdrop-blur-sm group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                            style={{ borderColor: `${issue.accent}80` }}
                          >
                            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white ml-1" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                      )}

                      {/* Date top-left */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 pointer-events-none">
                        <span className="text-[9px] font-black text-zinc-300 tracking-widest">{issue.date}</span>
                      </div>
                      {/* Slot + Archive ID top-right */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none">
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-black/70 border border-white/10" style={{ color: issue.accent }}>{issue.slot}</span>

                      </div>
                      {/* NEW badge */}
                      {issue.isNew && (
                        <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse pointer-events-none">
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
                      <h3 className="text-sm font-black tracking-tight leading-snug line-clamp-2 overflow-hidden text-ellipsis">{headline}</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed flex-1 line-clamp-3 overflow-hidden text-ellipsis mb-auto font-medium">{lead}</p>
                      <div className="mt-auto pt-4 w-full">
                        <button 
                          onClick={() => setSelectedIssue(issue)}
                          className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-all text-white hover:border-white/20"
                        >
                          {t('viewDetails')}
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
                  onClick={() => { setShowPastIssues(!showPastIssues); setPastIssuePage(0); }}
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
                      {(() => {
                        const PAST_PAGE_SIZE = 4;
                        const pageCount = Math.ceil(past.length / PAST_PAGE_SIZE);
                        const paginated = past.slice(pastIssuePage * PAST_PAGE_SIZE, (pastIssuePage + 1) * PAST_PAGE_SIZE);
                        return (
                          <>
                            <div className="border border-white/8 rounded-3xl overflow-hidden bg-white/[0.02] backdrop-blur-sm divide-y divide-white/5">
                              {paginated.map((issue, idx) => {
                                const headline = (issue.headline as Record<string,string>)[lang] ?? issue.headline['EN'];
                                const lead = (issue.lead as Record<string,string>)[lang] ?? issue.lead['EN'];
                                const category = (issue.category as Record<string,string>)[lang] ?? issue.category['EN'];
                                const hasNoRealVideo = isPlaceholderVideo(issue.videoId);

                                return (
                                  <motion.div
                                    key={issue.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex flex-col sm:flex-row items-center gap-4 p-5 hover:bg-white/5 transition-colors group"
                                  >
                                    {/* Thumbnail small */}
                                    <div
                                      onClick={() => setSelectedIssue(issue)}
                                      className="relative w-full sm:w-40 shrink-0 aspect-video rounded-xl overflow-hidden bg-zinc-900 block cursor-pointer"
                                    >
                                      <img
                                        src={hasNoRealVideo
                                          ? "/kpop-news-fallback.jpg"
                                          : `https://img.youtube.com/vi/${issue.videoId}/mqdefault.jpg`
                                        }
                                        alt={headline}
                                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                      />
                                      {!hasNoRealVideo && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-8 h-8 rounded-full bg-black/60 border flex items-center justify-center" style={{ borderColor: `${issue.accent}60` }}>
                                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white ml-0.5" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" /></svg>
                                          </div>
                                        </div>
                                      )}
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
                                      <p className="text-[11px] text-zinc-400 w-full sm:w-auto line-clamp-2 overflow-hidden text-ellipsis leading-relaxed font-medium">{lead}</p>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-end">
                                      <button
                                        onClick={() => setSelectedIssue(issue)}
                                        className="text-[11px] font-black uppercase text-white hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-lg border border-white/10 hover:border-white/20 whitespace-nowrap"
                                      >
                                        {t('details')}
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>

                            {/* ── Pagination controls ── */}
                            {pageCount > 1 && (
                              <div className="flex items-center justify-center gap-3 pt-5">
                                {/* Prev */}
                                <button
                                  onClick={() => setPastIssuePage(p => Math.max(0, p - 1))}
                                  disabled={pastIssuePage === 0}
                                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-25 hover:bg-white/10 transition-all"
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-zinc-400" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
                                  </svg>
                                </button>

                                {/* Page dots */}
                                <div className="flex items-center gap-1.5">
                                  {Array.from({ length: pageCount }).map((_, i) => (
                                    <button
                                      key={i}
                                      onClick={() => setPastIssuePage(i)}
                                      className={`h-2 rounded-full transition-all duration-300 ${i === pastIssuePage ? 'bg-white w-5' : 'bg-zinc-600 hover:bg-zinc-400 w-2'}`}
                                    />
                                  ))}
                                </div>

                                {/* Next */}
                                <button
                                  onClick={() => setPastIssuePage(p => Math.min(pageCount - 1, p + 1))}
                                  disabled={pastIssuePage === pageCount - 1}
                                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-25 hover:bg-white/10 transition-all"
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-zinc-400" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                  </svg>
                                </button>

                                {/* Page counter */}
                                <span className="text-[10px] font-mono text-zinc-500 ml-1 tabular-nums">{pastIssuePage + 1} / {pageCount}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
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
                            ? <img src={a.image_url} alt={getLangName(a.name, lang)} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
                            : <span className="text-5xl font-black text-zinc-700">{getLangName(a.name, lang)[0]}</span>
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
                          <h3 className="text-3xl font-black tracking-tighter truncate max-w-[200px] group-hover/title:text-white">{getLangName(a.name, lang)}</h3>
                          <div className="h-0.5 w-0 group-hover/title:w-full bg-current mx-auto transition-all duration-300" style={{ color }} />
                        </Link>

                        <div className="mt-4 flex items-center justify-center gap-3">
                          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('currentPhase')}</span>
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
                    <div className="relative mt-8 w-full">
                      {birthdayArtistIds.has(a.id) && !activeVotes[a.id] && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-neon-magenta rounded-md text-[8px] font-black text-white uppercase tracking-widest z-20 shadow-lg shadow-neon-magenta/50 flex items-center gap-1">
                          <Cake size={10} />
                          <span>X2 VOLTAGE</span>
                        </div>
                      )}
                      <button
                        id={`vote-btn-${a.id}`}
                        onClick={() => handleVote(a.id, a.total_votes)}
                        disabled={!!activeVotes[a.id]}
                        className={`w-full py-4 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2.5 transition-all relative z-10 uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-[0.98] ${isBounc ? 'vote-bounce' : ''} ${!userCountry ? 'opacity-50' : ''} ${activeVotes[a.id] === 'success' ? 'bg-emerald-500 text-white' :
                            activeVotes[a.id] === 'loading' ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-none' : ''
                          }`}
                        style={{
                          background: activeVotes[a.id] ? undefined : color,
                          color: activeVotes[a.id] ? undefined : '#000',
                          boxShadow: activeVotes[a.id] === 'success' 
                            ? '0 0 20px rgba(16,185,129,0.4)' 
                            : (userCountry && !activeVotes[a.id] ? `0 10px 40px -10px ${color}80` : 'none'),
                        }}
                      >
                        {activeVotes[a.id] === 'success' ? (
                          <><CheckCircle2 size={16} /> <span>{t('voted')}</span></>
                        ) : activeVotes[a.id] === 'loading' ? (
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><Vote size={16} /> <span>{t('transmitVote')}</span></>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
        {/* ── Upcoming Artists (Others) ── */}
        <section id="upcoming-artists" className="space-y-6">
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
                    className="glassmorphism p-5 rounded-[2rem] flex items-center justify-between group border border-white/5 hover:border-[var(--neon-lime)]/30 transition-all overflow-hidden"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="w-6 font-mono text-zinc-600 font-black italic text-sm shrink-0">
                        #{index + 4}
                      </span>
                      <Link href={`/artist/${a.id}`} className="flex items-center gap-3 group/link min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center group-hover/link:border-[var(--neon-lime)]/40 transition-colors shrink-0">
                          {a.image_url
                            ? <img src={a.image_url} alt={getLangName(a.name, lang)} className="w-full h-full object-cover" />
                            : <span className="font-black text-xl text-zinc-600">{getLangName(a.name, lang)[0]}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-base tracking-tight leading-none group-hover/link:text-[var(--neon-lime)] transition-colors truncate">
                            {getLangName(a.name, lang)}
                          </h4>
                          <div className="mt-2 space-y-1 text-zinc-500">
                             <span className="text-[10px] font-mono font-black">{(a.total_votes || 0).toLocaleString()} VOLTAGE</span>
                          </div>
                        </div>
                      </Link>
                    </div>

                    <div className="flex items-center gap-3">
                      {birthdayArtistIds.has(a.id) && (
                        <div className="bg-neon-magenta/20 p-2 rounded-lg text-neon-magenta border border-neon-magenta/30">
                          <Cake size={14} />
                        </div>
                      )}
                      <button
                        onClick={() => handleVote(a.id, a.total_votes)}
                        disabled={!!activeVotes[a.id]}
                        className={`w-28 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeVotes[a.id] === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : activeVotes[a.id] === 'loading'
                            ? 'bg-zinc-800 text-zinc-600'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        {activeVotes[a.id] === 'success' ? <CheckCircle2 size={12} /> : <Vote size={12} />}
                        {activeVotes[a.id] === 'success' ? t('voted') : t('voteShort')}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {others.length > 6 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                className="px-8 py-3 rounded-full border border-white/5 hover:border-white/20 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white/10"
              >
                {showAllUpcoming ? t('showLess') : t('showMore')}
              </button>
            </div>
          )}
        </section>

        {/* ── Birthday Stars ── Moved below Others ── */}
        <BirthdayPromotion lang={lang} />

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
                  {['ILLIT', 'BABYMONSTER', 'UNIS']
                    .map(name => ({
                      name,
                      artist: artists.find(a => getLangName(a.name, 'EN').toUpperCase() === name)
                    }))
                    .sort((a, b) => (b.artist?.total_votes || 0) - (a.artist?.total_votes || 0))
                    .map(({ name, artist }, i) => {
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
                              <h4 className="font-black text-xl tracking-tighter truncate group-hover/artist:text-[var(--neon-lime)] transition-colors">{getLangName(artist.name, lang)}</h4>
                              <span className="text-[10px] font-black text-zinc-600 uppercase">VOLTAGE: {votes.toLocaleString()}</span>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-4 opacity-50">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center font-black text-xl text-zinc-700">{name[0]}</div>
                            <div className="min-w-0">
                              <h4 className="font-black text-xl tracking-tighter truncate">{getLangName(name, lang)}</h4>
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
                      {/* Past Battle: 2026. 05 */}
                      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 hover:bg-white/5 transition-colors group">
                        <div className="flex flex-col items-center sm:items-start shrink-0 min-w-[120px]">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black text-[#A855F7] border border-[#A855F7]/30 bg-[#A855F7]/10 mb-2">2026. 05</span>
                          <span className="text-sm font-black text-white">{lang === 'KO' ? '5세대 글로벌 루키' : lang === 'ES' ? 'Novatos Globales 5.ª Gen' : '5th Gen Global Rookie'}</span>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2 sm:gap-4 items-center justify-center sm:justify-start">
                          <span className="text-[var(--neon-lime)] font-black tracking-widest text-sm flex items-center gap-1">
                            <Trophy size={14} className="text-yellow-400" /> NCT WISH
                          </span>
                          <span className="text-zinc-700 text-xs font-black">VS</span>
                          <span className="text-zinc-500 font-bold text-xs opacity-70 line-through">NEXZ</span>
                          <span className="text-zinc-700 text-xs font-black">VS</span>
                          <span className="text-zinc-500 font-bold text-xs opacity-70 line-through">ALL(H)OURS</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">{t('battleWinner')}: NCT WISH</span>
                        </div>
                      </div>

                      {/* Past Battle: 2026. 04 */}
                      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 hover:bg-white/5 transition-colors group">
                        <div className="flex flex-col items-center sm:items-start shrink-0 min-w-[120px]">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black text-[#A855F7] border border-[#A855F7]/30 bg-[#A855F7]/10 mb-2">2026. 04</span>
                          <span className="text-sm font-black text-white">{lang === 'KO' ? '5세대 라이징 팝콘' : lang === 'ES' ? 'Popcorn Emergente 5.ª Gen' : '5th Gen Rising Popcorn'}</span>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2 sm:gap-4 items-center justify-center sm:justify-start">
                          <span className="text-[var(--neon-lime)] font-black tracking-widest text-sm flex items-center gap-1">
                            <Trophy size={14} className="text-yellow-400" /> RIIZE
                          </span>
                          <span className="text-zinc-700 text-xs font-black">VS</span>
                          <span className="text-zinc-500 font-bold text-xs opacity-70 line-through">BOYNEXTDOOR</span>
                          <span className="text-zinc-700 text-xs font-black">VS</span>
                          <span className="text-zinc-500 font-bold text-xs opacity-70 line-through">TWS</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">{t('battleWinner')}: RIIZE</span>
                        </div>
                      </div>

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
            {t('privacyPolicy')}
          </Link>
          <Link href="/terms" className="hover:text-[var(--neon-lime)] transition-colors">
            {t('termsOfService')}
          </Link>
        </div>

        {/* 3. 저작권 표시 */}
        <div className="flex flex-col items-center gap-1.5 opacity-50">
          <p className="text-zinc-600 text-[10px] font-black tracking-[0.3em] uppercase">
            © 2026 STANDOM GLOBAL NETWORK
          </p>
          <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest bg-white/5 border border-white/5 px-2 py-0.5 rounded">
            Build: 2026-05-19 11:47 (Ver 1.0.3-Web-9)
          </span>
        </div>
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
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-black border tracking-widest uppercase bg-white/5 shrink-0" style={{ color: selectedIssue.accent, borderColor: `${selectedIssue.accent}50` }}>
                    {selectedIssue.slot}
                  </span>
                  <span className="text-zinc-500 text-xs font-mono truncate">{selectedIssue.id}</span>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all shrink-0"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto custom-scrollbar flex-1">
                {(() => {
                  const isDetailPlaceholder = isPlaceholderVideo(selectedIssue.videoId);
                  return (
                    <>
                      <div className="w-full aspect-video bg-black relative overflow-hidden">
                        {isDetailPlaceholder ? (
                          <img
                            src="/kpop-news-fallback.jpg"
                            alt="news cover"
                            className="w-full h-full object-cover opacity-90"
                          />
                        ) : issueVideoActive ? (
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${selectedIssue.videoId}?autoplay=1&enablejsapi=1&origin=https://standom.online`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          ></iframe>
                        ) : (
                          <button
                            onClick={() => setIssueVideoActive(true)}
                            className="relative w-full h-full group cursor-pointer block"
                          >
                            <img
                              src={`https://img.youtube.com/vi/${selectedIssue.videoId}/maxresdefault.jpg`}
                              onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${selectedIssue.videoId}/hqdefault.jpg`; }}
                              alt="thumbnail"
                              className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-300"
                            />
                            {/* 클릭하여 재생 오버레이 */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                              <div className="w-20 h-20 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl shadow-red-600/40 group-hover:scale-110 transition-transform duration-200 border-2 border-white/20">
                                <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white ml-1" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" /></svg>
                              </div>
                              <span className="text-white text-xs font-black uppercase tracking-widest bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                                클릭하여 재생
                              </span>
                            </div>
                          </button>
                        )}
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
                          {selectedIssue.body ? ((selectedIssue.body as Record<string,string>)[lang] ?? selectedIssue.body['EN']) : t('loadingArticle')}
                        </div>

                        <div className="flex flex-wrap gap-3 pt-4 items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {selectedIssue.tags.map((tag: string) => (
                              <span key={tag} className="text-xs text-zinc-500 font-bold tracking-widest px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
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
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/96"
          >
            {/* Floating Top Close Button to bypass bottom-aligned overlapping toast blocker */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHologramCard(null);
              }}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-all z-[210] shadow-2xl active:scale-95 cursor-pointer"
              title="Close Modal"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Hologram Card */}
            <motion.div
              ref={hologramCardRef}
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
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
                {/* Artist Background (Simplified for reliable capture without white flashes) */}
                <div className="absolute inset-0 opacity-20 scale-110">
                  <img 
                    src={showHologramCard.artist.image_url || ''} 
                    alt="" 
                    className="w-full h-full object-cover filter blur-lg"
                    crossOrigin="anonymous"
                  />
                </div>
                
                <div className="relative z-10 w-full h-1/2 p-4 pt-8 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/50 shadow-2xl mb-4 bg-black">
                    <img 
                      src={showHologramCard.artist.image_url || ''} 
                      alt={getLangName(showHologramCard.artist.name, lang)} 
                      className="w-full h-full object-cover" 
                      crossOrigin="anonymous"
                    />
                  </div>
                  <h3 className="text-2xl font-black tracking-tighter text-white drop-shadow-md text-center leading-tight">
                    {getLangName(showHologramCard.artist.name, lang)}
                  </h3>
                  <div className="mt-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
                    <span className="text-[10px] font-black tracking-widest text-[#37C561] uppercase whitespace-nowrap" style={{ color: '#37C561' }}>{t('hologramRank')} #{showHologramCard.rank}</span>
                  </div>
                </div>

                <div className="relative z-10 w-full h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center justify-end p-6 text-center">
                  <p className="text-xs font-medium text-[#d4d4d8] leading-relaxed mb-4">
                    {t('fueledMsg')}
                  </p>
                  <img src="/stan_dom_logo_transparent2.png" className="h-4 opacity-50" alt="LOGO" />
                </div>

                {/* Shimmer Effect (Disabled during capture for stability) */}
                {!isCapturing && (
                  <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[20px]">
                    <div className="absolute top-0 left-[-150%] w-[50%] h-[200%] rotate-[30deg] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-hologram" />
                  </div>
                )}
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
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(t('tweetTemplate').replace('{rank}', String(showHologramCard.rank)).replace('{artist}', getLangName(showHologramCard.artist.name, lang)))}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://standom.online')}&hashtags=${encodeURIComponent(`${getLangName(showHologramCard.artist.name, 'EN').replace(/\s+/g, '')},KPOP_VOTE,STANDOM`)}`}
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

      {/* ── Hidden static card for capture (Inside viewport to ensure painting in WebView) ── */}
      {showHologramCard && (
        <div
          ref={staticHologramCardRef}
          style={{
            position: 'fixed',
            left: '0px',
            top: '0px',
            width: '320px',
            height: '480px',
            zIndex: 10,
            pointerEvents: 'none',
          }}
          className="rounded-[24px] overflow-hidden p-1 bg-gradient-to-br from-white/40 via-white/10 to-black/80"
        >
          {/* Card Inner */}
          <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-[#09090b] flex flex-col items-center">
            {/* Background */}
            <div className="absolute inset-0 opacity-20 scale-110">
              <img 
                src={showHologramCard.artist.image_url || ''} 
                alt="" 
                className="w-full h-full object-cover filter blur-lg"
                crossOrigin="anonymous"
              />
            </div>
            
            <div className="relative z-10 w-full h-1/2 p-4 pt-8 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/50 shadow-2xl mb-4 bg-black">
                <img 
                  src={showHologramCard.artist.image_url || ''} 
                  alt={getLangName(showHologramCard.artist.name, lang)} 
                  className="w-full h-full object-cover" 
                  crossOrigin="anonymous"
                />
              </div>
              <h3 className="text-2xl font-black tracking-tighter text-white drop-shadow-md text-center leading-tight">
                {getLangName(showHologramCard.artist.name, lang)}
              </h3>
              <div className="mt-2 px-3 py-1 rounded-full bg-white/10 border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
                <span className="text-[10px] font-black tracking-widest text-[#37C561] uppercase whitespace-nowrap" style={{ color: '#37C561' }}>{t('hologramRank')} #{showHologramCard.rank}</span>
              </div>
            </div>

            <div className="relative z-10 w-full h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center justify-end p-6 text-center pb-8">
              <p className="text-xs font-medium text-[#d4d4d8] leading-relaxed mb-4">
                {t('fueledMsg')}
              </p>
              <img src="/stan_dom_logo_transparent2.png" className="h-4 opacity-50 mx-auto" alt="LOGO" />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showInstaGuide && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/98"
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
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/98"
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
                  className="w-full h-full object-contain pointer-events-auto select-auto"
                  style={{ WebkitUserSelect: 'auto', userSelect: 'auto', WebkitTouchCallout: 'default' } as any}
                  onContextMenu={(e) => e.stopPropagation()} // Allow context menu
                />
              </div>

              {/* Direct download button - uses native bridge in app, <a download> on web */}
              <button
                onClick={() => {
                  if (!generatedImage) return;
                  const win = window as any;
                  // In app environment, send the data URL to the native side for gallery saving
                  if (win.ReactNativeWebView) {
                    win.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'DOWNLOAD_IMAGE',
                      dataUrl: generatedImage,
                    }));
                    setToast({ isVisible: true, message: '📲 Saving...', subMessage: 'Saving to gallery via app' });
                  } else {
                    // Web fallback: create a download link
                    const link = document.createElement('a');
                    link.download = `standom_card_${Date.now()}.png`;
                    link.href = generatedImage;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setToast({ isVisible: true, message: '✅ Saved!', subMessage: 'Card saved to your device' });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-3 rounded-xl bg-[var(--neon-lime)] text-black font-black text-[10px] tracking-widest uppercase hover:scale-105 transition-all shadow-xl shadow-[var(--neon-lime)]/20"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                SAVE TO DEVICE
              </button>

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

      {/* ── Exit Notification ── */}
      <ExitNotification lang={lang} />

      {showAdModal && (
        <RewardedAdModal
          isOpen={showAdModal}
          onClose={() => setShowAdModal(false)}
          onSuccess={refreshQuota}
          lang={lang}
        />
      )}


    </main>
  );
}
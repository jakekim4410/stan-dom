'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { addComment } from '@/actions/comment';
import { toggleLikeComment } from '@/actions/likeComment';
import { getRemainingVotes } from '@/actions/getRemainingVotes';
import {
  ArrowLeft,
  Share2,
  Edit2,
  Flag,
  Music,
  Play,
  Pause,
  Globe,
  MessageCircle,
  Send,
  ShieldAlert,
  Mail,
  ChevronLeft,
  ChevronRight,
  Heart,
  Crown,
  Database,
  Terminal,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { COUNTRY_DATA } from '@/constants/countryData';
import { getArtistTopTrack } from '@/actions/getArtistTopTrack';
import { reportArtistData } from '@/actions/reportArtist';
import Toast from '@/components/Toast';
import PhotoEditModal from '@/components/PhotoEditModal';
import ReportModal from '@/components/ReportModal';
import InquiryModal from '@/components/InquiryModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Language, getT } from '@/constants/i18n';
import { use } from 'react';

interface Artist {
  id: string;
  name: string;
  image_url: string | null;
  total_votes: number;
}

interface Comment {
  id: string;
  content: string;
  country_code: string | null;
  display_name: string | null;
  created_at: string;
  likes_count: number;
  is_liked?: boolean;
}

interface CountryStat {
  code: string;
  name: string;
  flag: string;
  count: number;
}

const COUNTRY_FLAGS: Record<string, string> = Object.fromEntries(
  COUNTRY_DATA.map(c => [c.code, c.flag])
);
const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  COUNTRY_DATA.map(c => [c.code, c.name])
);

export default function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const router = useRouter();
  const resolvedParams = use(params);
  const artistId = resolvedParams.id;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStat[]>([]);
  const [totalCountryVotes, setTotalCountryVotes] = useState(0);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ isVisible: false, message: '', subMessage: '' });

  const [topTrack, setTopTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voteQuota, setVoteQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [user, setUser] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const [activeView, setActiveView] = useState<'stats' | 'cheers'>('stats');
  const [lang, setLang] = useState<Language>('EN');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const COMMENTS_PER_PAGE = 10;

  const t = getT(lang);

  // ✅ 언어 초기화 — localStorage 우선, 없으면 브라우저 언어 감지
  useEffect(() => {
    const saved = localStorage.getItem('stan_lang') as Language | null;
    if (saved && ['EN', 'KO', 'ES'].includes(saved)) {
      setLang(saved);
    } else {
      const browserLang = navigator.language?.startsWith('ko') ? 'KO' : (navigator.language?.startsWith('es') ? 'ES' : 'EN');
      setLang(browserLang);
    }

    fetchAll();

    const artistChannel = supabase
      .channel('artist_detail_votes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'artists', filter: `id=eq.${artistId}` },
        payload => setArtist(payload.new as Artist))
      .subscribe();

    const commentChannel = supabase
      .channel('artist_comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `artist_id=eq.${artistId}` },
        payload => setComments(prev => [payload.new as Comment, ...prev].slice(0, 50)))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments', filter: `artist_id=eq.${artistId}` },
        payload => {
          setComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, likes_count: payload.new.likes_count } : c));
        })
      .subscribe();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(artistChannel);
      supabase.removeChannel(commentChannel);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [artistId]);

  const fetchAll = async () => {
    setLoading(true);
    const [artistRes, commentsRes, votesRes] = await Promise.all([
      supabase.from('artists').select('*').eq('id', artistId).single(),
      supabase.from('comments').select('*').eq('artist_id', artistId).order('created_at', { ascending: false }).limit(50),
      supabase.from('votes').select('country_code').eq('artist_id', artistId),
    ]);

    if (artistRes.data) {
      setArtist(artistRes.data);
      const trackRes = await getArtistTopTrack(artistRes.data.name);
      if (trackRes.success) setTopTrack(trackRes.track);
    }

    if (commentsRes.data) {
      const fetchedComments = commentsRes.data as Comment[];
      // If user logged in, check which they liked
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userLikes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', session.user.id)
          .in('comment_id', fetchedComments.map(c => c.id));
        
        const likedIds = new Set(userLikes?.map(ul => ul.comment_id) || []);
        setComments(fetchedComments.map(c => ({ ...c, is_liked: likedIds.has(c.id) })));
      } else {
        setComments(fetchedComments);
      }
    }

    if (votesRes.data) {
      const stats: Record<string, number> = {};
      const votes = votesRes.data;
      const len = votes.length;

      for (let i = 0; i < len; i++) {
        const v = votes[i];
        const c = v.country_code || 'UN';
        stats[c] = (stats[c] || 0) + 1;
      }

      setTotalCountryVotes(len);
      setCountryStats(
        Object.entries(stats)
          .sort(([, a], [, b]) => b - a)
          .map(([code, count]) => ({
            code,
            count,
            name: COUNTRY_NAMES[code] ?? code,
            flag: COUNTRY_FLAGS[code] ?? '🌐',
          }))
      );
    }
    setLoading(false);
    refreshQuota();
  };

  const refreshQuota = async () => {
    const res = await getRemainingVotes();
    if (res.success) {
      setVoteQuota({ remaining: res.remaining!, limit: res.limit! });
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !topTrack?.preview) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setToast({
      isVisible: true,
      message: t('linkCopied'),
      subMessage: t('syncSuccess')
    });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;

    if (!user) {
      setToast({
        isVisible: true,
        message: t('authRequired'),
        subMessage: t('loginToTransmit'),
      });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
      return;
    }

    setSending(true);
    const result = await addComment(artistId, commentText);

    if (result.success) {
      setCommentText('');
    } else if (result.error === 'COOLDOWN_ACTIVE') {
      const waitTime = new Date(result.nextAllowedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setToast({
        isVisible: true,
        message: 'COMMUNICATION LIMIT REACHED',
        subMessage: `TRANSMISSION LOCKED UNTIL ${waitTime}`,
      });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
    } else {
      setToast({
        isVisible: true,
        message: t('transmissionFailed'),
        subMessage: t('networkError'),
      });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
    }
    setSending(false);
  };

  // ✅ 언어 선택 — localStorage에 저장
  const handleSelectLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('stan_lang', newLang);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      setToast({ isVisible: true, message: 'AUTHENTICATION_REQUIRED', subMessage: 'LOGIN TO LIKE TRANSMISSIONS' });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
      return;
    }

    // Optimistic UI
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const is_liked = !c.is_liked;
        return { ...c, is_liked, likes_count: c.likes_count + (is_liked ? 1 : -1) };
      }
      return c;
    }));

    const result = await toggleLikeComment(commentId);
    if (!result.success) {
      // Revert if failed
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          const is_liked = !c.is_liked;
          return { ...c, is_liked, likes_count: c.likes_count + (is_liked ? 1 : -1) };
        }
        return c;
      }));
    }
  };

  const sortedComments = useMemo(() => {
    if (comments.length === 0) return [];
    
    // 1. Find the top liked comment (min 1 like)
    let topComment: Comment | null = null;
    let maxLikes = 0;
    
    for (const c of comments) {
      if (c.likes_count > maxLikes) {
        maxLikes = c.likes_count;
        topComment = c;
      }
    }
    
    if (!topComment) return comments;
    
    // 2. Put top comment first, then others by date
    const others = comments.filter(c => c.id !== topComment!.id);
    return [topComment, ...others];
  }, [comments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,243,255,0.4)]" />
          <p className="font-black text-[10px] tracking-[0.5em] text-neon-cyan animate-pulse">SYNCHRONIZING CORE...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
        <p className="text-zinc-500 font-black text-xl">NODE NOT FOUND</p>
        <Link href="/" className="px-6 py-3 bg-neon-cyan text-black rounded-full font-black text-sm">RETURN TO GRID</Link>
      </div>
    );
  }

  const maxBarCount = countryStats[0]?.count || 1;

  return (
    <main className="flex-1 bg-[#020202] text-white selection:bg-[#37C561]/30 overflow-x-hidden relative flex flex-col">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-neon-cyan/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-neon-magenta/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4 backdrop-blur-md border-b border-zinc-500/10 bg-black/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="group flex items-center gap-2 text-zinc-400 hover:text-neon-cyan transition-all"
          >
            <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-neon-cyan/50 group-hover:bg-neon-cyan/5">
              <ArrowLeft size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{t('returnToRankings')}</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-[10px] font-black tracking-widest uppercase text-neon-cyan">{t('systemOnline')}</span>
            </div>
            <LanguageSwitcher lang={lang} onSelect={handleSelectLang} />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-6 md:gap-12 items-center">
            {/* Left: Info & Audio (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-8">
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-neon-cyan font-black text-[10px] tracking-[0.4em] uppercase mb-4"
                >
                  {t('artistSync')}
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-5xl md:text-8xl font-black tracking-tighter leading-none mb-8"
                >
                  {artist.name}
                </motion.h1>

                <div className="flex flex-row items-center justify-between sm:justify-start gap-4 sm:gap-10 py-8 border-y border-white/5 w-full">
                  <div className="flex flex-col min-w-0 flex-1 sm:flex-none">
                    <span className="text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1 truncate">{t('globalPower')}</span>
                    <span className="text-3xl sm:text-4xl font-black text-neon-cyan drop-shadow-[0_0_15px_rgba(55,197,97,0.3)]">
                      {(artist.total_votes || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 sm:flex-none">
                    <span className="text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1 truncate">{t('coverage')}</span>
                    <span className="text-3xl sm:text-4xl font-black text-white flex items-baseline gap-1">
                      {countryStats.length}<span className="text-xs sm:text-sm not-italic opacity-50 font-bold uppercase tracking-tighter">{t('regions')}</span>
                    </span>
                  </div>
                  <button
                    onClick={handleShare}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all group/share flex-shrink-0"
                  >
                    <Share2 size={18} className="text-neon-cyan group-hover/share:scale-110 transition-transform" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1 hidden sm:block">{t('shareSync')}</span>
                  </button>
                </div>
              </div>

              {/* Audio Preview Card (Restore) */}
              {topTrack ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-panel p-6 border-l-4 border-l-white/10 group overflow-hidden"
                >
                  <div className="scanner-line opacity-10 group-hover:opacity-20 transition-opacity" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative flex-shrink-0 group-hover:border-neon-magenta/50 transition-colors">
                      <img src={topTrack.albumCover} alt="Album Cover" className="w-full h-full object-cover" />
                      <button
                        onClick={togglePlayback}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/20 transition-all backdrop-blur-[2px]"
                      >
                        {isPlaying ? <Pause fill="white" size={28} /> : <Play fill="white" size={28} className="translate-x-0.5" />}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-neon-magenta tracking-widest uppercase mb-1 flex items-center gap-2">
                        <Music size={10} className="animate-pulse" /> {t('nowScanning')}
                      </p>
                      <h3 className="text-xl font-black truncate mb-1 italic tracking-tight">{topTrack.title}</h3>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest opacity-60">Representative Track Preview</p>
                    </div>
                  </div>
                  <audio ref={audioRef} src={topTrack.preview} onEnded={() => setIsPlaying(false)} className="hidden" />
                </motion.div>
              ) : (
                <div className="glass-panel p-6 border-l-4 border-l-zinc-800 flex items-center gap-6 opacity-60">
                  <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center flex-shrink-0">
                    <Music size={24} className="text-zinc-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-zinc-600 tracking-widest uppercase mb-1">{t('audioUnavailable')}</p>
                    <p className="text-sm font-bold text-zinc-500 uppercase tracking-tighter">Licensed preview not available for this node</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Artist Image Visual (lg:col-span-4 - Restore) */}
            <div className="lg:col-span-4 relative">
              <div className="absolute -inset-10 bg-neon-cyan/10 blur-[100px] rounded-full animate-pulse-slow pointer-events-none" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="relative aspect-[4/5] w-full max-w-[340px] mx-auto rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-[0_0_60px_rgba(0,243,255,0.15)] group/card"
              >
                <div className="scanner-line group-hover/card:bg-neon-lime transition-colors" />
                {artist.image_url ? (
                  <img 
                    src={artist.image_url} 
                    alt={artist.name} 
                    className="w-full h-full object-cover grayscale-[30%] group-hover/card:grayscale-0 transition-all duration-1000 group-hover/card:scale-110" 
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-9xl font-black text-zinc-800 uppercase leading-none">
                    {artist.name[0]}
                  </div>
                )}
              </motion.div>

              <div className="mt-8 flex justify-center gap-4 relative z-10">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-neon-lime/50 hover:bg-neon-lime/5 transition-all group/edit"
                >
                  <Edit2 size={12} className="text-zinc-500 group-hover/edit:text-neon-lime transition-colors" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover/edit:text-neon-lime transition-colors whitespace-nowrap">{t('curatePhoto')}</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 transition-all group/flag"
                >
                  <Flag size={12} className="text-zinc-500 group-hover/flag:text-red-500 transition-colors" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover/flag:text-red-500 transition-colors whitespace-nowrap">{t('reportNode')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PhotoEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lang={lang}
        artistId={artistId}
        artistName={artist.name}
        currentImageUrl={artist.image_url}
        onSuccess={(newUrl) => {
          setArtist(prev => prev ? { ...prev, image_url: newUrl } : null);
          setToast({ isVisible: true, message: 'PHOTO_SYNC_SUCCESS', subMessage: 'NEW_METADATA_ESTABLISHED' });
          setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
        }}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        lang={lang}
        artistId={artistId}
        artistName={artist.name}
        onSuccess={() => {
          setToast({ isVisible: true, message: 'REPORT_SUBMITTED', subMessage: 'MODERATION_PENDING' });
          setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
        }}
      />

      <InquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        lang={lang}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-6 md:gap-12 pb-20">
        {/* Analytics (Left 5) */}
        <section className="lg:col-span-5 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-black italic flex items-center gap-3 min-w-0">
              <Globe className="text-neon-cyan flex-shrink-0" size={24} />
              <span className="truncate uppercase tracking-tighter">{t('fandomDensity')}</span>
            </h2>
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 self-start sm:self-auto">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{t('realTimeTrends')}</span>
            </div>
          </div>

          <div className="glass-panel p-6 sm:p-8 min-h-[500px] relative overflow-hidden border border-white/5">
            <div className="scanner-line opacity-5" />
            {countryStats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-4 py-20 translate-y-20">
                <Database size={48} className="opacity-20" />
                <p className="font-black text-sm uppercase tracking-widest text-center">{t('noFandomPatterns')}</p>
                <Link href="/" className="text-neon-cyan text-[10px] font-black hover:underline uppercase tracking-tighter">{t('voteNowToMap')}</Link>
              </div>
            ) : (
              <div className="space-y-8 relative z-10">
                {countryStats.slice(0, 10).map((s, i) => (
                  <motion.div
                    key={s.code}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="space-y-3"
                  >
                    <div className="flex justify-between items-end mb-1 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-zinc-600 font-black italic text-sm flex-shrink-0">{(i + 1).toString().padStart(2, '0')}</span>
                        <span className="text-xs w-6 h-6 flex items-center justify-center bg-zinc-900 rounded border border-white/5 flex-shrink-0">
                          {COUNTRY_FLAGS[s.code] ?? '🌐'}
                        </span>
                        <span className="text-sm font-black uppercase text-zinc-300 tracking-tight truncate">{COUNTRY_NAMES[s.code] ?? s.code}</span>
                      </div>
                      <span className="text-sm font-black italic text-neon-cyan flex-shrink-0">
                        {s.count.toLocaleString()} <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter ml-1">{t('hits')}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-950 rounded-full overflow-hidden p-[1px] border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.count / maxBarCount) * 100}%` }}
                        transition={{ duration: 1.5, ease: 'circOut', delay: i * 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-neon-cyan/40 to-neon-cyan relative"
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] w-1/3 animate-[scan-horizontal_3s_infinite]" />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Cheering Board (Right 7) */}
        <section className="lg:col-span-7 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-black italic flex items-center gap-3 min-w-0">
              <MessageCircle className="text-neon-magenta flex-shrink-0" size={24} />
              <span className="truncate uppercase tracking-tighter">{t('liveHub')}</span>
            </h2>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full border border-black bg-zinc-800 flex items-center justify-center text-[8px] font-black">U</div>
                ))}
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{comments.length} SYNCED</span>
            </div>
          </div>

          <div className="glass-panel p-0 flex flex-col h-[700px] border-neon-magenta/10 overflow-hidden relative">
            <div className="scanner-line opacity-5 bg-neon-magenta" />
            
            {/* Comment Input (Top Fixed) */}
            <div className="p-6 bg-black/40 border-b border-white/5 relative z-20">
              <div className="space-y-4">
                {user ? (
                  <div className="flex items-center gap-4 border-b border-white/5 pb-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-zinc-900 flex-shrink-0">
                      {user.user_metadata?.avatar_url
                        ? <img src={user.user_metadata.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs font-black">{user.user_metadata?.full_name?.[0] || 'U'}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-white uppercase tracking-widest truncate">
                          {user.user_metadata?.full_name || user.user_metadata?.custom_id || 'Global Fan'}
                        </p>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neon-cyan/10 border border-neon-cyan/20 flex-shrink-0">
                          <Check size={8} className="text-neon-cyan" />
                          <span className="text-[8px] font-black text-neon-cyan uppercase tracking-tighter">{t('verifiedSync')}</span>
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1.5 mt-0.5 truncate">
                        {user.user_metadata?.country_code ? (
                          <>
                            <span className="w-4 h-3 flex items-center justify-center bg-zinc-900 rounded-sm overflow-hidden text-[10px] flex-shrink-0">
                              {COUNTRY_FLAGS[user.user_metadata.country_code] ?? '🌐'}
                            </span> 
                            <span className="truncate">{COUNTRY_NAMES[user.user_metadata.country_code] ?? user.user_metadata.country_code}</span>
                          </>
                        ) : (
                          <span className="opacity-50 italic">NODE_UNSYNC</span>
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 gap-3 bg-neon-magenta/5 border border-neon-magenta/20 rounded-2xl mb-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-neon-magenta uppercase tracking-widest">
                      <ShieldAlert size={14} className="animate-pulse" />
                      Unauthorized Access
                    </div>
                    <Link
                      href="/login"
                      className="px-8 py-2.5 bg-neon-magenta text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-neon-magenta/20"
                    >
                      Login to participation Hub
                    </Link>
                  </div>
                )}

                <div className="relative group">
                  <textarea
                    placeholder={user ? t('commentPlaceholder') : t('loginRequiredPlaceholder')}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value.slice(0, 140))}
                    maxLength={140}
                    rows={2}
                    disabled={!user}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && user) { e.preventDefault(); handleSendComment(); } }}
                    className="w-full bg-zinc-900/50 rounded-xl p-4 text-sm font-bold border border-white/5 outline-none focus:border-neon-magenta/50 focus:bg-zinc-900/80 transition-all placeholder:text-zinc-700 resize-none font-chakra"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-4">
                    <span className="text-[10px] font-bold text-zinc-700">{commentText.length}/140</span>
                    <button
                      onClick={handleSendComment}
                      disabled={!commentText.trim() || sending || !user}
                      className="w-10 h-10 rounded-xl bg-neon-magenta text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-neon-magenta/20"
                    >
                      <Send size={18} className={sending ? 'animate-pulse' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Feed Scroll */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar relative">
              <AnimatePresence initial={false} mode="popLayout">
                {comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-800 gap-4 py-20 grayscale opacity-40">
                    <div className="w-16 h-16 rounded-full border-4 border-dashed border-zinc-900 flex items-center justify-center">
                      <Terminal size={32} />
                    </div>
                    <p className="font-black text-xs uppercase tracking-[0.2em] italic">{t('awaitingFirstTransmission')}</p>
                  </div>
                ) : (
                  <>
                    {sortedComments
                      .slice((currentPage - 1) * COMMENTS_PER_PAGE, currentPage * COMMENTS_PER_PAGE)
                      .map((c, idx) => {
                        const isPinned = currentPage === 1 && idx === 0 && c.likes_count > 0;
                        return (
                          <motion.div
                            layout
                            key={c.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative group"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-lg flex-shrink-0 group-hover:border-neon-magenta/50 transition-colors shadow-lg">
                                {c.country_code ? (COUNTRY_FLAGS[c.country_code] ?? '🌐') : '💜'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1.5">
                                  <span className="text-xs font-black uppercase text-zinc-300 group-hover:text-neon-magenta transition-colors">
                                    {c.display_name || 'Anonymous Fan'}
                                  </span>
                                  <span className="text-[10px] font-bold text-zinc-700 italic">
                                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isPinned && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/20 text-[8px] font-black text-neon-cyan uppercase">
                                      <Crown size={8} /> TOP SYNC
                                    </span>
                                  )}
                                </div>
                                <div className={`relative p-4 rounded-2xl rounded-tl-none border ${
                                  isPinned ? 'bg-neon-cyan/5 border-neon-cyan/30' : 'bg-white/5 border-white/10 hover:border-white/20'
                                } transition-all`}>
                                  <p className="text-sm text-zinc-200 font-medium leading-relaxed font-chakra">{c.content}</p>
                                  
                                  {/* Like Area */}
                                  <button
                                    onClick={() => handleLikeComment(c.id)}
                                    className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border bg-zinc-950 flex items-center justify-center transition-all ${
                                      c.is_liked ? 'border-neon-magenta text-neon-magenta' : 'border-white/10 text-zinc-600 hover:text-white'
                                    }`}
                                  >
                                    <Heart size={14} fill={c.is_liked ? 'currentColor' : 'none'} className={c.is_liked ? 'vibrant-glow' : ''} />
                                  </button>
                                  {c.likes_count > 0 && (
                                    <span className="absolute -bottom-2 right-8 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/5 text-[10px] font-black tabular-nums text-zinc-400">
                                      {c.likes_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-auto border-t border-white/5 bg-black/20 backdrop-blur-md pt-6 pb-2 flex flex-col items-center gap-6">
        <button
          onClick={() => setIsInquiryModalOpen(true)}
          className="group flex flex-col items-center gap-3 transition-all hover:scale-105"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-neon-cyan/50 group-hover:bg-neon-cyan/5 shadow-lg shadow-black transition-all">
            <Mail size={20} className="text-zinc-500 group-hover:text-neon-cyan transition-colors" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-neon-cyan transition-colors whitespace-nowrap">
            {t('contactAdmin')}
          </span>
        </button>
        <p className="text-zinc-600 text-[10px] font-black tracking-[0.3em] uppercase opacity-50">
          © 2026 STANDOM GLOBAL NETWORK
        </p>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-20" />

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        subMessage={toast.subMessage}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </main>
  );
}
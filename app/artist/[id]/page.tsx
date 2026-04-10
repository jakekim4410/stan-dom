'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { addComment } from '@/actions/comment';
import {
  ArrowLeft,
  Share2,
  Edit2,
  Flag,
  Music,
  Play,
  Pause,
  Globe2,
  MessageCircle,
  Send,
  ShieldAlert,
  Mail,
  ChevronLeft,
  ChevronRight
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
    if (saved === 'EN' || saved === 'KO') {
      setLang(saved);
    } else {
      const browserLang = navigator.language?.startsWith('ko') ? 'KO' : 'EN';
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

    if (commentsRes.data) setComments(commentsRes.data);

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
      message: 'TRANSMISSION LINK COPIED',
      subMessage: 'SYNC_PROTOCOL_SUCCESS'
    });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;

    if (!user) {
      setToast({
        isVisible: true,
        message: 'AUTHENTICATION_REQUIRED',
        subMessage: 'LOGIN TO TRANSMIT SIGNALS',
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
        message: 'TRANSMISSION FAILED',
        subMessage: 'NETWORK ERROR',
      });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
    }
    setSending(false);
  };

  // ✅ 언어 토글 — localStorage에 저장
  const handleToggleLang = () => {
    setLang(prev => {
      const next = prev === 'EN' ? 'KO' : 'EN';
      localStorage.setItem('stan_lang', next);
      return next;
    });
  };

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
    <main className="min-h-screen bg-[#020202] text-white selection:bg-[#37C561]/30 overflow-x-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-neon-cyan/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-neon-magenta/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50" />
      </div>

      {/* Glass Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4 backdrop-blur-md border-b border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-neon-cyan/50 transition-all">
              <ArrowLeft size={16} className="group-hover:text-neon-cyan" />
            </div>
            <span className="font-black text-[10px] tracking-widest uppercase text-zinc-500 group-hover:text-zinc-200 transition-colors hidden sm:block">
              {lang === 'KO' ? '순위로 돌아가기' : 'Return to Rankings'}
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* ✅ onToggle을 handleToggleLang으로 교체 */}
            <LanguageSwitcher lang={lang} onToggle={handleToggleLang} />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-neon-lime rounded-full shadow-[0_0_8px_#bcfe00] flex-shrink-0" />
              <span className="font-black text-[10px] tracking-tighter uppercase text-neon-lime whitespace-nowrap">System Online</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Info & Audio */}
            <div className="space-y-8">
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
                  className="text-5xl sm:text-6xl md:text-8xl font-black italic tracking-tighter leading-none mb-6"
                >
                  {artist.name}
                </motion.h1>

                {/* ✅ 스탯 패널 — whitespace-nowrap, flex-wrap, min-w-0 적용 */}
                <div className="flex gap-2 flex-wrap">
                  <div className="glass-panel px-4 py-3 flex flex-col gap-1 min-w-0">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{t('globalPower')}</span>
                    <span className="text-3xl font-black italic text-neon-lime">{(artist.total_votes || 0).toLocaleString()}</span>
                  </div>
                  <div className="glass-panel px-4 py-3 flex flex-col gap-1 min-w-0">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{t('coverage')}</span>
                    <span className="text-3xl font-black italic text-neon-cyan whitespace-nowrap">
                      {countryStats.length}<span className="text-sm not-italic opacity-50 ml-1">{t('regions')}</span>
                    </span>
                  </div>
                  <button
                    onClick={handleShare}
                    className="glass-panel px-4 py-3 flex flex-col items-center justify-center gap-1 group/share hover:border-neon-cyan/50 transition-all border-white/10 min-w-0"
                  >
                    <Share2 size={16} className="text-neon-cyan group-hover/share:scale-110 transition-transform" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{t('shareSync')}</span>
                  </button>
                </div>
              </div>

              {/* Audio Preview Card */}
              {topTrack ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-panel p-6 border-l-4 border-l-neon-magenta group"
                >
                  <div className="scanner-line opacity-10 group-hover:opacity-20 transition-opacity" />
                  <div className="flex items-center gap-4 sm:gap-6 relative z-10">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-white/10 shadow-lg relative flex-shrink-0">
                      <img src={topTrack.albumCover} alt="Album Cover" className="w-full h-full object-cover" />
                      <button
                        onClick={togglePlayback}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/20 transition-all"
                      >
                        {isPlaying ? <Pause fill="white" size={28} /> : <Play fill="white" size={28} className="translate-x-0.5" />}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-neon-magenta tracking-widest uppercase mb-1 flex items-center gap-2">
                        <Music size={10} /> {t('nowScanning')}
                      </p>
                      <h3 className="text-base sm:text-lg font-black truncate mb-1">{topTrack.title}</h3>
                      <p className="text-xs text-zinc-500 font-bold whitespace-nowrap">{lang === 'KO' ? '대표곡 미리듣기' : 'Representative Track Preview'}</p>
                    </div>
                    <div className={`w-10 flex flex-col gap-1 pr-2 flex-shrink-0 ${isPlaying ? 'opacity-100' : 'opacity-20'}`}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 bg-neon-magenta rounded-full ${isPlaying ? 'animate-pulse' : ''}`} style={{ width: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  </div>
                  <audio ref={audioRef} src={topTrack.preview} onEnded={() => setIsPlaying(false)} className="hidden" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-panel p-5 border-l-4 border-l-zinc-700 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center flex-shrink-0">
                    <Music size={20} className="text-zinc-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-1 whitespace-nowrap">{t('audioUnavailable')}</p>
                    <p className="text-sm font-bold text-zinc-400">{lang === 'KO' ? '미리듣기를 제공하지 않는 곡입니다' : 'No licensed preview on Deezer'}</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Artist Image Visual */}
            <div className="relative max-w-md mx-auto lg:mx-0 lg:ml-auto">
              <div className="absolute -inset-10 bg-neon-cyan/20 blur-[100px] rounded-full animate-pulse pointer-events-none" />
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square w-full rounded-[3rem] overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(55,197,97,0.2)]"
              >
                <div className="scanner-line" />
                {artist.image_url
                  ? <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700 hover:scale-105" />
                  : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-8xl font-black text-zinc-800 uppercase">{artist.name[0]}</div>
                }
              </motion.div>

              <div className="mt-6 flex justify-center gap-3 px-2 relative z-10 flex-wrap">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 hover:border-[#37C561]/50 hover:bg-[#37C561]/5 transition-all group/edit"
                >
                  <Edit2 size={12} className="text-zinc-500 group-hover/edit:text-[#37C561] transition-colors flex-shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover/edit:text-[#37C561] transition-colors whitespace-nowrap">{t('curatePhoto')}</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 transition-all group/flag"
                >
                  <Flag size={12} className="text-zinc-500 group-hover/flag:text-red-500 transition-colors flex-shrink-0" />
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

      {/* Dashboard Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-8 pb-24">

        {/* Analytics Scanner (Left 7) */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="text-xl font-black italic flex items-center gap-3 whitespace-nowrap">
              <Globe2 className="text-neon-cyan flex-shrink-0" size={24} />
              {t('fandomDensity')}
            </h2>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">
              {lang === 'KO' ? '실시간' : 'Real-time'}
            </div>
          </div>

          <div className="glass-panel p-6 sm:p-8 min-h-[500px] relative overflow-hidden">
            <div className="scanner-line opacity-5" />

            {countryStats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                <ShieldAlert size={48} className="opacity-20 text-neon-cyan" />
                <p className="font-black text-sm uppercase tracking-widest text-center">{lang === 'KO' ? '해당 지역의 데이터가 아직 없습니다' : 'No Fandom Patterns Detected'}</p>
                <Link href="/" className="text-neon-cyan text-[10px] font-black hover:underline">{lang === 'KO' ? '지금 투표하여 지도에 표시하세요' : 'VOTE NOW TO MAP THIS SYNC'}</Link>
              </div>
            ) : (
              <div className="space-y-6">
                {countryStats.slice(0, 8).map((s, i) => (
                  <motion.div
                    key={s.code}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group"
                  >
                    <div className="flex justify-between items-end mb-2 gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className="font-mono text-[10px] text-zinc-600 w-4 font-black flex-shrink-0">0{i + 1}</span>
                        <span className="text-2xl flex-shrink-0">{s.flag}</span>
                        <span className="font-black text-sm tracking-tight group-hover:text-neon-cyan transition-colors uppercase truncate">{s.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1 flex-shrink-0">
                        <span className="font-mono font-black text-neon-lime text-lg">{s.count.toLocaleString()}</span>
                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">{lang === 'KO' ? '표' : 'Hits'}</span>
                      </div>
                    </div>
                    <div className="h-4 bg-zinc-900 shadow-inner rounded-md overflow-hidden p-[2px] border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.count / maxBarCount) * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                        className="h-full rounded-sm relative"
                        style={{ background: 'linear-gradient(to right, #00f3ff, #bcfe00)' }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] w-[30%] animate-[scan-horizontal_2s_infinite]" />
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}

                <div className="pt-8 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 font-mono text-[9px] text-zinc-600">
                    [SIGNAL FREQUENCY: ACTIVE]<br />
                    [LATENCY: 14ms]<br />
                    [NODE: {artistId.slice(0, 8)}]
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 font-mono text-[9px] text-zinc-600">
                    [VOTES_SYNC: OK]<br />
                    [SYSTEM_POWER: 100.0%]<br />
                    [VERIFIED_DATA]
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Cheering Board (Right 5) */}
        <section className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black italic flex items-center gap-3">
              <MessageCircle className="text-neon-magenta flex-shrink-0" size={24} />
              <span className="whitespace-nowrap">{t('liveHub')}</span>
            </h2>
          </div>

          <div className="glass-panel p-6 flex flex-col h-[650px] border-neon-magenta/20">
            <div className="scanner-line opacity-5 bg-neon-magenta" />

            {/* Comment Input */}
            <div className="relative z-20 space-y-4 mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
              {user ? (
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-zinc-900 flex-shrink-0">
                    {user.user_metadata?.avatar_url
                      ? <img src={user.user_metadata.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{user.user_metadata?.full_name?.[0] || 'U'}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-neon-cyan uppercase tracking-widest truncate">
                      {user.user_metadata?.full_name || user.user_metadata?.custom_id || 'Global Fan'}
                      <span className="text-zinc-600 ml-2">Verified Sync</span>
                    </p>
                    <p className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                      {user.user_metadata?.country_code ? (
                        <><span>{COUNTRY_FLAGS[user.user_metadata.country_code] ?? '🌐'}</span> {COUNTRY_NAMES[user.user_metadata.country_code] ?? user.user_metadata.country_code}</>
                      ) : (lang === 'KO' ? '팬 노드 미연결' : 'GUEST_NODE_UNSYNC')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <ShieldAlert size={14} className="text-neon-magenta/50 flex-shrink-0" />
                    Unauthorized Access Detected
                  </div>
                  <Link
                    href="/login"
                    className="px-6 py-2 bg-neon-magenta/20 border border-neon-magenta/50 text-neon-magenta rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-neon-magenta hover:text-white transition-all shadow-[0_0_15px_rgba(255,0,255,0.1)] whitespace-nowrap"
                  >
                    Login to participation Hub
                  </Link>
                </div>
              )}

              <div className="space-y-3">
                <textarea
                  placeholder={user ? (lang === 'KO' ? `${artist.name} 팬들에게 메시지를 남기세요...` : `Transmit message to ${artist.name} fans...`) : (lang === 'KO' ? "로그인하고 글로벌 팬 허브에 참여하세요..." : "Login to join the global fan synchronization...")}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value.slice(0, 140))}
                  maxLength={140}
                  rows={2}
                  disabled={!user}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && user) { e.preventDefault(); handleSendComment(); } }}
                  className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-zinc-800 resize-none leading-relaxed disabled:opacity-20 transition-all font-chakra shadow-sm"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black text-zinc-700 tracking-widest">{commentText.length}/140</span>
                  <button
                    onClick={handleSendComment}
                    disabled={!commentText.trim() || sending || !user}
                    className="px-6 py-2 rounded-lg bg-neon-magenta text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-magenta-600 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(255,0,255,0.3)] whitespace-nowrap"
                  >
                    {t('transmit')}
                  </button>
                </div>
              </div>
            </div>

            {/* Feed Scroll */}
            <div className="flex-1 overflow-y-auto space-y-4 relative z-10 custom-scrollbar pr-2 mb-4">
              <AnimatePresence initial={false} mode="popLayout">
                {comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-3 grayscale opacity-30">
                    <Send size={32} />
                    <p className="font-black text-[10px] uppercase tracking-widest text-center">{lang === 'KO' ? '첫 번째 메시지를 기다리고 있습니다...' : 'Awaiting First Transmission...'}</p>
                  </div>
                ) : (
                  comments
                    .slice((currentPage - 1) * COMMENTS_PER_PAGE, currentPage * COMMENTS_PER_PAGE)
                    .map(c => (
                      <motion.div
                        layout
                        key={c.id}
                        initial={{ opacity: 0, scale: 0.9, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="p-4 bg-white/3 rounded-xl border border-white/5 hover:border-neon-magenta/30 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-xs border border-white/10 group-hover:border-neon-magenta/50 transition-colors flex-shrink-0">
                              {c.country_code ? (COUNTRY_FLAGS[c.country_code] ?? '🌐') : '💜'}
                            </span>
                            <span className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-neon-magenta transition-colors truncate">{c.display_name || 'Anonymous Fan'}</span>
                          </div>
                          <span className="text-[8px] font-bold text-zinc-700 flex-shrink-0">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 font-medium leading-relaxed break-words">{c.content}</p>
                      </motion.div>
                    ))
                )}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {comments.length > COMMENTS_PER_PAGE && (
              <div className="relative z-10 flex items-center justify-center gap-2 py-2 border-t border-white/5 bg-black/20">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-zinc-500 disabled:opacity-20 hover:text-white transition-all"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(comments.length / COMMENTS_PER_PAGE) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1
                          ? 'bg-neon-magenta text-white border border-neon-magenta shadow-[0_0_10px_rgba(255,0,255,0.3)]'
                          : 'bg-white/5 border border-white/10 text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  disabled={currentPage === Math.ceil(comments.length / COMMENTS_PER_PAGE)}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-zinc-500 disabled:opacity-20 hover:text-white transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="mt-16 border-t border-white/5 bg-black/20 backdrop-blur-md pt-16 pb-12 flex flex-col items-center gap-8">
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
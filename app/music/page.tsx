'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useMusic } from '@/app/contexts/MusicContext';
import { Play, TrendingUp, RefreshCcw, ArrowLeft, Info, Search, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Language, getT } from '@/constants/i18n';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MusicChartPage = () => {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lang, setLang] = useState<Language>('EN');
  const [showSourceInfo, setShowSourceInfo] = useState(false);
  const { playTrack, setPlaylist, currentTrack, togglePlay } = useMusic();
  const router = useRouter();
  const t = getT(lang);

  // 저장된 언어 읽기
  useEffect(() => {
    const savedLang = localStorage.getItem('stan_lang') as Language;
    if (savedLang && ['EN', 'KO', 'ES'].includes(savedLang)) {
      setLang(savedLang);
    }
  }, []);

  const fetchChart = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('kpop_charts')
      .select('*')
      .order('rank', { ascending: true });

    if (error) {
      console.error('Error fetching chart:', error);
      setError(error.message);
    } else {
      setTracks(data || []);
      if (data && data.length > 0) {
        setPlaylist(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChart();
  }, []);

  const handlePlay = (track: any) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  // 앨범아트가 하나라도 있는지 확인
  const hasAnyAlbumArt = tracks.some(
    (t) => t.album_art && t.album_art.trim() !== ''
  );

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-20 pb-40 relative">

      {/* ── 상단 네비게이션 바 ── */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-black/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* 홈으로 버튼 — 항상 눈에 띄게 */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#37C561]/15 border border-[#37C561]/40 text-[#37C561] text-xs font-black uppercase tracking-widest hover:bg-[#37C561]/25 transition-all shadow-[0_0_12px_rgba(55,197,97,0.15)]"
          >
            <ArrowLeft size={14} />
            {t('musicChartGoHome')}
          </button>

          <div className="flex items-center gap-2 text-[#37C561] font-mono text-[10px] tracking-widest uppercase">
            <TrendingUp size={12} />
            <span>{t('musicChartSync')}</span>
          </div>
        </div>
      </div>

      {/* ── 헤더 섹션 ── */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 mt-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
            K-POP{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-600">
              CHART 50
            </span>
          </h1>
          <p className="mt-3 text-zinc-300 font-medium max-w-xl break-keep text-sm leading-relaxed">
            {t('musicChartSub')}
          </p>

          {/* 데이터 출처 표기 */}
          <button
            onClick={() => setShowSourceInfo((v) => !v)}
            className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors font-mono uppercase tracking-widest"
          >
            <Info size={10} />
            {t('musicChartSourceNote')}
          </button>
          <AnimatePresence>
            {showSourceInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-3 rounded-xl bg-zinc-900/60 border border-white/5 text-[11px] text-zinc-400 leading-relaxed max-w-lg">
                  <p>{t('musicChartSourceSub')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href="https://music.apple.com/kr/browse"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FC3C44]/10 border border-[#FC3C44]/20 text-[#FC3C44] text-[10px] font-bold hover:bg-[#FC3C44]/20 transition-colors"
                    >
                      <ExternalLink size={9} />
                      iTunes
                    </a>
                    <a
                      href="https://charts.youtube.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                    >
                      <ExternalLink size={9} />
                      YouTube Charts
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={fetchChart}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors flex-shrink-0"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          {t('musicChartRefresh')}
        </button>
      </div>

      {/* ── 검색 필터 ── */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-zinc-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or artist..."
            className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#37C561]/50 focus:ring-1 focus:ring-[#37C561]/50 transition-colors"
          />
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-2 border-[#37C561]/20 border-t-[#37C561] rounded-full animate-spin" />
          <p className="text-zinc-500 font-mono text-xs animate-pulse uppercase tracking-widest">
            {t('musicChartScanning')}
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
          <p className="text-red-400 font-bold uppercase tracking-tight mb-2">
            {t('musicChartOffline')}
          </p>
          <p className="text-zinc-600 text-sm italic">{error}</p>
          <p className="mt-1 text-xs text-zinc-500">{t('musicChartRetry')}</p>
        </div>
      ) : (
        <div className="grid gap-1.5">
          {tracks
            .filter((t) => 
              t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
              t.artist.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((track, index) => {
            const isActive = currentTrack?.id === track.id;
            const hasArt = track.album_art && track.album_art.trim() !== '';

            return (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.015 }}
                key={track.id}
                onClick={() => handlePlay(track)}
                className={`group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#37C561]/10 border-[#37C561]/30 shadow-[0_0_20px_rgba(55,197,97,0.08)]'
                    : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-900/80 hover:border-white/10'
                }`}
              >
                {/* 순위 */}
                <div
                  className={`w-8 flex-shrink-0 text-center font-mono font-black italic text-sm transition-colors ${
                    isActive ? 'text-[#37C561]' : 'text-zinc-700 group-hover:text-[#37C561]'
                  }`}
                >
                  {String(track.rank).padStart(2, '0')}
                </div>

                {/* 앨범아트 (있을 때만 표시하되, 없을 경우 컬러 그라데이션+첫글자로 예쁘게 표시) */}
                <div className="relative h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                  {hasArt ? (
                    <>
                      <img
                        src={track.album_art}
                        alt={track.title}
                        className="h-full w-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Play size={16} fill="currentColor" className="text-white" />
                      </div>
                    </>
                  ) : (
                    // 이쁘게 표시되는 컬러 기반 첫글자 대체 이미지
                    <div 
                      className="h-full w-full flex items-center justify-center text-white font-black text-sm shadow-inner transition-transform group-hover:scale-110" 
                      style={{ 
                        background: `linear-gradient(135deg, hsl(${(index * 45) % 360}, 80%, 60%), hsl(${((index * 45) + 60) % 360}, 80%, 40%))` 
                      }}
                    >
                      {track.artist.charAt(0).toUpperCase()}
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Play size={16} fill="currentColor" className="text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* 제목 & 아티스트 */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-sm font-bold truncate uppercase tracking-tight transition-colors ${
                      isActive ? 'text-[#37C561]' : 'text-white'
                    }`}
                  >
                    {track.title}
                  </h3>
                  <p className="text-[11px] text-zinc-500 truncate uppercase tracking-widest font-medium">
                    {track.artist}
                  </p>
                </div>

                {/* 재생 표시 / Listen Now */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  {isActive ? (
                    <div className="flex gap-0.5 h-3 items-end mr-1">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [3, 10, 5, 10, 3] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                          className="w-0.5 bg-[#37C561] rounded-full"
                        />
                      ))}
                    </div>
                  ) : null}
                  <span
                    className={`hidden md:flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest transition-colors ${
                      isActive ? 'text-[#37C561]' : 'text-zinc-600 group-hover:text-zinc-400'
                    }`}
                  >
                    <Play size={9} />
                    {t('musicChartListen')}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── 출처 푸터 ── */}
      {!loading && !error && tracks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] text-zinc-600 font-mono uppercase tracking-widest"
        >
          <div className="flex items-center gap-2">
            <Info size={10} className="text-zinc-700" />
            <span>{t('musicChartSourceNote')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-[#FC3C44]/10 text-[#FC3C44] border border-[#FC3C44]/20">
              iTunes
            </span>
            <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              YouTube
            </span>
          </div>
        </motion.div>
      )}
    </main>
  );
};

export default MusicChartPage;

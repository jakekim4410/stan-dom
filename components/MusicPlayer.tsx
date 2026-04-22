'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMusic } from '@/app/contexts/MusicContext';
import {
  Play, Pause, SkipForward, SkipBack, X,
  Volume2, VolumeX, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

// ── 시간 포맷 (초 → mm:ss) ──────────────────────────────────
const fmt = (sec: number) => {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ── 볼륨 슬라이더 스타일 ────────────────────────────────────
const VOL_STYLE = `
  input.yt-vol::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 13px; height: 13px;
    border-radius: 50%;
    background: #37C561;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(55,197,97,0.8);
  }
  input.yt-vol::-moz-range-thumb {
    width: 13px; height: 13px;
    border-radius: 50%;
    background: #37C561;
    cursor: pointer;
    border: none;
  }
`;

const MusicPlayer = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, stopTrack } = useMusic();

  const playerRef      = useRef<any>(null);
  const readyRef       = useRef(false);   // onReady 완료 여부
  const loadingRef     = useRef(false);   // 로딩 중 중복 방지
  const iframeTickRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isApiReady, setIsApiReady]   = useState(false);
  const [volume,     setVolume]       = useState(80);
  const [isMuted,    setIsMuted]      = useState(false);
  const prevVolRef = useRef(80);

  // ── 진행 바 / 시간 ──────────────────────────────────────
  const [elapsed,  setElapsed]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking,  setSeeking]  = useState(false);

  // ── ref 사본 (closure 안에서 최신값 읽기) ──────────────
  const isPlayingRef   = useRef(isPlaying);
  const currentTrkRef  = useRef(currentTrack);
  useEffect(() => { isPlayingRef.current   = isPlaying;    }, [isPlaying]);
  useEffect(() => { currentTrkRef.current  = currentTrack; }, [currentTrack]);

  // ── 1. YouTube IFrame API 로드 ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.YT?.Player) { setIsApiReady(true); return; }
    window.onYouTubeIframeAPIReady = () => setIsApiReady(true);
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  }, []);

  // ── 2. 타이머 (1초마다 현재 시간 폴링) ─────────────────
  const startTick = useCallback(() => {
    if (iframeTickRef.current) clearInterval(iframeTickRef.current);
    iframeTickRef.current = setInterval(() => {
      if (!playerRef.current || !readyRef.current || seeking) return;
      try {
        const cur  = playerRef.current.getCurrentTime?.() ?? 0;
        const dur  = playerRef.current.getDuration?.()    ?? 0;
        setElapsed(cur);
        setDuration(dur);
      } catch (_) {}
    }, 500);
  }, [seeking]);

  const stopTick = useCallback(() => {
    if (iframeTickRef.current) { clearInterval(iframeTickRef.current); iframeTickRef.current = null; }
  }, []);

  // ── 3. Error 150 → 대체 영상 ID 검색 후 재로드 ─────────
  const tryFallback = useCallback(async () => {
    const track = currentTrkRef.current;
    if (!track) return;
    console.info('[MusicPlayer] Searching embeddable fallback for:', track.title);
    try {
      const res = await fetch(
        `/api/yt-fallback?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`
      );
      const data = await res.json();
      if (data.id && playerRef.current && readyRef.current) {
        console.info('[MusicPlayer] Fallback ID:', data.id, '| query:', data.query);
        playerRef.current.loadVideoById({ videoId: data.id, startSeconds: 0 });
        playerRef.current.unMute();
        playerRef.current.setVolume(isMuted ? 0 : volume);
        if (isPlayingRef.current) playerRef.current.playVideo();
      } else {
        // 대체 영상도 없으면 재생 상태 해제 후 멈춤 (무한 스킵 방지)
        console.warn('[MusicPlayer] No fallback found, stopping track to prevent rapid skips');
        stopTrack();
      }
    } catch (e) {
      console.warn('[MusicPlayer] Fallback fetch error:', e);
      stopTrack();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextTrack, isMuted, volume]);

  // ── 4. 플레이어 초기화 / 트랙 전환 ─────────────────────
  useEffect(() => {
    if (!isApiReady || !currentTrack) return;
    if (loadingRef.current) return;

    setElapsed(0);
    setDuration(0);

    const load = () => {
      if (!playerRef.current) {
        // ─ 최초 생성 ─
        loadingRef.current = true;
        readyRef.current   = false;
        playerRef.current  = new window.YT.Player('yt-hidden-player', {
          height: '200', width: '356',
          videoId: currentTrack.youtube_id,
          playerVars: {
            autoplay: 1, controls: 0, disablekb: 1, fs: 0,
            rel: 0, modestbranding: 1, enablejsapi: 1, playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e: any) => {
              readyRef.current   = true;
              loadingRef.current = false;
              e.target.unMute();
              e.target.setVolume(80);
              if (isPlayingRef.current) e.target.playVideo();
              startTick();
            },
            onStateChange: (e: any) => {
              if (e.data === 0) {
                const currentTime = playerRef.current?.getCurrentTime() || 0;
                if (currentTime < 1) {
                  console.warn('[MusicPlayer] Video ended immediately, stopping to prevent rapid skips.');
                  stopTrack();
                } else {
                  nextTrack(); // ENDED normally
                }
              }
            },
            onError: (e: any) => {
              console.warn('[MusicPlayer] YT error:', e.data);
              if ([101, 150].includes(e.data)) {
                tryFallback();
              } else if ([2, 5, 100].includes(e.data)) {
                console.warn('[MusicPlayer] Unplayable video, stopping.');
                stopTrack();
              }
            },
          },
        });
      } else if (readyRef.current) {
        // ─ 곡 전환 ─
        try {
          playerRef.current.loadVideoById({ videoId: currentTrack.youtube_id, startSeconds: 0 });
          playerRef.current.unMute();
          playerRef.current.setVolume(isMuted ? 0 : volume);
          if (isPlayingRef.current) playerRef.current.playVideo();
          startTick();
        } catch (err) { console.warn('[MusicPlayer] loadVideoById:', err); }
      }
    };

    const t = setTimeout(load, 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.youtube_id, isApiReady]);

  // ── 5. 재생 / 일시정지 동기화 ───────────────────────────
  useEffect(() => {
    if (!playerRef.current || !readyRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.unMute();
        playerRef.current.setVolume(isMuted ? 0 : volume);
        playerRef.current.playVideo();
        startTick();
      } else {
        playerRef.current.pauseVideo();
        stopTick();
      }
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // ── 6. 볼륨 슬라이더 ────────────────────────────────────
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v); setIsMuted(v === 0);
    if (!playerRef.current || !readyRef.current) return;
    try {
      if (v === 0) { playerRef.current.mute(); }
      else { playerRef.current.unMute(); playerRef.current.setVolume(v); }
    } catch (_) {}
  };

  const handleMuteToggle = () => {
    if (!playerRef.current || !readyRef.current) return;
    try {
      if (isMuted) {
        const r = prevVolRef.current || 80;
        setVolume(r); setIsMuted(false);
        playerRef.current.unMute(); playerRef.current.setVolume(r);
      } else {
        prevVolRef.current = volume; setIsMuted(true); playerRef.current.mute();
      }
    } catch (_) {}
  };

  // ── 7. 진행 바 클릭/드래그 ──────────────────────────────
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setElapsed(t);
    try { playerRef.current?.seekTo(t, true); } catch (_) {}
  };

  // ── 8. 언마운트 정리 ────────────────────────────────────
  useEffect(() => () => stopTick(), [stopTick]);

  const hasArt = currentTrack?.album_art?.trim();
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: VOL_STYLE }} />

      {/* 항상 DOM에 존재하는 숨겨진 플레이어 */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '1px', height: '1px', overflow: 'hidden',
          opacity: 0, pointerEvents: 'none', zIndex: -999,
        }}
      >
        <div id="yt-hidden-player" />
      </div>
      {/* ── 플레이어 UI ── */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            key="music-player"
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-[100] px-3 pb-3 pointer-events-none"
          >
            <div className="max-w-4xl mx-auto pointer-events-auto">

              {/* 안내 라벨 */}
              <div className="flex justify-center mb-0.5">
                <span className="text-[9px] text-zinc-600 bg-black/60 px-2 py-0.5 rounded-t-lg border-x border-t border-white/10 flex items-center gap-1">
                  <AlertCircle size={8} />
                  YouTube 스트리밍 · 광고가 발생할 수 있습니다
                </span>
              </div>

              <div className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">

                {/* ── 진행 바 ── */}
                <div className="relative w-full h-1 bg-zinc-800 group cursor-pointer">
                  {/* 채워진 부분 */}
                  <div
                    className="absolute top-0 left-0 h-full bg-[#37C561] transition-none"
                    style={{ width: `${progress}%` }}
                  />
                  {/* 클릭 가능한 input range */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    value={elapsed}
                    onMouseDown={() => setSeeking(true)}
                    onMouseUp={() => setSeeking(false)}
                    onTouchStart={() => setSeeking(true)}
                    onTouchEnd={() => setSeeking(false)}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {/* hover 시 썸 표시 */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>

                {/* ── 메인 컨트롤 영역 ── */}
                <div className="flex items-center p-3 gap-3">

                  {/* 앨범아트 */}
                  <div className="relative h-10 w-10 flex-shrink-0">
                    {hasArt ? (
                      <img
                        src={currentTrack.album_art}
                        alt={currentTrack.title}
                        className="h-full w-full object-cover rounded-lg border border-white/5"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="h-full w-full rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-zinc-600">
                          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                        </svg>
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                        <div className="flex gap-[2px] h-3 items-end">
                          {[1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ height: [2, 10, 4, 10, 2] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.13 }}
                              className="w-[3px] bg-[#37C561] rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 곡 정보 + 시간 */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold truncate text-white uppercase tracking-tight">
                      {currentTrack.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 truncate font-medium uppercase tracking-wider">
                      {currentTrack.artist}
                    </p>
                    {/* 재생 시간 */}
                    <p className="text-[9px] text-zinc-600 font-mono mt-0.5 tabular-nums">
                      {fmt(elapsed)}{duration > 0 ? ` / ${fmt(duration)}` : ''}
                    </p>
                  </div>

                  {/* 재생 컨트롤 */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={prevTrack} className="p-2 text-zinc-500 hover:text-white transition-colors" title="이전 곡">
                      <SkipBack size={17} fill="currentColor" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="p-2.5 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                      {isPlaying
                        ? <Pause size={17} fill="currentColor" />
                        : <Play  size={17} fill="currentColor" className="ml-0.5" />
                      }
                    </button>
                    <button onClick={nextTrack} className="p-2 text-zinc-500 hover:text-white transition-colors" title="다음 곡">
                      <SkipForward size={17} fill="currentColor" />
                    </button>
                  </div>

                  {/* 볼륨 */}
                  <div className="hidden sm:flex items-center gap-2 px-3 border-l border-white/5 flex-shrink-0">
                    <button
                      onClick={handleMuteToggle}
                      className="text-zinc-500 hover:text-white transition-colors"
                      title={isMuted ? '음소거 해제' : '음소거'}
                    >
                      {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <input
                      type="range"
                      min={0} max={100}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="yt-vol w-20 h-1 appearance-none rounded-full outline-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #37C561 ${isMuted ? 0 : volume}%, #27272a ${isMuted ? 0 : volume}%)`
                      }}
                      title={`볼륨 ${isMuted ? 0 : volume}%`}
                    />
                    <span className="text-[9px] text-zinc-600 font-mono w-5 text-right tabular-nums">
                      {isMuted ? 0 : volume}
                    </span>
                  </div>

                  {/* 닫기 */}
                  <button
                    onClick={stopTrack}
                    className="p-1.5 hover:bg-white/10 rounded-full text-zinc-600 hover:text-white transition-colors flex-shrink-0"
                    title="플레이어 닫기"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicPlayer;

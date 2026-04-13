import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import SkeletonLoader from './SkeletonLoader';

import { Language, getT } from '@/constants/i18n';

interface Artist {
  id: string;
  name: string;
  image_url: string | null;
  total_votes: number;
}

interface RankingBoardProps {
  artists: Artist[];
  totalVotes: number;
  votedArtistIds: string[];
  onVote: (artistId: string, currentVotes: number) => void;
  lang: Language;
  disabled: boolean;
  voting?: boolean;
  isMobile?: boolean;
  isLoading?: boolean;
}


// ── Percentage Count-Up Component ──
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1000;
    const startValue = displayValue;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = startValue + (value - startValue) * progress;
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{displayValue.toFixed(1)}%</>;
}

export default function RankingBoard({ 
  artists, 
  totalVotes, 
  votedArtistIds, 
  onVote, 
  lang, 
  disabled, 
  voting,
  isMobile = false,
  isLoading = false
}: RankingBoardProps) {
  const t = getT(lang);
  const sortedArtists = [...artists].sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0));

  if (isLoading) {
    return <SkeletonLoader />;
  }

  return (
    <div className={`flex flex-col h-full relative ${isMobile ? 'pb-24' : ''}`}>
      {/* ── Dashboard Header ── */}
      {!isMobile && (
        <div className="flex-shrink-0 mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-black italic tracking-tighter flex items-center gap-3">
              <Trophy className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" size={24} />
              <span className="neon-text-lime">{t('globalRanking')}</span>
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-neon-lime/30"
                 animate={{ x: ['-100%', '100%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               />
          </div>
        </div>
      )}

      {/* ── Static Ranking Cards (no Reorder to prevent layout jump) ── */}
      <div className={`flex-1 overflow-y-auto pr-1 custom-scrollbar ${isMobile ? 'space-y-3 px-2' : 'space-y-3'}`}>
        <AnimatePresence>
          {sortedArtists.map((artist, index) => {
            const rank = index + 1;
            const isFirst = rank === 1;
            const isTop3 = rank <= 3;
            const isOnCooldown = votedArtistIds.includes(artist.id);
            const isDisabled = disabled || voting;
            const percent = totalVotes > 0 ? (artist.total_votes / totalVotes) * 100 : 0;

            if (isMobile) {
              return (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="glassmorphism rounded-2xl p-4 border-white/5 relative overflow-hidden"
                >
                  {isFirst && <div className="scanner-line opacity-[0.1]" />}
                  <div className="flex items-center gap-4 relative z-10">
                    <span className={`text-xl font-black italic ${isFirst ? 'text-neon-lime' : 'text-zinc-700'}`}>
                      {rank}
                    </span>
                    <div className={`w-12 h-12 rounded-xl border overflow-hidden flex-shrink-0 ${isFirst ? 'border-neon-lime' : 'border-white/10'}`}>
                      {artist.image_url ? (
                        <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600 font-black">{artist.name[0]}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-2">
                        <h4 className="text-sm font-black text-white truncate uppercase tracking-tight">
                          {artist.name}
                        </h4>
                        <span className="text-[10px] font-mono font-black text-neon-lime">
                          <AnimatedNumber value={percent} />
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full ${isFirst ? 'bg-neon-lime shadow-[0_0_10px_rgba(55,197,97,0.5)]' : 'bg-neon-lime/50'}`}
                        />
                      </div>
                    </div>
                    
                    <button
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        if (!isOnCooldown && !isDisabled) onVote(artist.id, artist.total_votes);
                      }}
                      disabled={isDisabled || isOnCooldown}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                        isOnCooldown
                          ? 'bg-zinc-900/50 text-zinc-700 border border-white/5 cursor-not-allowed' 
                          : isDisabled
                          ? 'bg-zinc-900/50 text-zinc-600 border border-white/5 cursor-not-allowed opacity-60'
                          : (isFirst 
                              ? 'bg-neon-lime text-black shadow-[0_0_15px_rgba(55,197,97,0.4)]' 
                              : 'bg-white/5 text-neon-lime border border-white/10 hover:bg-neon-lime hover:text-black')
                      }`}
                    >
                      {isOnCooldown ? '✓' : <Plus size={22} strokeWidth={3} className={voting ? 'animate-spin' : ''} />}
                    </button>
                  </div>
                </motion.div>
              );
            }

            // Desktop card
            return (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
              >
                <div 
                  className={`holographic-panel p-4 group transition-colors duration-300 ${
                    isFirst ? 'border-neon-lime/40 bg-neon-lime/[0.03]' : 'hover:border-neon-lime/40 hover:bg-white/5'
                  }`}
                >
                  {isFirst && <div className="scanner-line opacity-[0.05]" />}
                  
                  <div className="flex items-center gap-4 relative z-20">
                    {/* Rank Node */}
                    <div className="flex flex-col items-center justify-center w-12 flex-shrink-0">
                      <div className={`text-2xl font-black italic leading-none ${isFirst ? 'text-neon-lime' : (isTop3 ? 'text-neon-lime' : 'text-zinc-600')}`}>
                         {rank < 10 ? `0${rank}` : rank}
                      </div>
                      {isFirst && <span className="text-neon-lime crown-neon">👑</span>}
                    </div>

                    {/* Artist Cluster */}
                    <Link href={`/artist/${artist.id}`} className="flex-1 flex gap-4 min-w-0">
                      <div className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-transform group-hover:scale-110 flex-shrink-0 ${
                        isFirst ? 'border-neon-lime shadow-[0_0_15px_rgba(55,197,97,0.3)]' : 'border-white/10 group-hover:border-neon-lime/50'
                      }`}>
                        {artist.image_url ? (
                          <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-xl font-bold text-zinc-600">{artist.name[0]}</div>
                        )}
                        {isFirst && <div className="absolute inset-0 bg-gradient-to-t from-neon-lime/20 to-transparent" />}
                      </div>

                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                           <h3 className="text-base font-black tracking-tight truncate">
                             {artist.name}
                           </h3>
                           {isTop3 && <Zap size={12} className={isFirst ? 'text-neon-lime fill-neon-lime' : 'text-neon-lime fill-neon-lime'} />}
                        </div>
                        <div className="flex items-baseline gap-2">
                           <span className={`font-mono text-[10px] font-black uppercase ${isFirst ? 'text-neon-lime' : (isTop3 ? 'text-neon-lime' : 'text-zinc-500')}`}>
                             <AnimatedNumber value={percent} />
                           </span>
                           <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">Coverage</span>
                        </div>
                      </div>
                    </Link>

                    {/* Vote Button */}
                    <button
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        if (!isOnCooldown && !isDisabled) onVote(artist.id, artist.total_votes);
                      }}
                      disabled={isDisabled || isOnCooldown}
                      title={isOnCooldown ? t('alreadyVoted') : isDisabled && !userCountryMissing ? '' : t('selectCountryFirst')}
                      className={`relative overflow-hidden px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all flex-shrink-0 ${
                        isOnCooldown
                          ? 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed' 
                          : isDisabled
                          ? 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed opacity-60'
                          : (isFirst 
                              ? 'bg-neon-lime text-black border-none shadow-[0_0_20px_rgba(55,197,97,0.4)] hover:shadow-[0_0_30px_rgba(55,197,97,0.6)] active:scale-90' 
                              : 'bg-white/5 text-white border border-white/10 hover:bg-neon-lime hover:text-black hover:border-transparent active:scale-90')
                      }`}
                    >
                      {isOnCooldown ? `✓ ${t('voted')}` : t('transmit')}
                    </button>
                  </div>

                  {/* Progress Bar - no layout prop to prevent jumping */}
                  <div className="mt-3 relative overflow-hidden h-1 w-full bg-black/40 rounded-full border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1.0, ease: "easeOut" }}
                      className={`h-full ${isFirst ? 'bg-neon-lime' : (isTop3 ? 'bg-neon-lime' : 'bg-zinc-700')}`}
                    />
                  </div>

                  <div className="mt-1.5 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
                      <span className="text-[7px] font-black uppercase tracking-widest text-zinc-500">Fan Sync Protocol Active</span>
                      <span className={`font-mono text-xs font-black ${isFirst ? 'text-neon-lime' : (isTop3 ? 'text-neon-lime' : 'text-white')}`}>
                        {(artist.total_votes || 0).toLocaleString()} <span className="text-[8px] opacity-50 uppercase ml-1">Votes</span>
                      </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// dummy to satisfy TSC - userCountryMissing is only used inside button title
const userCountryMissing = false;

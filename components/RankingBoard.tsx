import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import SkeletonLoader from './SkeletonLoader';

import { Language, getT } from '@/constants/i18n';
import { getLangName } from '@/utils/localization';

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
    <div className={`flex flex-col h-full relative ${isMobile ? 'pb-24 w-full' : 'w-full'}`}>
      {/* ── Dashboard Header ── */}
      {!isMobile && (
        <div className="flex-shrink-0 mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md w-full">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <h2 className="text-xl md:text-2xl font-black italic tracking-tighter flex items-center gap-3 min-w-0">
              <Trophy className="text-yellow-400 shrink-0" size={24} />
              <span className="neon-text-lime truncate">{t('globalRanking')}</span>
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 shrink-0">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Ranking Cards ── */}
      <div className={`flex-1 overflow-y-auto pr-1 custom-scrollbar w-full ${isMobile ? 'space-y-3 px-2' : 'space-y-3'}`}>
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
                  className="glassmorphism rounded-2xl p-4 border-white/5 relative overflow-hidden w-full"
                >
                  <div className="flex items-center gap-3 relative z-10 w-full">
                    <span className={`text-lg font-black italic shrink-0 w-6 ${isFirst ? 'text-neon-lime' : 'text-zinc-700'}`}>
                      {rank}
                    </span>
                    <div className={`w-10 h-10 rounded-xl border overflow-hidden shrink-0 ${isFirst ? 'border-neon-lime' : 'border-white/10'}`}>
                      <img src={artist.image_url || '/placeholder.png'} alt="" className="w-full h-full object-cover" />
                    </div>
                    {/* 이름 부분: min-w-0이 중요합니다 */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-white leading-tight uppercase tracking-tight break-words line-clamp-1">
                        {getLangName(artist.name, lang)}
                      </h4>
                      <span className="text-[9px] font-mono font-black text-neon-lime">
                        <AnimatedNumber value={percent} />
                      </span>
                    </div>

                    <button
                      onClick={() => !isOnCooldown && !isDisabled && onVote(artist.id, artist.total_votes)}
                      disabled={isDisabled || isOnCooldown}
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ..."
                    >
                      {isOnCooldown ? '✓' : <Plus size={20} strokeWidth={3} />}
                    </button>
                  </div>
                </motion.div>
              );
            }

            // Desktop card
            return (
              <motion.div key={artist.id} className="w-full">
                <div className={`holographic-panel p-4 group transition-all w-full ${isFirst ? 'border-neon-lime/40' : ''}`}>
                  <div className="flex items-center gap-4 relative z-20 w-full">
                    {/* Rank */}
                    <div className="flex flex-col items-center justify-center w-10 shrink-0">
                      <div className={`text-xl font-black italic ${isFirst ? 'text-neon-lime' : 'text-zinc-600'}`}>
                        {rank < 10 ? `0${rank}` : rank}
                      </div>
                    </div>

                    {/* Artist Info - min-w-0 필수 */}
                    <Link href={`/artist/${artist.id}`} className="flex-1 flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                        <img src={artist.image_url || '/placeholder.png'} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm md:text-base font-black tracking-tight truncate group-hover:text-neon-lime transition-colors">
                            {getLangName(artist.name, lang)}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-black text-neon-lime">
                            <AnimatedNumber value={percent} />
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Vote Button - 스페인어 대응을 위해 min-w 제거하고 padding 조절 */}
                    <button
                      onClick={() => !isOnCooldown && !isDisabled && onVote(artist.id, artist.total_votes)}
                      disabled={isDisabled || isOnCooldown}
                      className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shrink-0 transition-all ${isOnCooldown ? 'bg-zinc-900 text-zinc-600' : 'bg-neon-lime text-black'
                        }`}
                    >
                      {isOnCooldown ? `✓ ${t('voted')}` : t('transmit')}
                    </button>
                  </div>
                  {/* Progress Bar 생략... */}
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

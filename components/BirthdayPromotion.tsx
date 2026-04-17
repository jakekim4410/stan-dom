'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTodayBirthdays } from '@/actions/getTodayBirthdays';
import { Cake, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';

interface BirthdayStar {
  id: string;
  name: string;
  image_url: string | null;
  artist_id?: string;
  type: 'artist' | 'member';
}

export default function BirthdayPromotion({ lang }: { lang: string }) {
  const [stars, setStars] = useState<BirthdayStar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getTodayBirthdays();
      if (res.success) {
        setStars(res.birthdays || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading || stars.length === 0) return null;

  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neon-magenta/10 border border-neon-magenta/20 flex items-center justify-center text-neon-magenta shadow-[0_0_15px_rgba(255,0,255,0.2)]">
            <Cake size={20} className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none">
              {lang === 'KO' ? '오늘의 생일 스타' : 'Today’s B-Day Stars'}
            </h3>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
              Celebrating the light of the fandom
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
          <div className="w-1 h-1 rounded-full bg-neon-magenta animate-ping" />
          <span className="text-[10px] font-black text-neon-magenta uppercase tracking-widest">Live Celebration</span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
        {stars.map((star) => (
          <motion.div
            key={`${star.type}-${star.id}`}
            whileHover={{ y: -5 }}
            className="flex-shrink-0 w-40 snap-start"
          >
            <Link 
              href={star.type === 'artist' ? `/artist/${star.id}` : `/artist/${star.artist_id}`}
              className="block relative group"
            >
              <div className="aspect-[3/4] rounded-3xl overflow-hidden border-2 border-white/10 group-hover:border-neon-magenta/50 transition-all shadow-xl bg-zinc-900">
                {star.image_url ? (
                  <img src={star.image_url} alt={star.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-800">
                    {star.name[0]}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                
                {/* Birthday Tag */}
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-neon-magenta text-white text-[8px] font-black uppercase tracking-tighter z-10 shadow-lg shadow-neon-magenta/40">
                  HAPPY B-DAY
                </div>
                
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-black text-white truncate drop-shadow-md">
                    {star.name}
                  </p>
                  <p className="text-[8px] font-bold text-neon-magenta uppercase tracking-widest opacity-80 mt-0.5">
                    {star.type === 'member' ? 'MEMBER' : 'SOLO / GROUP'}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

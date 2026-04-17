'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTodayBirthdays } from '@/actions/getTodayBirthdays';
import { Cake, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import MonthlyCalendarModal from './MonthlyCalendarModal';

interface BirthdayStar {
  id: string;
  name: string;
  image_url: string | null;
  artist_id?: string;
  type: 'artist' | 'member';
  isUpcoming?: boolean;
}

export default function BirthdayPromotion({ lang }: { lang: string }) {
  const [stars, setStars] = useState<BirthdayStar[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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

  if (loading) return null;

  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neon-magenta/10 border border-neon-magenta/20 flex items-center justify-center text-neon-magenta shadow-[0_0_15px_rgba(255,0,255,0.2)]">
            <Cake size={20} className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none">
              {lang === 'KO' ? '이달의 생일 스타' : 'B-Day Stars'}
            </h3>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
              Celebrating the light of the fandom
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Calendar Toggle Button */}
          <button 
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:inline">Monthly Calendar</span>
            <ChevronRight size={14} className="text-white sm:hidden" />
          </button>
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-1 h-1 rounded-full bg-neon-magenta animate-ping" />
            <span className="text-[10px] font-black text-neon-magenta uppercase tracking-widest">Live Celebration</span>
          </div>
        </div>
      </div>

      {stars.length === 0 ? (
        <div className="w-full h-32 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 animate-pulse bg-white/5">
          <Cake size={24} className="text-zinc-600" />
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">
            {lang === 'KO' ? '현재 다가오는 생일자가 없습니다' : 'No upcoming birthdays today'}
          </p>
          <button onClick={() => setIsCalendarOpen(true)} className="text-[10px] text-neon-magenta hover:underline tracking-widest font-black uppercase mt-1">
            {lang === 'KO' ? '월간 캘린더 확인하기' : 'View Monthly Calendar'}
          </button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
          {stars.map((star) => {
            // Parse JSON name if it represents a member's alias map
            let displayName = star.name;
            try {
              if (star.name.startsWith('{')) {
                const nameMap = JSON.parse(star.name);
                displayName = nameMap[lang] || nameMap['EN'] || Object.values(nameMap)[0] || star.name;
              }
            } catch (e) {
              displayName = star.name;
            }

            const isUpcoming = star.isUpcoming;
            const badgeText = isUpcoming ? 'D-1 UPCOMING' : 'HAPPY B-DAY';
            const accentColor = isUpcoming ? 'bg-cyan-500' : 'bg-neon-magenta';
            const borderColor = isUpcoming ? 'group-hover:border-cyan-500/50' : 'group-hover:border-neon-magenta/50';
            const shadowColor = isUpcoming ? 'shadow-cyan-500/40' : 'shadow-neon-magenta/40';
            const textColor = isUpcoming ? 'text-cyan-500' : 'text-neon-magenta';

            return (
              <motion.div
                key={`${star.type}-${star.id}-${isUpcoming ? 'up' : 'today'}`}
                whileHover={{ y: -5 }}
                className="flex-shrink-0 w-40 snap-start"
              >
                <Link 
                  href={star.type === 'artist' ? `/artist/${star.id}` : `/artist/${star.artist_id}`}
                  className="block relative group"
                >
                  <div className={`aspect-[3/4] rounded-3xl overflow-hidden border-2 border-white/10 ${borderColor} transition-all shadow-xl bg-zinc-900 opacity-${isUpcoming ? '80' : '100'} hover:opacity-100`}>
                    {star.image_url ? (
                      <img src={star.image_url} alt={displayName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-800">
                        {displayName.charAt(0)}
                      </div>
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-t ${isUpcoming ? 'from-black/90' : 'from-black/80'} via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity`} />
                    
                    {/* Birthday Tag */}
                    <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg ${accentColor} text-white text-[8px] font-black uppercase tracking-tighter z-10 shadow-lg ${shadowColor}`}>
                      {badgeText}
                    </div>
                    
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-sm font-black text-white truncate drop-shadow-md">
                        {displayName}
                      </p>
                      <p className={`text-[8px] font-bold ${textColor} uppercase tracking-widest opacity-80 mt-0.5`}>
                        {star.type === 'member' ? 'MEMBER' : 'SOLO / GROUP'}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <MonthlyCalendarModal 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        lang={lang} 
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTodayBirthdays } from '@/actions/getTodayBirthdays';
import { Cake, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import MonthlyCalendarModal from './MonthlyCalendarModal';
import { getLangName } from '@/utils/localization';
import { Language, getT } from '@/constants/i18n';

interface BirthdayStar {
  id: string;
  name: string;
  image_url: string | null;
  artist_id?: string;
  artist_name?: string | null; // Added for group name
  type: 'artist' | 'member';
  isUpcoming?: boolean;
}

export default function BirthdayPromotion({ lang }: { lang: string }) {
  const [stars, setStars] = useState<BirthdayStar[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const t = getT(lang as Language);

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
              {t('birthdayTitle')}
            </h3>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
              {t('birthdaySub')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Calendar Toggle Button */}
          <button 
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:inline">{t('monthlyCalendar')}</span>
            <ChevronRight size={14} className="text-white sm:hidden" />
          </button>
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-1 h-1 rounded-full bg-neon-magenta animate-ping" />
            <span className="text-[10px] font-black text-neon-magenta uppercase tracking-widest">{t('liveCelebration')}</span>
          </div>
        </div>
      </div>
      
      {/* ── Double Voltage Guide Badge ── */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-neon-magenta/10 via-neon-magenta/5 to-transparent border border-neon-magenta/20 flex items-center justify-between group overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-magenta/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-neon-magenta flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,0,255,0.4)]">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-0.5">
              {t('voltagePeakTitle')}
            </h4>
            <p className="text-[11px] font-bold text-neon-magenta/80 uppercase tracking-widest leading-none">
              {t('voltagePeakSub')}
            </p>
          </div>
        </div>
        <div className="px-5 py-2 rounded-xl bg-neon-magenta text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-neon-magenta/20 hidden md:block">
          {t('doubleVoltageActive')}
        </div>
      </motion.div>

      {stars.length === 0 ? (
        <div className="w-full h-40 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center gap-3 bg-white/[0.02] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-neon-magenta/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-600">
            <Cake size={24} />
          </div>
          <div className="text-center relative z-10 font-chakra">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">
              {t('noBirthdaysToday')}
            </p>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-3">
              {t('checkMonthlyLineup')}
            </p>
            <button 
              onClick={() => setIsCalendarOpen(true)} 
              className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-neon-magenta hover:bg-neon-magenta hover:text-white transition-all tracking-[0.2em] font-black uppercase flex items-center gap-2 mx-auto"
            >
              <span>{t('viewMonthlyCalendar')}</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
          {stars.map((star) => {
            const displayName = getLangName(star.name, lang);

            const isUpcoming = star.isUpcoming;
            const badgeText = isUpcoming ? t('upcomingBadge') : t('happyBdayBadge');
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
                      <p className={`text-[8px] font-bold ${textColor} uppercase tracking-widest opacity-80 mt-0.5 truncate`}>
                        {star.type === 'member' && star.artist_name 
                          ? getLangName(star.artist_name, lang) 
                          : t('artists')}
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

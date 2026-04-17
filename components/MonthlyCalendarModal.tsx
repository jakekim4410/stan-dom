'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarDays, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getMonthlyBirthdays } from '@/actions/getMonthlyBirthdays';

interface MonthlyCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
}

export default function MonthlyCalendarModal({ isOpen, onClose, lang }: MonthlyCalendarModalProps) {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getMonthlyBirthdays().then((res) => {
        if (res.success && res.birthdays) {
          setBirthdays(res.birthdays);
        } else {
          setBirthdays([]);
        }
        if (res.currentMonth) setCurrentMonth(res.currentMonth);
        setLoading(false);
      });
    }
  }, [isOpen]);

  const parseName = (nameObjString: string) => {
    try {
      if (nameObjString.startsWith('{')) {
        const obj = JSON.parse(nameObjString);
        return obj[lang] || obj['EN'] || Object.values(obj)[0] || nameObjString;
      }
    } catch {
      // ignore
    }
    return nameObjString;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glassmorphism rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(255,0,255,0.15)] flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-neon-magenta/20 to-transparent flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-magenta/20 blur-[50px] rounded-full" />
              <div className="relative z-10">
                <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                  <CalendarDays className="text-neon-magenta" size={22} />
                  {currentMonth}월 <span className="text-zinc-500 font-chakra font-normal tracking-widest whitespace-nowrap">LINE-UP</span>
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                  STAN.DOM Monthly Birthdays
                </p>
              </div>
              <button
                onClick={onClose}
                className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              {loading ? (
                <div className="h-40 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-neon-magenta" size={32} />
                  <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest animate-pulse">Loading Database...</p>
                </div>
              ) : birthdays.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <span className="text-[10px] uppercase font-black tracking-widest">No birthdays this month</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {birthdays.map((b, idx) => {
                    const day = b.birthday.slice(8, 10);
                    const isTodayLocal = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', day: '2-digit' }).format(new Date()) === day;
                    
                    return (
                      <Link 
                        key={`${b.type}-${b.id}-${idx}`}
                        href={b.type === 'artist' ? `/artist/${b.id}` : `/artist/${b.artist_id}`}
                        onClick={onClose}
                      >
                        <motion.div 
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group ${
                            isTodayLocal 
                              ? 'bg-neon-magenta/10 border-neon-magenta/50 shadow-[0_0_20px_rgba(255,0,255,0.1)]' 
                              : 'bg-white/5 border-white/5 hover:border-white/20'
                          }`}
                        >
                          {/* Day Column */}
                          <div className={`flex flex-col items-center justify-center w-12 shrink-0 ${isTodayLocal ? 'text-neon-magenta' : 'text-zinc-500'}`}>
                            <span className="text-[10px] font-bold uppercase tracking-widest">DAY</span>
                            <span className="text-2xl font-black">{day}</span>
                          </div>

                          {/* Image */}
                          <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 ${isTodayLocal ? 'border-neon-magenta' : 'border-white/10'} bg-zinc-900 flex items-center justify-center`}>
                            {b.image_url ? (
                              <img src={b.image_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-black text-lg text-zinc-700">{parseName(b.name)[0]}</span>
                            )}
                          </div>

                          {/* Name info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-black text-sm uppercase truncate ${isTodayLocal ? 'text-white' : 'text-zinc-300'}`}>
                                {parseName(b.name)}
                              </h4>
                              {isTodayLocal && <Sparkles size={14} className="text-neon-magenta animate-pulse" />}
                            </div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                              {b.type === 'member' 
                                ? (b.artist_name ? parseName(b.artist_name) : 'MEMBER') 
                                : 'SOLO / GROUP'}
                            </span>
                          </div>

                          {/* Action Arrow */}
                          <ChevronRight size={18} className="text-zinc-600 group-hover:text-neon-magenta transition-colors" />
                        </motion.div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-black/60 border-t border-white/5 text-center">
              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Calendar time is based on KST (Asia/Seoul)</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

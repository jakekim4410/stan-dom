'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TerminalSquare, Globe, Navigation, LogIn, User } from 'lucide-react';
import Link from 'next/link';

interface MobileHeaderProps {
  topArtist: { name: string; thumbnail: string } | null;
  mode: 'global' | 'local';
  onToggleMode: () => void;
  lang: string;
  currentUser?: any;
}

export default function MobileHeader({ topArtist, mode, onToggleMode, lang, currentUser }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <TerminalSquare size={18} className="text-neon-lime animate-pulse" />
        <img src="/stan_dom_logo_transparent2.png" alt="STAN.DOM" className="h-6 object-contain" />
      </div>

      <div 
        onClick={onToggleMode}
        className="flex items-center gap-2 bg-white/5 rounded-full pl-1 pr-3 py-1 border border-white/5 active:scale-95 transition-all cursor-pointer"
      >
        <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0">
          {topArtist?.thumbnail ? (
            <img src={topArtist.thumbnail} alt={topArtist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-neon-lime rounded-full animate-ping" />
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter flex items-center gap-1">
            {mode === 'global' ? <Globe size={8} /> : <Navigation size={8} />}
            {mode === 'global' ? (lang === 'KO' ? '글로벌 뱅가드' : 'GLOBAL LEADER') : (lang === 'KO' ? '로컬 유닛' : 'LOCAL LEADER')}
          </span>
          <span className="text-[10px] font-bold text-white tracking-widest truncate max-w-[80px]">
            {topArtist?.name || 'INITIALIZING...'}
          </span>
        </div>
      </div>

      <div className="flex items-center ml-2">
        {currentUser ? (
          <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border-2 border-neon-lime/50 flex items-center justify-center">
            {currentUser.user_metadata?.avatar_url ? (
              <img src={currentUser.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
            ) : (
              <User size={14} className="text-zinc-400" />
            )}
          </Link>
        ) : (
          <Link href="/login" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <LogIn size={14} className="text-neon-lime" />
          </Link>
        )}
      </div>
    </header>
  );
}

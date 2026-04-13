'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { List, Globe, Plus, Search, Languages, TerminalSquare } from 'lucide-react';

import { Language, getT } from '@/constants/i18n';

interface FloatingNavProps {
  activeTab: 'ranking' | 'map';
  onTabChange: (tab: 'ranking' | 'map') => void;
  onAddArtist: () => void;
  onToggleLang: () => void;
  lang: Language;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function FloatingNav({
  activeTab,
  onTabChange,
  onAddArtist,
  onToggleLang,
  lang,
  searchQuery,
  onSearchChange
}: FloatingNavProps) {
  const t = getT(lang);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-4xl">
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glassmorphism rounded-3xl p-2 flex items-center justify-between gap-4 border-neon-lime/20 shadow-[0_0_30px_rgba(55,197,97,0.1)]"
      >
        {/* Logo Section */}
        <div className="flex items-center gap-3 pl-4 pr-6 border-r border-white/10 group cursor-pointer" onClick={() => window.location.reload()}>
           <TerminalSquare size={20} className="text-neon-lime animate-pulse" />
           <span className="text-xl font-black italic tracking-widest hidden sm:inline group-hover:neon-text-lime transition-all">
             STAN<span className="text-white">.</span>DOM
           </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-black/40 rounded-2xl p-1 gap-1 border border-white/5">
           <button 
             onClick={() => onTabChange('ranking')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${activeTab === 'ranking' ? 'bg-neon-lime text-black shadow-[0_0_15px_rgba(55,197,97,0.4)]' : 'text-zinc-500 hover:text-white'}`}
           >
             <List size={18} />
             <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Grid System</span>
           </button>
           <button 
             onClick={() => onTabChange('map')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${activeTab === 'map' ? 'bg-neon-lime text-black shadow-[0_0_15px_rgba(55,197,97,0.4)]' : 'text-zinc-500 hover:text-white'}`}
           >
             <Globe size={18} />
             <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Global Scan</span>
           </button>
        </div>

        {/* Search Cluster */}
        <div className="hidden lg:flex flex-1 items-center bg-white/5 rounded-2xl px-4 py-2 gap-3 border border-white/5 focus-within:border-neon-lime/30 transition-all">
           <Search size={14} className="text-zinc-500" />
           <input 
             type="text" 
             placeholder={t('scanArtist')}
             value={searchQuery}
             onChange={(e) => onSearchChange(e.target.value)}
             className="bg-transparent border-none outline-none text-[10px] font-bold tracking-widest text-white placeholder:text-zinc-700 w-full"
           />
        </div>

        {/* Action Node */}
        <div className="flex items-center gap-2 pr-2">
           <button 
             onClick={onToggleLang}
             className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-neon-cyan/50 hover:bg-white/5 transition-all text-zinc-500 hover:text-white"
           >
             <Languages size={18} />
           </button>
           <button 
             onClick={onAddArtist}
             className="flex items-center gap-2 bg-neon-magenta text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(255,0,255,0.3)] hover:scale-105 active:scale-95 transition-all"
           >
             <Plus size={18} />
             <span className="hidden sm:inline">{t('nominate')}</span>
           </button>
        </div>
      </motion.nav>
    </div>
  );
}

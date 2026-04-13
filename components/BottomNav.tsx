'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Globe, User } from 'lucide-react';

import { Language, getT } from '@/constants/i18n';

interface BottomNavProps {
  activeTab: 'ranking' | 'map' | 'activity';
  onTabChange: (tab: 'ranking' | 'map' | 'activity') => void;
  lang: Language;
}

export default function BottomNav({ activeTab, onTabChange, lang }: BottomNavProps) {
  const t = getT(lang);
  const tabs = [
    { id: 'ranking', icon: Trophy, label: t('ranking') },
    { id: 'map', icon: Globe, label: t('map') },
    { id: 'activity', icon: User, label: t('activity') },
  ] as const;


  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-black/80 backdrop-blur-2xl border-t border-white/5 px-6 pb-8 pt-3 flex justify-between items-center">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative flex flex-col items-center gap-1 group"
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-neon-cyan text-black shadow-[0_0_20px_rgba(0,243,255,0.4)]' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-black tracking-tighter transition-all ${isActive ? 'text-white' : 'text-zinc-600'}`}>
              {tab.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="activeTab"
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-neon-cyan rounded-full shadow-[0_0_10px_#00f3ff]"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

'use client';

import React from 'react';
import { Language } from '@/constants/i18n';

interface LanguageSwitcherProps {
  lang: Language;
  onSelect: (lang: Language) => void;
}

export default function LanguageSwitcher({ lang, onSelect }: LanguageSwitcherProps) {
  const languages: Language[] = ['EN', 'KO', 'ES'];

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
      {languages.map((l, idx) => (
        <React.Fragment key={l}>
          <button
            onClick={() => onSelect(l)}
            className={`text-[10px] font-black tracking-widest transition-all hover:scale-105 ${
              lang === l ? 'text-[#37C561] drop-shadow-[0_0_8px_rgba(55,197,97,0.5)]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {l}
          </button>
          {idx < languages.length - 1 && (
            <span className="text-zinc-800 text-[10px] font-black pointer-events-none">/</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
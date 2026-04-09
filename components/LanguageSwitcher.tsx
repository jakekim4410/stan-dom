'use client';

import { Language } from '@/constants/i18n';

interface LanguageSwitcherProps {
  lang: Language;
  onToggle: () => void;
}

export default function LanguageSwitcher({ lang, onToggle }: LanguageSwitcherProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all group"
      title="Toggle Language"
    >
      <span className={`text-[10px] font-black tracking-widest transition-colors ${lang === 'EN' ? 'text-cyan-400' : 'text-zinc-500'}`}>
        EN
      </span>
      <span className="text-zinc-600 text-[10px] font-black">/</span>
      <span className={`text-[10px] font-black tracking-widest transition-colors ${lang === 'KO' ? 'text-cyan-400' : 'text-zinc-500'}`}>
        KO
      </span>
    </button>
  );
}

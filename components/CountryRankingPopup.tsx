'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Medal } from 'lucide-react';
import { Language, getT } from '@/constants/i18n';
import { getLangName } from '@/utils/localization';

interface CountryRankingPopupProps {
  countryCode: string;
  countryName: string;
  artists: { name: string; votes: number; rank: number }[];
  onClose: () => void;
  lang: Language;
}

const COUNTRY_FLAGS: Record<string, string> = {
  KR: '🇰🇷', US: '🇺🇸', JP: '🇯🇵', CN: '🇨🇳', BR: '🇧🇷',
  FR: '🇫🇷', GB: '🇬🇧', DE: '🇩🇪', IN: '🇮🇳', ID: '🇮🇩',
  PH: '🇵🇭', TH: '🇹🇭', VN: '🇻🇳', MX: '🇲🇽', UN: '🌐',
};

const RANK_COLORS = [
  'from-yellow-400/20 to-yellow-600/5 border-yellow-400/30',
  'from-zinc-300/20 to-zinc-400/5 border-zinc-300/30',
  'from-amber-600/20 to-amber-700/5 border-amber-600/30',
];

const RANK_ICONS = [
  <Trophy key="1" size={16} className="text-yellow-400" />,
  <Medal key="2" size={16} className="text-zinc-300" />,
  <Medal key="3" size={16} className="text-amber-600" />,
];

export default function CountryRankingPopup({
  countryCode, countryName, artists, onClose, lang
}: CountryRankingPopupProps) {
  const t = getT(lang);
  const flag = COUNTRY_FLAGS[countryCode] ?? '🌐';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed inset-x-4 bottom-20 md:bottom-auto md:absolute md:top-6 md:right-6 md:inset-x-auto z-50 md:w-72"
      >
        <div className="glassmorphism rounded-[1.5rem] border border-white/10 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.1)]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{flag}</span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">{t('countryTop3')}</p>
                <h3 className="font-black text-base tracking-tight leading-none">{countryName}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50 transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* Artist List */}
          <div className="p-4 space-y-3">
            {artists.length === 0 ? (
              <p className="text-zinc-500 text-xs font-bold text-center py-4">{t('noCountryData')}</p>
            ) : (
              artists.map((artist, index) => (
                <motion.div
                  key={artist.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r border ${RANK_COLORS[index]}`}
                >
                  <div className="flex items-center justify-center w-6">
                    {RANK_ICONS[index]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm tracking-tight truncate">{getLangName(artist.name, lang)}</p>
                    <p className="text-[10px] text-zinc-500 font-bold">
                      {artist.votes.toLocaleString()} {t('countryVotes')}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Neon Accent Footer */}
          <div className="px-5 pb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-[#37C561]/30 to-transparent" />
            <p className="text-center text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-3">
              {countryCode} • STAN.DOM
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

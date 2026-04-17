'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, ShieldCheck, Zap, User, UserPlus, Check, Navigation, Cake } from 'lucide-react';
import { COUNTRY_DATA, Country } from '@/constants/countryData';
import { Language, getT } from '@/constants/i18n';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onComplete: (country: Country) => void;
}

export default function OnboardingModal({ isOpen, onClose, lang, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const t = getT(lang);

  const filteredCountries = useMemo(() => {
    return COUNTRY_DATA.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.nameKo.includes(searchQuery) || 
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);
  
  const handleAutoDetect = () => {
    try {
      const locale = navigator.language || navigator.languages?.[0];
      if (locale?.includes('-')) {
        const [, code] = locale.split('-');
        const found = COUNTRY_DATA.find(c => c.code === code.toUpperCase());
        if (found) { 
          setSelectedCountry(found); 
          return; 
        }
      } else {
        const found = COUNTRY_DATA.find(c => c.code === locale.toUpperCase());
        if (found) { setSelectedCountry(found); return; }
      }
    } catch (e) { }
    
    // Fallback or Alert
    const failMsgs = {
      KO: '국가 자동 감지에 실패했습니다. 수동으로 선택해주세요.',
      EN: 'Could not auto-detect region. Please select manually.',
      ES: 'No se pudo detectar la región. Por favor seleccione manualmente.'
    };
    alert(failMsgs[lang] || failMsgs.EN);
  };

  const handleNext = () => {
    if (step === 1 && selectedCountry) {
      setStep(2);
    } else if (step === 2) {
      if (selectedCountry) {
        onComplete(selectedCountry);
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl bg-zinc-950 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="px-8 pt-10 pb-6 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Globe size={18} className="text-emerald-400" />
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">
                  {t('welcomeToStandom')}
                </span>
             </div>
             <h2 className="text-3xl font-black tracking-tighter text-white">
                {step === 1 ? t('onboardingStep1Title') : t('onboardingStep2Title')}
             </h2>
             <p className="text-zinc-500 text-xs font-medium mt-2 leading-relaxed">
                {step === 1 ? t('onboardingStep1Sub') : t('onboardingStep2Sub')}
             </p>
          </div>

          {/* Content */}
          <div className="p-8 min-h-[400px]">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="flex gap-2">
                  <div className="relative group flex-1">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                      type="text"
                      placeholder={t('searchRegion')}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all text-white"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleAutoDetect}
                    className="flex flex-col items-center justify-center px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all group/auto"
                    title={t('autoDetectIP')}
                  >
                    <Navigation size={20} className="group-hover/auto:scale-110 transition-transform" />
                    <span className="text-[7px] font-black mt-1 uppercase tracking-tighter whitespace-nowrap opacity-60 group-hover/auto:opacity-100">AUTO</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setSelectedCountry(c)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                        selectedCountry?.code === c.code
                          ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                          : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="text-2xl">{c.flag}</span>
                      <span className="text-xs font-black uppercase tracking-tight truncate">
                         {lang === 'KO' ? c.nameKo : c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <UserPlus size={24} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-lg tracking-tight mb-1">{t('ruleMember')}</h4>
                      <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                        {t('ruleMemberSub')}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 flex items-start gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0">
                      <User size={24} className="text-zinc-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-zinc-300 text-lg tracking-tight mb-1">{t('ruleGuest')}</h4>
                      <p className="text-zinc-600 text-xs font-medium leading-relaxed">
                        {t('ruleGuestSub')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-start gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0">
                      <Zap size={24} className="text-yellow-400" />
                    </div>
                    <div>
                        <h4 className="font-black text-white text-lg tracking-tight mb-1">{t('voltage')}</h4>
                        <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                            {t('voltageSub')}
                        </p>
                    </div>
                  </div>

                  {/* Double Voltage Bonus Card */}
                  <div className="p-6 rounded-3xl bg-neon-magenta/10 border border-neon-magenta/30 flex items-start gap-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-neon-magenta/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="w-12 h-12 rounded-2xl bg-neon-magenta flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,0,255,0.3)]">
                      <Cake size={24} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-black text-white text-lg tracking-tight mb-1">
                          {lang === 'KO' ? '생일 2배 보너스' : 'Birthday x2 Bonus'}
                        </h4>
                        <p className="text-neon-magenta/80 text-xs font-bold leading-relaxed uppercase tracking-tight">
                            {lang === 'KO' ? '오늘의 생일 스타에게 투표하면 볼티지가 2배로 쌓입니다!' : 'Voting for today\'s birthday stars grants 2x Voltage points!'}
                        </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Footer */}
          <div className="p-8 pt-0 flex flex-col sm:flex-row gap-3 sm:gap-4">
               {step === 2 && (
                   <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all sm:order-1"
                   >
                     {lang === 'KO' ? '이전으로' : 'Back'}
                   </button>
               )}
               <button
                  disabled={step === 1 && !selectedCountry}
                  onClick={handleNext}
                  className={`flex-[2] py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-3 sm:order-2 ${
                    step === 1 && !selectedCountry
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                  }`}
               >
                  <span className="break-keep">{step === 1 ? t('continue') : t('startSyncing')}</span>
                  {selectedCountry && <span className="text-xl shrink-0">{selectedCountry.flag}</span>}
               </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Download, Gift, Sparkles } from 'lucide-react';
import { claimAdReward } from '@/actions/claimAdReward';
import { Language } from '@/constants/i18n';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // 추후 앱 환경에서 사용될 수 있으므로 남겨둡니다.
  lang?: Language;
}

const localizedText: Record<Language, Record<string, string>> = {
  EN: {
    title: 'Get Free Voltage!',
    description: 'Want to vote more for your bias? Watch ads and earn +3 Voltage exclusive to our mobile app.',
    processing: 'Processing reward...',
    watchAd: 'Watch Ad & Get Voltage',
    alertAdEarned: 'Ad completed! +3 Voltage added ⚡',
    alertAdFailed: 'Failed to reward. Please try again.',
    alertAppOnly: 'Watching ads is only available in the mobile app!',
    alertPlayStoreSoon: 'Play Store version is preparing for release!',
    comingSoon: 'Coming soon to mobile stores',
  },
  KO: {
    title: '무료 볼티지 충전!',
    description: '최애 아티스트에게 더 많이 투표하고 싶으신가요? 모바일 앱에서 광고를 보고 +3 볼티지를 무료로 충전하세요!',
    processing: '보상 지급 중...',
    watchAd: '광고 보고 볼티지 받기',
    alertAdEarned: '광고 시청 완료! +3 볼티지가 지급되었습니다 ⚡',
    alertAdFailed: '보상 지급에 실패했습니다. 다시 시도해주세요.',
    alertAppOnly: '광고 시청은 스탠덤 모바일 앱에서만 가능합니다!',
    alertPlayStoreSoon: '플레이스토어 출시 준비 중입니다!',
    comingSoon: '모바일 스토어 출시 예정',
  },
  ES: {
    title: '¡Carga Voltaje Gratis!',
    description: '¿Quieres votar más por tu favorito? Mira anuncios y gana +3 Voltaje exclusivo en nuestra app móvil.',
    processing: 'Procesando recompensa...',
    watchAd: 'Ver anuncio para obtener Voltaje',
    alertAdEarned: '¡Anuncio completado! +3 Voltajes añadidos ⚡',
    alertAdFailed: 'Error al otorgar recompensa. Inténtalo de nuevo.',
    alertAppOnly: '¡Ver anuncios solo está disponible en la app móvil!',
    alertPlayStoreSoon: '¡La versión de Play Store se está preparando para el lanzamiento!',
    comingSoon: 'Próximamente en tiendas móviles',
  }
};

export default function RewardedAdModal({ isOpen, onClose, onSuccess, lang = 'KO' }: RewardedAdModalProps) {
  const [isAppEnv, setIsAppEnv] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const text = localizedText[lang] || localizedText.KO;

  useEffect(() => {
    // 앱 환경(WebView)인지 확인
    if (typeof window !== 'undefined') {
      const isApp = 
        window.navigator.userAgent.includes('STAN_DOM_APP') || 
        !!(window as any).ReactNativeWebView || 
        !!(window as any).isAppEnv || 
        !!(window as any).STAN_DOM_APP;
      setIsAppEnv(isApp);

      // 네이티브 앱에서 보내는 '광고 시청 완료' 이벤트 수신
      const handleAdEarned = async () => {
        setIsProcessing(true);
        const res = await claimAdReward();
        setIsProcessing(false);

        if (res.success) {
          alert(text.alertAdEarned);
          if (onSuccess) onSuccess();
          onClose();
        } else {
          alert(res.error || text.alertAdFailed);
        }
      };

      window.addEventListener('adRewardEarned', handleAdEarned);
      return () => window.removeEventListener('adRewardEarned', handleAdEarned);
    }
  }, [onClose, onSuccess, text]);

  const handleWatchAd = () => {
    if (isAppEnv) {
      // 네이티브 앱(Expo)으로 광고 띄워달라고 메시지 전송
      (window as any).ReactNativeWebView.postMessage('SHOW_REWARDED_AD');
    } else {
      alert(text.alertAppOnly);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onClose}
              className="p-2 bg-black/50 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Hero Section */}
          <div className="relative pt-12 pb-8 px-6 text-center bg-gradient-to-b from-[var(--neon-lime)]/10 to-transparent">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            
            <motion.div 
              animate={{ y: [0, -5, 0] }} 
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="relative w-20 h-20 mx-auto mb-4 bg-zinc-800 rounded-2xl border border-white/10 shadow-xl flex items-center justify-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--neon-lime)]/20 to-transparent"></div>
              <Smartphone size={40} className="text-[var(--neon-lime)]" />
              <div className="absolute -top-1 -right-1">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--neon-lime)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[var(--neon-lime)]"></span>
                </span>
              </div>
            </motion.div>

            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
              {text.title}
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed px-4">
              {lang === 'KO' ? (
                <>
                  최애 아티스트에게 더 많이 투표하고 싶으신가요? <br/>
                  모바일 앱에서 광고를 보고 <span className="text-[var(--neon-lime)] font-bold">+3 볼티지</span>를 무료로 충전하세요!
                </>
              ) : lang === 'ES' ? (
                <>
                  ¿Quieres votar más por tu favorito? <br/>
                  Mira anuncios y gana <span className="text-[var(--neon-lime)] font-bold">+3 Voltaje</span> <br/>
                  exclusivo en nuestra app móvil.
                </>
              ) : (
                <>
                  Want to vote more for your bias? <br/>
                  Watch ads and earn <span className="text-[var(--neon-lime)] font-bold">+3 Voltage</span> <br/>
                  exclusive to our mobile app.
                </>
              )}
            </p>
          </div>

          {/* Action Section */}
          <div className="p-6 pt-0 flex flex-col gap-3">
            <button
              onClick={handleWatchAd}
              disabled={isProcessing}
              className="w-full relative group overflow-hidden rounded-xl bg-white text-black p-4 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              {isProcessing ? (
                <span className="font-bold">{text.processing}</span>
              ) : isAppEnv ? (
                <>
                  <Gift size={20} className="font-bold text-[var(--neon-lime)] animate-bounce" />
                  <span className="font-black text-base md:text-lg">{text.watchAd}</span>
                </>
              ) : (
                <>
                  <Download size={20} className="font-bold animate-bounce" />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-bold text-black/60 uppercase">Download on the</span>
                    <span className="font-black text-lg">App Store</span>
                  </div>
                </>
              )}
            </button>

            {!isAppEnv && (
              <button
                onClick={() => alert(text.alertPlayStoreSoon)}
                className="w-full relative group overflow-hidden rounded-xl bg-[#000000] border border-white/10 text-white p-4 flex items-center justify-center gap-3 hover:bg-zinc-800 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Download size={20} className="animate-bounce" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] font-bold text-white/60 uppercase">GET IT ON</span>
                  <span className="font-black text-lg">Google Play</span>
                </div>
              </button>
            )}
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-zinc-500">
              <Sparkles size={14} className="text-[var(--neon-lime)]/70 animate-pulse" />
              <span>{text.comingSoon}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


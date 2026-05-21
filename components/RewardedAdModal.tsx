'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Download, Gift, Sparkles } from 'lucide-react';
import { claimAdReward } from '@/actions/claimAdReward';
import { getRemainingVotes } from '@/actions/getRemainingVotes';
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
    description: 'Free Voltage charging is exclusively available on the STAN.DOM Android mobile app! Download the app and watch ads to earn +3 Voltage for free.',
    processing: 'Processing reward...',
    watchAd: 'Watch Ad & Get Voltage',
    alertAdEarned: 'Ad completed! +3 Voltage added ⚡',
    alertAdFailed: 'Failed to reward. Please try again.',
    alertAppOnly: 'Watching ads is only available in the mobile app!',
    alertPlayStoreSoon: 'The app is currently preparing for official release! (Only available to testers at the moment)',
    comingSoon: 'Coming soon to mobile stores',
    limitReached: 'Daily Limit Reached (10/10)',
    adViewsCount: 'Today\'s Ads: {count} / 10',
    loadingAd: 'Loading ad...',
    retryAd: 'Retry loading ad',
  },
  KO: {
    title: '무료 볼티지 충전!',
    description: '무료 볼티지 충전은 스탠덤 안드로이드 모바일 앱에서만 가능합니다! 앱을 다운로드하고 광고를 시청하여 +3 볼티지를 무료로 충전하세요!',
    processing: '보상 지급 중...',
    watchAd: '광고 보고 볼티지 받기',
    alertAdEarned: '광고 시청 완료! +3 볼티지가 지급되었습니다 ⚡',
    alertAdFailed: '보상 지급에 실패했습니다. 다시 시도해주세요.',
    alertAppOnly: '광고 시청은 스탠덤 안드로이드 앱에서만 가능합니다!',
    alertPlayStoreSoon: '구글 플레이 스토어 심사 중으로, 정식 출시 예정입니다! (현재는 등록된 테스터만 다운로드 가능합니다.)',
    comingSoon: '모바일 스토어 출시 예정',
    limitReached: '오늘의 광고 한도 완료 (10/10)',
    adViewsCount: '오늘의 참여 횟수: {count} / 10',
    loadingAd: '광고 불러오는 중...',
    retryAd: '광고 다시 불러오기',
  },
  ES: {
    title: '¡Carga Voltaje Gratis!',
    description: '¡La carga de Voltaje gratis solo está disponible en la app móvil de Android de STAN.DOM! Descarga la app y mira anuncios para ganar +3 Voltaje gratis.',
    processing: 'Procesando recompensa...',
    watchAd: 'Ver anuncio para obtener Voltaje',
    alertAdEarned: '¡Anuncio completado! +3 Voltajes añadidos ⚡',
    alertAdFailed: 'Error al otorgar recompensa. Inténtalo de nuevo.',
    alertAppOnly: '¡Ver anuncios solo está disponible en la app móvil!',
    alertPlayStoreSoon: '¡La aplicación se está preparando para su lanzamiento oficial! (Actualmente solo disponible para evaluadores)',
    comingSoon: 'Próximamente en tiendas móviles',
    limitReached: 'Límite diario alcanzado (10/10)',
    adViewsCount: 'Anuncios de hoy: {count} / 10',
    loadingAd: 'Cargando anuncio...',
    retryAd: 'Reintentar cargar anuncio',
  }
};

const getAppVersionCode = (): number => {
  if (typeof window === 'undefined') return 0;
  const versionStr = (window as any).STAN_DOM_APP_VERSION;
  if (!versionStr) return 0;
  
  const match = versionStr.match(/\(v(\d+)\)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
};

export default function RewardedAdModal({ isOpen, onClose, onSuccess, lang = 'KO' }: RewardedAdModalProps) {
  const [isAppEnv, setIsAppEnv] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adViewsToday, setAdViewsToday] = useState<number>(0);
  const [isLoadingViews, setIsLoadingViews] = useState(true);
  const [adReady, setAdReady] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const text = localizedText[lang] || localizedText.KO;

  // 1. 광고 제한 횟수 가져오기
  useEffect(() => {
    if (isOpen) {
      const fetchViews = async () => {
        setIsLoadingViews(true);
        try {
          const res = await getRemainingVotes();
          if (res.success) {
            setAdViewsToday(res.adViewsToday || 0);
          }
        } catch (e) {
          console.error('Error fetching ad views:', e);
        } finally {
          setIsLoadingViews(false);
        }
      };
      fetchViews();
    }
  }, [isOpen]);

  // 2. 모달이 열리고 앱 환경일 때 광고 프리로드 요청
  useEffect(() => {
    if (isOpen && isAppEnv && adViewsToday < 10) {
      const isModernApp = getAppVersionCode() >= 13;
      if (isModernApp) {
        setIsAdLoading(true);
        setAdReady(false);
        (window as any).ReactNativeWebView?.postMessage('PRELOAD_AD');
      } else {
        // 구버전 앱(v1.0.4(v12) 이하)은 PRELOAD_AD 및 adLoadedStatus 수신을 지원하지 않으므로,
        // 로딩바 없이 즉시 광고 보기 버튼을 활성화합니다.
        setIsAdLoading(false);
        setAdReady(true);
      }
    }
  }, [isOpen, isAppEnv, adViewsToday]);

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
          setAdViewsToday(prev => prev + 1);
          setAdReady(false); // 보상 완료 후 상태 초기화
          if (onSuccess) onSuccess();
          onClose();
        } else {
          alert(res.error || text.alertAdFailed);
        }
      };

      // 네이티브 앱에서 보내는 광고 로딩 상태 수신
      const handleAdStatus = (e: any) => {
        const loaded = e.detail?.loaded;
        setAdReady(loaded);
        setIsAdLoading(false);
      };

      window.addEventListener('adRewardEarned', handleAdEarned);
      window.addEventListener('adLoadedStatus', handleAdStatus);
      return () => {
        window.removeEventListener('adRewardEarned', handleAdEarned);
        window.removeEventListener('adLoadedStatus', handleAdStatus);
      };
    }
  }, [onClose, onSuccess, text]);

  const handleWatchAd = () => {
    if (isAppEnv) {
      if (adViewsToday >= 10) {
        alert(text.limitReached);
        return;
      }

      const isModernApp = getAppVersionCode() >= 13;
      if (!isModernApp) {
        // 구버전 앱은 광고 호출 메시지를 즉시 전송
        (window as any).ReactNativeWebView?.postMessage('SHOW_REWARDED_AD');
        return;
      }

      if (adReady) {
        // 광고가 이미 로드된 상태이므로 바로 송출 요청
        (window as any).ReactNativeWebView.postMessage('SHOW_REWARDED_AD');
      } else if (!isAdLoading) {
        // 광고 로드에 실패했거나 아직 완료되지 않은 상태라면 다시 로드 시도
        setIsAdLoading(true);
        (window as any).ReactNativeWebView.postMessage('PRELOAD_AD');
      }
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
                  무료 볼티지 충전은 <span className="text-[var(--neon-lime)] font-bold">안드로이드 모바일 앱</span>에서만 가능합니다! <br/>
                  앱을 다운로드하고 광고를 시청하여 <span className="text-[var(--neon-lime)] font-bold">+3 볼티지</span>를 무료로 충전하세요!
                </>
              ) : lang === 'ES' ? (
                <>
                  ¡La carga de Voltaje gratis solo está disponible en la <span className="text-[var(--neon-lime)] font-bold">app de Android</span>! <br/>
                  Descarga la app y mira anuncios para ganar <span className="text-[var(--neon-lime)] font-bold">+3 Voltaje</span> gratis.
                </>
              ) : (
                <>
                  Free Voltage charging is exclusively available on the <span className="text-[var(--neon-lime)] font-bold">Android app</span>! <br/>
                  Download the app and watch ads to earn <span className="text-[var(--neon-lime)] font-bold">+3 Voltage</span> for free.
                </>
              )}
            </p>

            {/* Ad Views Counter (Only if in app environment and count is loaded) */}
            {isAppEnv && !isLoadingViews && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-400">
                <Sparkles size={12} className="text-[var(--neon-lime)]" />
                <span>
                  {text.adViewsCount.replace('{count}', String(adViewsToday))}
                </span>
              </div>
            )}
          </div>

          {/* Action Section */}
          <div className="p-6 pt-0 flex flex-col gap-3">
            {isAppEnv ? (
              <button
                onClick={handleWatchAd}
                disabled={isProcessing || isLoadingViews || adViewsToday >= 10 || isAdLoading}
                className={`w-full relative group overflow-hidden rounded-xl p-4 flex items-center justify-center gap-3 transition-all ${
                  adViewsToday >= 10
                    ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
                    : isProcessing || isLoadingViews
                      ? 'bg-zinc-800 text-zinc-400 border border-white/5 cursor-not-allowed'
                      : isAdLoading
                        ? 'bg-zinc-800 text-zinc-400 border border-white/5 cursor-not-allowed animate-pulse'
                        : !adReady
                          ? 'bg-zinc-800 text-white border border-white/10 hover:bg-zinc-700 active:scale-[0.98]'
                          : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                }`}
              >
                {adViewsToday < 10 && adReady && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                )}
                {isProcessing ? (
                  <span className="font-bold">{text.processing}</span>
                ) : isLoadingViews ? (
                  <span className="font-bold">Checking limit...</span>
                ) : adViewsToday >= 10 ? (
                  <span className="font-black text-base md:text-lg">{text.limitReached}</span>
                ) : isAdLoading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-zinc-400 rounded-full"></span>
                    <span className="font-bold">{text.loadingAd}</span>
                  </>
                ) : !adReady ? (
                  <span className="font-black text-base md:text-lg">{text.retryAd}</span>
                ) : (
                  <>
                    <Gift size={20} className="font-bold text-[var(--neon-lime)] animate-bounce" />
                    <span className="font-black text-base md:text-lg">{text.watchAd}</span>
                  </>
                )}
              </button>
            ) : (
              <a
                href="https://play.google.com/store/apps/details?id=com.stan.dom"
                target="_blank"
                rel="noopener noreferrer"
                data-bypass-exit="true"
                onClick={(e) => {
                  e.preventDefault();
                  alert(text.alertPlayStoreSoon);
                  window.open("https://play.google.com/store/apps/details?id=com.stan.dom", "_blank");
                }}
                className="w-full relative group overflow-hidden rounded-xl bg-[#000000] border border-white/10 text-white p-4 flex items-center justify-center gap-3 hover:bg-zinc-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                <Download size={24} className="animate-bounce" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] font-bold text-white/60 uppercase">GET IT ON</span>
                  <span className="font-black text-xl tracking-tight">Google Play</span>
                </div>
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


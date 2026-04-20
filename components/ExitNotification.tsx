'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language, getT } from '@/constants/i18n';
import { Zap, LogOut } from 'lucide-react';

interface ExitNotificationProps {
  lang: Language;
}

export default function ExitNotification({ lang }: ExitNotificationProps) {
  const [showModal, setShowModal] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const t = getT(lang);

  // === beforeunload: 브라우저 탭 닫기 / 새로고침 / 주소창 이동 ===
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 표준 방식: returnValue 설정 시 브라우저 기본 종료 확인 다이얼로그 표시
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // === 외부 링크 클릭 감지: 사이트를 완전히 벗어나는 경우 커스텀 모달 표시 ===
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href) return;

      // 내부 링크, 앵커, 핸들러가 없는 경우 무시
      const isExternal =
        href.startsWith('http') &&
        !href.includes(window.location.hostname);

      if (isExternal) {
        e.preventDefault();
        e.stopPropagation();
        setPendingHref(href);
        setShowModal(true);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  // === visibilitychange: 사용자가 다른 탭으로 이동하거나 앱을 최소화할 때 ===
  // (모바일 환경에서 앱 종료 감지에 유용)
  useEffect(() => {
    let lastHidden: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastHidden = Date.now();
      }
    };

    const handlePageHide = () => {
      // pagehide는 실제 페이지 떠남 시 발생 (모바일 브라우저 포함)
      // 여기서는 별도 처리 없음 (beforeunload로 충분)
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const handleStay = useCallback(() => {
    setPendingHref(null);
    setShowModal(false);
  }, []);

  const handleLeave = useCallback(() => {
    if (pendingHref) {
      window.open(pendingHref, '_blank', 'noopener,noreferrer');
    }
    setPendingHref(null);
    setShowModal(false);
  }, [pendingHref]);

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={handleStay}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(8,10,18,0.98) 0%, rgba(15,18,28,0.98) 100%)',
              boxShadow: '0 0 60px rgba(55,197,97,0.15), 0 25px 60px rgba(0,0,0,0.8)',
            }}
          >
            {/* Top accent line */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#37C561] to-transparent" />

            <div className="p-8 flex flex-col items-center text-center gap-6">
              {/* Icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-[#37C561]/20 rounded-full blur-2xl scale-150 animate-pulse" />
                <div className="relative w-20 h-20 rounded-[1.5rem] bg-[#37C561]/10 border border-[#37C561]/30 flex items-center justify-center shadow-[0_0_30px_rgba(55,197,97,0.2)]">
                  <LogOut size={36} className="text-[#37C561]" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tighter text-white">
                  {t('exitTitle')}
                </h2>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                  {t('exitMessage')}
                </p>
              </div>

              {/* Voltage reminder */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#37C561]/10 border border-[#37C561]/20">
                <Zap size={12} className="text-[#37C561] fill-current" />
                <span className="text-[10px] font-black text-[#37C561] uppercase tracking-widest">
                  {lang === 'KO'
                    ? '지금 투표로 볼티지를 충전하세요'
                    : lang === 'ES'
                    ? '¡Carga voltaje votando ahora!'
                    : 'Charge VOLTAGE by voting now'}
                </span>
                <Zap size={12} className="text-[#37C561] fill-current" />
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleStay}
                  className="w-full py-4 rounded-2xl bg-[#37C561] text-black font-black text-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#37C561]/30"
                >
                  {t('exitStay')}
                </button>
                <button
                  onClick={handleLeave}
                  className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 font-bold text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white active:scale-95 transition-all"
                >
                  {t('exitLeave')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

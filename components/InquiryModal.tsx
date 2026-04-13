'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Send, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { Language, getT } from '@/constants/i18n';
import { addInquiry } from '@/actions/inquiry';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export default function InquiryModal({ isOpen, onClose, lang }: InquiryModalProps) {
  const t = getT(lang);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    const result = await addInquiry(content);
    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setContent('');
        onClose();
      }, 2000);
    } else {
      alert('Error: ' + result.error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          // 아래 className에서 max-h와 overflow-y-auto를 추가했습니다.
          className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-y-auto max-h-[90vh] shadow-2xl scrollbar-hide"
        >
          <div className="scanner-line opacity-10" />

          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/20">
                  <MessageSquare className="text-neon-cyan" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight">{t('inquiryTitle')}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{t('directTransmission')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-12 flex flex-col items-center text-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-2">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <h4 className="text-lg font-black italic text-emerald-500 uppercase tracking-tight">{t('inquirySuccess')}</h4>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{t('networkLogUpdated')}</p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    autoFocus
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('inquiryPlaceholder')}
                    className="w-full h-40 bg-white/5 border border-white/10 rounded-3xl p-6 text-sm font-medium text-white placeholder:text-zinc-700 outline-none focus:border-neon-cyan/50 transition-all resize-none leading-relaxed"
                  />
                  <div className="absolute bottom-4 right-6 text-[10px] font-black text-zinc-700 tracking-widest">
                    {content.length} / 1000
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex gap-4">
                  <Mail size={16} className="text-zinc-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-zinc-500 leading-relaxed uppercase tracking-tight">
                    {t('supportTeamNotice')}
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest text-zinc-600 hover:text-white transition-all"
                  >
                    {t('cancel')}

                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || submitting}
                    className="flex-[2] py-4 rounded-2xl bg-neon-cyan text-black font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <Send size={14} />
                        {t('sendInquiry')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

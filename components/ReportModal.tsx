'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, AlertTriangle, ImageOff, UserX, Copy, HelpCircle, Loader2 } from 'lucide-react';
import { reportArtistData } from '@/actions/reportArtist';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  artistName: string;
  onSuccess: () => void;
  lang: Language;
}

import { Language, getT } from '@/constants/i18n';

export default function ReportModal({ isOpen, onClose, artistId, artistName, onSuccess, lang }: ReportModalProps) {
  const t = getT(lang);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const REASONS = [
    { code: 'INAPPROPRIATE', label: t('reportReason_INAPPROPRIATE'), icon: ImageOff, color: 'text-red-500' },
    { code: 'WRONG_ARTIST', label: t('reportReason_WRONG_ARTIST'), icon: UserX, color: 'text-orange-500' },
    { code: 'LOW_QUALITY', label: t('reportReason_LOW_QUALITY'), icon: AlertTriangle, color: 'text-yellow-500' },
    { code: 'DUPLICATE', label: t('reportReason_DUPLICATE'), icon: Copy, color: 'text-blue-500' },
    { code: 'OTHER', label: t('reportReason_OTHER'), icon: HelpCircle, color: 'text-zinc-400' },
  ];
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    
    try {
      const result = await reportArtistData(artistId, selectedReason, description);
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert(result.error || t('reportFailed'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md glassmorphism rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="scanner-line opacity-5" />
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                <Flag className="text-red-500" size={18} />
                {t('reportTitle')}: <span className="text-red-500">{artistName}</span>
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-loose">
                {t('reportSub')}
              </p>

              <div className="grid gap-2">
                {REASONS.map((reason) => (
                  <button
                    key={reason.code}
                    onClick={() => setSelectedReason(reason.code)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                      selectedReason === reason.code 
                        ? 'bg-red-500/10 border-red-500/50' 
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <reason.icon size={18} className={reason.color} />
                    <span className={`text-[11px] font-black uppercase tracking-tight ${selectedReason === reason.code ? 'text-white' : 'text-zinc-400'}`}>
                      {reason.label}
                    </span>
                  </button>
                ))}
              </div>

              {selectedReason === 'OTHER' && (
                <textarea
                  placeholder={t('reportDescription')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white placeholder:text-zinc-800 outline-none focus:border-red-500/30 min-h-[100px]"
                />
              )}
            </div>

            <div className="p-6 bg-black/20 border-t border-white/5 flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
              >
                {t('abort')}
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!selectedReason || submitting}
                className="flex-2 py-4 px-8 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : t('transmitReport')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

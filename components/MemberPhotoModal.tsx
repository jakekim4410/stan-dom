'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Search,
  ZoomIn
} from 'lucide-react';
import { updateMemberPhoto } from '@/actions/updateMemberPhoto';
import { searchForArtists } from '@/actions/searchDeezer';
import { DeezerArtist } from '@/lib/deezer';
import { Language, getT } from '@/constants/i18n';
import { getLangName } from '@/utils/localization';

interface MemberPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  artistId: string;
  artistName: string;
  memberName: string;
  currentImageUrl: string | null;
  onSuccess: (newUrl: string) => void;
  lang: Language;
}

export default function MemberPhotoModal({
  isOpen,
  onClose,
  memberId,
  artistId,
  artistName,
  memberName,
  currentImageUrl,
  onSuccess,
  lang
}: MemberPhotoModalProps) {
  const t = getT(lang);

  // STEP 01 – Search
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<DeezerArtist[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  // STEP 02 – URL
  const [url, setUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<{ code: string; current?: number; required?: number } | null>(null);

  /* ── Search debounce ── */
  useEffect(() => {
    if (!isOpen || searchQuery.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setLoadingResults(true);
      const res = await searchForArtists(searchQuery);
      if (res.success) setResults(res.results);
      setLoadingResults(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  /* ── Reset on open/close ── */
  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setSearchQuery('');
      setResults([]);
      setPreviewError(false);
      setErrorStatus(null);
      setSelectedResultId(null);
    } else {
      // Pre-fill search with "MemberName ArtistName" for better results
      setSearchQuery(`${memberName} ${artistName}`);
    }
  }, [isOpen, memberName, artistName]);

  const handleSelectResult = (res: DeezerArtist) => {
    // Use the best available image quality (replace medium → xl in Deezer URLs)
    const xlUrl = res.imageUrl?.replace('/56x56', '/250x250')
      .replace('/250x250', '/500x500')
      .replace('medium', 'xl') ?? res.imageUrl ?? '';
    setUrl(xlUrl);
    setSelectedResultId(res.id);
    setPreviewError(false);
  };

  const handleSubmit = async () => {
    if (!url || previewError) return;
    setSubmitting(true);
    setErrorStatus(null);
    try {
      const result = await updateMemberPhoto(memberId, artistId, url);
      if (result.success) {
        onSuccess(url);
        onClose();
      } else if (result.error === 'VOTES_INSUFFICIENT') {
        setErrorStatus({ code: 'VOTES_INSUFFICIENT', current: result.currentVotes, required: result.requiredVotes });
      } else if (result.error === 'LOG_IN_REQUIRED') {
        setErrorStatus({ code: 'LOG_IN_REQUIRED' });
      } else {
        alert(result.error || t('photoUpdateFailed'));
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
          {/* Backdrop */}
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
            className="relative w-full max-w-xl glassmorphism rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="scanner-line opacity-10" />

            {/* ── Header ── */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                  <ImageIcon className="text-neon-magenta" size={18} />
                  {t('memberPhotoModalTitle')}:&nbsp;
                  <span className="text-neon-magenta font-chakra">{getLangName(memberName, lang)}</span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  {t('memberPhotoModalSub')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              {errorStatus ? (
                /* Error / Access Restricted */
                <div className="text-center space-y-6 flex flex-col items-center py-10">
                  <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <AlertCircle size={40} className="text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black italic uppercase tracking-tight">{t('accessRestricted')}</h4>
                    <p className="text-sm font-bold text-zinc-500 leading-relaxed uppercase tracking-tighter max-w-xs">
                      {errorStatus.code === 'VOTES_INSUFFICIENT' ? t('votesRequired') : t('loginRequired')}
                    </p>
                    {errorStatus.code === 'VOTES_INSUFFICIENT' && (
                      <div className="mt-2 text-[10px] font-black text-neon-magenta uppercase">
                        {errorStatus.current} / {errorStatus.required} VOLTAGE
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setErrorStatus(null)}
                    className="w-full max-w-xs py-4 rounded-2xl border border-white/10 font-black text-[10px] uppercase tracking-widest text-neon-magenta"
                  >
                    BACK
                  </button>
                </div>
              ) : (
                <>
                  {/* ── STEP 01: API Search ── */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end px-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block">
                        {t('searchLabel')}
                      </label>
                      <span className="text-[9px] font-bold text-neon-magenta/50 uppercase tracking-widest">STEP 01</span>
                    </div>

                    <div className="relative group">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-neon-magenta transition-colors" />
                      <input
                        type="text"
                        placeholder={t('photoModalSearchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-white placeholder:text-zinc-800 focus:border-neon-magenta/50 outline-none transition-all"
                      />
                      {loadingResults && (
                        <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-neon-magenta animate-spin" />
                      )}
                    </div>

                    <AnimatePresence>
                      {results.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                        >
                          {results.map((res) => {
                            const isSelected = selectedResultId === res.id;
                            return (
                              <button
                                key={res.id}
                                onClick={() => handleSelectResult(res)}
                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                                  isSelected
                                    ? 'bg-neon-magenta/10 border-neon-magenta/40'
                                    : 'bg-white/5 border-white/5 hover:border-white/20'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-zinc-900">
                                  {res.imageUrl && (
                                    <img src={res.imageUrl} alt={res.name} className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-black uppercase text-white truncate leading-tight">{getLangName(res.name, lang)}</p>
                                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                                    {isSelected ? '✓ SELECTED' : 'MATCH_FOUND'}
                                  </p>
                                </div>
                                {isSelected && <CheckCircle2 size={16} className="text-neon-magenta shrink-0" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  {/* ── STEP 02: Manual URL ── */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-end px-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block">
                          {t('manualLabel')}
                        </label>
                        <span className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest">STEP 02</span>
                      </div>
                      <div className="relative group">
                        <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input
                          type="text"
                          placeholder={t('manualPlaceholder')}
                          value={url}
                          onChange={(e) => {
                            setUrl(e.target.value);
                            setSelectedResultId(null);
                            setPreviewError(false);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-xs font-bold text-white placeholder:text-zinc-800 focus:border-blue-500/50 outline-none transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {url && !previewError && <CheckCircle2 size={16} className="text-neon-magenta" />}
                          {previewError && <AlertCircle size={16} className="text-red-400" />}
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{t('previewLabel')}</span>
                      <div className="w-40 h-40 rounded-full overflow-hidden border-2 border-white/10 bg-black/40 relative shadow-2xl flex items-center justify-center">
                        {url && !previewError ? (
                          <>
                            <img
                              src={url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={() => setPreviewError(true)}
                            />
                            <div className="absolute inset-0 border-[4px] border-neon-magenta/20 pointer-events-none rounded-full" />
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-zinc-800">
                            <ImageIcon size={36} strokeWidth={1} />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] animate-pulse">
                              {previewError ? 'INVALID URL' : t('awaitingSignal')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="p-5 rounded-[2rem] bg-zinc-900/50 border border-white/5 flex gap-4">
                    <AlertCircle size={18} className="text-zinc-700 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-zinc-600 leading-relaxed uppercase tracking-tight">
                      {t('photoWarning')}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* ── Footer ── */}
            {!errorStatus && (
              <div className="p-6 bg-black/40 border-t border-white/5 flex gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
                >
                  {t('abort')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!url || previewError || submitting}
                  className="flex-[2] py-4 rounded-3xl bg-neon-magenta text-white font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_30px_rgba(255,0,255,0.4)] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : t('establishSync')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

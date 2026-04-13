'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, Globe, Search, Music } from 'lucide-react';
import { updateArtistPhoto } from '@/actions/updateArtistPhoto';
import { searchForArtists } from '@/actions/searchDeezer';
import { DeezerArtist } from '@/lib/deezer';

interface PhotoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  artistName: string;
  currentImageUrl: string | null;
  onSuccess: (newUrl: string) => void;
  lang: Language;
}

import { Language, getT } from '@/constants/i18n';

export default function PhotoEditModal({
  isOpen,
  onClose,
  artistId,
  artistName,
  currentImageUrl,
  onSuccess,
  lang
}: PhotoEditModalProps) {
  const t = getT(lang);
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState(artistName);
  const [results, setResults] = useState<DeezerArtist[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [errorStatus, setErrorStatus] = useState<{ code: string; current?: number; required?: number } | null>(null);

  // Search logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isOpen && searchQuery.trim().length > 1) {
        setLoadingResults(true);
        const res = await searchForArtists(searchQuery);
        if (res.success) {
          setResults(res.results);
        }
        setLoadingResults(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setSearchQuery(artistName);
      setResults([]);
      setPreviewError(false);
      setErrorStatus(null);
    }
  }, [isOpen, artistName]);

  const handleSubmit = async () => {
    if (!url || previewError) return;
    setSubmitting(true);
    setErrorStatus(null);

    try {
      const result = await updateArtistPhoto(artistId, url);
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

            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                  <ImageIcon className="text-[#37C561]" size={18} />
                  {t('photoModalTitle')}: <span className="text-[#37C561] font-chakra">{artistName}</span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{t('photoModalSub')}</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Swappable based on permission status */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              {errorStatus ? (
                <div className="text-center space-y-6 flex flex-col items-center py-10">
                  <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <AlertCircle size={40} className="text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black italic uppercase tracking-tight">{t('accessRestricted')}</h4>
                    <p className="text-sm font-bold text-zinc-500 leading-relaxed uppercase tracking-tighter max-w-xs">
                      {errorStatus.code === 'VOTES_INSUFFICIENT'
                        ? t('votesRequired')
                        : t('loginRequired')}

                    </p>
                  </div>
                  <button onClick={() => setErrorStatus(null)} className="w-full max-w-xs py-4 rounded-2xl border border-white/10 font-black text-[10px] uppercase tracking-widest text-[#37C561]">
                    OK
                  </button>
                </div>
              ) : (
                <>
                  {/* Step 1: Global Search */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end px-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block">
                        {t('searchLabel')}
                      </label>
                      <span className="text-[9px] font-bold text-[#37C561]/50 uppercase tracking-widest">STEP 01</span>
                    </div>

                    <div className="relative group">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#37C561] transition-colors" />
                      <input
                        type="text"
                        placeholder={t('photoModalSearchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-zinc-800 focus:border-[#37C561]/50 outline-none transition-all"
                      />
                      {loadingResults && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#37C561] animate-spin" />}
                    </div>

                    {/* Search Results */}
                    <AnimatePresence>
                      {results.length > 0 && searchQuery.length > 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2"
                        >
                          {results.map((res) => (
                            <button
                              key={res.id}
                              onClick={() => {
                                // Important: We use XL or Big picture for metadata quality
                                const bestImage = res.imageUrl?.replace('medium', 'xl') || res.imageUrl;
                                setUrl(bestImage || '');
                                setPreviewError(false);
                              }}
                              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${url.includes(res.id)
                                ? 'bg-[#37C561]/10 border-[#37C561]/40'
                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                }`}
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                                {/* 👇 여기가 수정된 부분입니다. */}
                                {res.imageUrl && (
                                  <img src={res.imageUrl} alt={res.name} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black uppercase text-white truncate leading-tight">{res.name}</p>
                                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">MATCH_SELECTED</p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="w-full h-px bg-white/5 my-2" />

                  {/* Step 2: Protocol Adjustment / Preview */}
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
                            setPreviewError(false);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-xs font-bold text-white placeholder:text-zinc-800 focus:border-blue-500/50 outline-none transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {url && !previewError && <CheckCircle2 size={16} className="text-[#37C561]" />}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{t('previewLabel')}</span>
                      <div className="aspect-square w-full max-w-[220px] rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 relative shadow-2xl">
                        {url && !previewError ? (
                          <img src={url} alt="Preview" className="w-full h-full object-cover" onError={() => setPreviewError(true)} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-800">
                            <ImageIcon size={40} strokeWidth={1} />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] animate-pulse">{t('awaitingSignal')}</span>
                          </div>
                        )}
                        {url && !previewError && (
                          <div className="absolute inset-0 border-[6px] border-[#37C561]/20 pointer-events-none rounded-[2.5rem]" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-[2rem] bg-zinc-900/50 border border-white/5 flex gap-4">
                    <AlertCircle size={18} className="text-zinc-700 shrink-0 mt-1" />
                    <p className="text-[9px] font-bold text-zinc-600 leading-relaxed uppercase tracking-tight">
                      {t('photoWarning')}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!errorStatus && (
              <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
                >
                  {t('abort')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!url || previewError || submitting}
                  className="flex-[2] py-4 rounded-3xl bg-[#37C561] text-black font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_30px_rgba(55,197,97,0.4)] disabled:opacity-20 disabled:cursor-not-allowed transition-all relative flex items-center justify-center gap-2"
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
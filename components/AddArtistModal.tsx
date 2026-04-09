'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Music, CheckCircle2, AlertCircle } from 'lucide-react';
import { searchForArtists } from '@/actions/searchDeezer';
import { DeezerArtist } from '@/lib/deezer';
import { addArtist } from '@/actions/addArtist';

interface AddArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
}

export default function AddArtistModal({ isOpen, onClose, lang }: AddArtistModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeezerArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        const res = await searchForArtists(query);
        if (res.success) {
          setResults(res.results);
        } else {
          setResults([]);
        }
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle closing properly
  const handleClose = () => {
    setQuery('');
    setResults([]);
    setNotification(null);
    onClose();
  };

  const handleSelectArtist = async (artist: DeezerArtist) => {
    setSubmitting(true);
    setNotification(null);

    const res = await addArtist(artist.name, artist.imageUrl);
    
    setSubmitting(false);

    if (res.success) {
      setNotification({ type: 'success', message: `${artist.name} has been nominated successfully!` });
      setTimeout(() => {
        handleClose();
      }, 2000);
    } else {
      setNotification({ type: 'error', message: res.error || 'Failed to nominate artist.' });
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass-panel p-1 border border-white/10 shadow-[0_0_50px_rgba(0,243,255,0.15)] flex flex-col max-h-[85vh] overflow-hidden bg-black/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-xl font-black italic tracking-tighter neon-text-cyan flex items-center gap-2">
                <Music size={20} className="text-neon-magenta" />
                {lang === 'KO' ? '새 아티스트 노미네이트' : 'NOMINATE ARTIST'}
              </h2>
              <button 
                onClick={handleClose}
                className="text-zinc-500 hover:text-white transition-colors"
                disabled={submitting}
              >
                <X size={20} />
              </button>
            </div>

            {/* Notification Banner */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b border-white/5 ${notification.type === 'success' ? 'bg-neon-lime/10 text-neon-lime' : 'bg-red-500/10 text-red-500'}`}
                >
                  {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {notification.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Input */}
            <div className="p-5 relative">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-cyan" />
                <input
                  type="text"
                  placeholder={lang === 'KO' ? '글로벌 데이터베이스 아티스트 검색...' : 'Search global artist database...'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={submitting || notification?.type === 'success'}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-neon-cyan/50 transition-colors"
                  autoFocus
                />
                {loading && (
                  <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-neon-magenta animate-spin" />
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
              {query.trim().length > 1 && !loading && results.length === 0 && (
                <div className="p-8 text-center text-zinc-500 font-bold text-sm">
                  {lang === 'KO' ? '검색 결과가 없습니다.' : 'No artists found.'}
                </div>
              )}

              <div className="space-y-2 px-3 pb-4">
                {results.map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() => handleSelectArtist(artist)}
                    disabled={submitting || notification?.type === 'success'}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4">
                      {artist.imageUrl ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0">
                          <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
                          <Music size={18} className="text-zinc-600" />
                        </div>
                      )}
                      
                      <div className="text-left flex flex-col">
                        <span className="font-black text-lg tracking-tight group-hover:neon-text-cyan transition-all">{artist.name}</span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block -mt-1">
                          {artist.followers.toLocaleString()} {lang === 'KO' ? '팔로워' : 'Followers'}
                        </span>
                      </div>
                    </div>

                    <div className="px-4 py-1.5 rounded-full border border-neon-lime/30 text-[10px] font-black uppercase text-neon-lime opacity-0 group-hover:opacity-100 transition-opacity">
                      {lang === 'KO' ? '추가' : 'ADD'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

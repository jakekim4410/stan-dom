'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Globe2, Send, MessageCircle, TrendingUp, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { COUNTRIES } from '@/components/CountrySelector';

interface Artist {
  id: string;
  name: string;
  image_url: string | null;
  total_votes: number;
}

interface Comment {
  id: string;
  content: string;
  country_code: string | null;
  display_name: string | null;
  created_at: string;
}

interface CountryStat {
  code: string;
  name: string;
  flag: string;
  count: number;
}

const COUNTRY_FLAGS: Record<string, string> = Object.fromEntries(
  COUNTRIES.map(c => [c.code, c.flag])
);
const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  COUNTRIES.map(c => [c.code, c.name])
);

import { use } from 'react';

export default function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const artistId = resolvedParams.id;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStat[]>([]);
  const [totalCountryVotes, setTotalCountryVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sending, setSending] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAll();

    // Realtime: artist votes
    const artistChannel = supabase
      .channel('artist_detail_votes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'artists', filter: `id=eq.${artistId}` },
        payload => setArtist(payload.new as Artist))
      .subscribe();

    // Realtime: new comments
    const commentChannel = supabase
      .channel('artist_comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `artist_id=eq.${artistId}` },
        payload => setComments(prev => [payload.new as Comment, ...prev].slice(0, 50)))
      .subscribe();

    return () => {
      supabase.removeChannel(artistChannel);
      supabase.removeChannel(commentChannel);
    };
  }, [artistId]);

  const fetchAll = async () => {
    setLoading(true);
    const [artistRes, commentsRes, votesRes] = await Promise.all([
      supabase.from('artists').select('*').eq('id', artistId).single(),
      supabase.from('comments').select('*').eq('artist_id', artistId).order('created_at', { ascending: false }).limit(50),
      supabase.from('votes').select('country_code').eq('artist_id', artistId),
    ]);

    if (artistRes.data) setArtist(artistRes.data);
    if (commentsRes.data) setComments(commentsRes.data);

    if (votesRes.data) {
      const stats: Record<string, number> = {};
      for (const v of votesRes.data) {
        const c = v.country_code || 'UN';
        stats[c] = (stats[c] || 0) + 1;
      }
      const total = votesRes.data.length;
      setTotalCountryVotes(total);
      setCountryStats(
        Object.entries(stats)
          .sort(([, a], [, b]) => b - a)
          .map(([code, count]) => ({
            code,
            count,
            name: COUNTRY_NAMES[code] ?? code,
            flag: COUNTRY_FLAGS[code] ?? '🌐',
          }))
      );
    }
    setLoading(false);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.from('comments').insert({
      artist_id: artistId,
      content: commentText.trim(),
      display_name: displayName.trim() || 'Anonymous Fan',
      country_code: null,
    });
    if (!error) setCommentText('');
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
        <p className="text-zinc-500 font-black text-xl">Artist not found</p>
        <Link href="/" className="px-6 py-3 bg-cyan-500 text-black rounded-full font-black text-sm">← Back to Rankings</Link>
      </div>
    );
  }

  const maxBarCount = countryStats[0]?.count || 1;

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-20 selection:bg-cyan-500/30">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(0,243,255,0.05),transparent_60%)]" />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 to-[#050505]" />
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-20">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors text-sm font-black mb-8">
            <ArrowLeft size={16} /> Back to Rankings
          </Link>

          {/* Artist Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-magenta-500/20 blur-3xl rounded-full" />
              <div className="relative w-36 h-36 rounded-[2rem] bg-zinc-900 border-2 border-white/10 overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(255,0,255,0.15)]">
                {artist.image_url
                  ? <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                  : <span className="text-6xl font-black text-zinc-700">{artist.name[0]}</span>}
              </div>
            </motion.div>

            <div className="text-center sm:text-left">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-1">K-POP Artist</p>
              <h1 className="text-5xl font-black tracking-tighter mb-4">{artist.name}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-4 flex-wrap">
                <div className="flex items-center gap-2 glassmorphism px-4 py-2 rounded-xl border border-white/10">
                  <Zap size={14} className="text-yellow-400" />
                  <span className="font-mono font-black text-lg">{(artist.total_votes || 0).toLocaleString()}</span>
                  <span className="text-zinc-500 text-xs font-bold uppercase">votes</span>
                </div>
                <div className="flex items-center gap-2 glassmorphism px-4 py-2 rounded-xl border border-white/10">
                  <Globe2 size={14} className="text-cyan-400" />
                  <span className="font-black text-sm">{countryStats.length} countries</span>
                </div>
                <div className="flex items-center gap-2 glassmorphism px-4 py-2 rounded-xl border border-white/10">
                  <MessageCircle size={14} className="text-magenta-400" />
                  <span className="font-black text-sm">{comments.length} cheers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 space-y-12 -mt-8">
        {/* Country Stats */}
        <section className="glassmorphism rounded-[2rem] border border-white/5 p-8">
          <h2 className="text-xl font-black italic flex items-center gap-3 mb-8">
            <TrendingUp size={20} className="text-cyan-400" />
            Global Fandom Map
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest not-italic ml-auto">
              {totalCountryVotes.toLocaleString()} total
            </span>
          </h2>

          {countryStats.length === 0 ? (
            <p className="text-zinc-600 text-center py-8 font-bold">No vote data yet. Be the first to support!</p>
          ) : (
            <div className="space-y-4">
              {countryStats.slice(0, 10).map((s, i) => (
                <motion.div
                  key={s.code}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4"
                >
                  <span className="text-zinc-600 font-mono text-xs w-4 text-right">{i + 1}</span>
                  <span className="text-xl w-7">{s.flag}</span>
                  <span className="font-black text-sm w-28 truncate">{s.name}</span>
                  <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.count / maxBarCount) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.06 }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(to right, rgba(0,243,255,0.6), rgba(0,255,136,0.9))' }}
                    />
                  </div>
                  <span className="font-mono font-black text-sm text-zinc-300 w-12 text-right">{s.count.toLocaleString()}</span>
                  <span className="text-[10px] text-zinc-600 font-black w-10 text-right">
                    {totalCountryVotes > 0 ? `${((s.count / totalCountryVotes) * 100).toFixed(1)}%` : ''}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Cheering Board */}
        <section className="glassmorphism rounded-[2rem] border border-white/5 p-8">
          <h2 className="text-xl font-black italic flex items-center gap-3 mb-6">
            <MessageCircle size={20} className="text-magenta-400" />
            Live Cheering Board
            <span className="flex items-center gap-1 ml-auto text-[10px] text-red-400 font-black uppercase tracking-widest not-italic">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> LIVE
            </span>
          </h2>

          {/* Comment Input */}
          <div className="space-y-3 mb-8 p-4 bg-white/3 rounded-2xl border border-white/5">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value.slice(0, 20))}
              className="w-full bg-transparent border-b border-white/10 pb-2 text-xs font-bold outline-none placeholder:text-zinc-600 focus:border-cyan-500/50 transition-colors"
            />
            <div className="flex items-end gap-3">
              <textarea
                placeholder={`Cheer for ${artist.name}! (max 200 chars)`}
                value={commentText}
                onChange={e => setCommentText(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                className="flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-zinc-600 resize-none"
              />
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim() || sending}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-500 text-black flex items-center justify-center hover:bg-cyan-400 transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 text-right font-bold">{commentText.length}/200</p>
          </div>

          {/* Comment Feed */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {comments.length === 0 ? (
                <p className="text-zinc-600 text-center py-8 font-bold text-sm">No cheers yet — be the first!</p>
              ) : (
                comments.map(c => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-start gap-3 p-4 bg-white/3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-sm flex-shrink-0">
                      {c.country_code ? (COUNTRY_FLAGS[c.country_code] ?? '🌐') : '💜'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-zinc-300">{c.display_name || 'Anonymous Fan'}</span>
                        <span className="text-[9px] text-zinc-600 font-bold ml-auto">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 break-words">{c.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            <div ref={commentsEndRef} />
          </div>
        </section>
      </div>
    </main>
  );
}

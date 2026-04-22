'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface Track {
  id: string;
  rank: number;
  title: string;
  artist: string;
  album_art: string;
  youtube_id: string;
  spotify_id: string;
}

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  activePlaylist: Track[];
  setPlaylist: (tracks: Track[]) => void;
  setActivePlaylist: (tracks: Track[]) => void;
  playTrack: (track: Track) => void;
  stopTrack: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Track[]>([]);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const stopTrack = () => {
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (!currentTrack) return;
    // 필터가 적용된 경우 activePlaylist 사용, 아니면 전체 playlist 사용
    const list = activePlaylist.length > 0 ? activePlaylist : playlist;
    if (list.length === 0) return;
    const currentIndex = list.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % list.length;
    setCurrentTrack(list[nextIndex]);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    if (!currentTrack) return;
    const list = activePlaylist.length > 0 ? activePlaylist : playlist;
    if (list.length === 0) return;
    const currentIndex = list.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    setCurrentTrack(list[prevIndex]);
    setIsPlaying(true);
  };

  return (
    <MusicContext.Provider value={{
      currentTrack,
      isPlaying,
      playlist,
      activePlaylist,
      setPlaylist,
      setActivePlaylist,
      playTrack,
      stopTrack,
      togglePlay,
      nextTrack,
      prevTrack,
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

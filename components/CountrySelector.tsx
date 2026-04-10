'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Globe, Navigation } from 'lucide-react';
import { COUNTRY_DATA, Country } from '@/constants/countryData';

interface CountrySelectorProps {
  selected: Country | null;
  onSelect: (country: Country) => void;
  lang?: 'EN' | 'KO';
}

const POPULAR_CODES = ['KR', 'US', 'JP', 'CN', 'GB', 'BR', 'ID', 'TH', 'PH', 'VN', 'MY', 'IN', 'AU', 'CA', 'MX'];

export default function CountrySelector({ selected, onSelect, lang = 'EN' }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const popularCountries = COUNTRY_DATA.filter(c => POPULAR_CODES.includes(c.code));

  const filtered = query.trim()
    ? COUNTRY_DATA.filter(c => {
      const q = query.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.nameKo.includes(q) || c.code.toLowerCase().includes(q);
    })
    : COUNTRY_DATA;

  const handleAutoDetect = () => {
    try {
      const locale = navigator.language || navigator.languages?.[0];
      if (locale?.includes('-')) {
        const [, code] = locale.split('-');
        const found = COUNTRY_DATA.find(c => c.code === code.toUpperCase());
        if (found) { onSelect(found); setOpen(false); return; }
      }
    } catch (e) { }
    alert(lang === 'KO' ? '국가 자동 감지에 실패했습니다.' : 'Could not auto-detect region.');
  };

  // ✅ 수정: touchstart 제거, pointerdown으로 통합
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const isOutsideTrigger = !containerRef.current?.contains(e.target as Node);
      const isOutsideDropdown = !dropdownRef.current?.contains(e.target as Node);
      if (isOutsideTrigger && isOutsideDropdown) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('pointerdown', handlePointerDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  // Focus input and calculate position when opened
  useEffect(() => {
    if (open) {
      if (window.innerWidth > 768) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }

      const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const minHeightRequired = 300;

        if (spaceBelow >= minHeightRequired || spaceBelow >= spaceAbove) {
          setDropdownStyle({
            position: 'fixed',
            top: `${rect.bottom + 8}px`,
            left: `${rect.left}px`,
            width: `${Math.max(320, rect.width)}px`,
            maxHeight: `${Math.max(150, spaceBelow - 20)}px`,
            zIndex: 99999
          });
        } else {
          setDropdownStyle({
            position: 'fixed',
            bottom: `${window.innerHeight - rect.top + 8}px`,
            left: `${rect.left}px`,
            width: `${Math.max(320, rect.width)}px`,
            maxHeight: `${Math.max(150, spaceAbove - 20)}px`,
            zIndex: 99999
          });
        }
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, { passive: true });
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <div ref={containerRef} className="w-full relative">
      {/* ── Trigger Button ── */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${open ? 'border-neon-lime/50 bg-neon-lime/5' : 'border-white/10 bg-white/5 hover:border-white/20'
          }`}
      >
        <Globe size={14} className="text-zinc-500 flex-shrink-0" />
        {selected ? (
          <>
            <span className="text-lg flex-shrink-0">{selected.flag}</span>
            <span className="font-bold text-sm flex-1 text-left text-white truncate">
              {lang === 'KO' ? selected.nameKo : selected.name}
            </span>
            <span className="text-[10px] text-zinc-500 font-black flex-shrink-0">{selected.code}</span>
          </>
        ) : (
          <span className="text-zinc-500 text-sm flex-1 text-left">
            {lang === 'KO' ? '내 국가 선택...' : 'Select country...'}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-xl border border-lime-500/30 shadow-[0_15px_40px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col bg-[#0e0e0e]/95 backdrop-blur-xl"
        >
          {/* Search + Auto-detect row */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/70">
            <Search size={12} className="text-zinc-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={lang === 'KO' ? '국가 검색...' : 'Search...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="bg-transparent outline-none text-xs flex-1 text-white placeholder:text-zinc-600 font-medium"
            />
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleAutoDetect}
              title={lang === 'KO' ? '현재 위치 자동 감지' : 'Auto-detect my location'}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-neon-lime/10 border border-neon-lime/30 text-neon-lime hover:bg-neon-lime/20 transition-all text-[9px] font-black uppercase tracking-wider flex-shrink-0"
            >
              <Navigation size={10} />
              {lang === 'KO' ? '자동' : 'Auto'}
            </button>
          </div>

          {/* Popular shortcuts */}
          {!query.trim() && (
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">
                {lang === 'KO' ? '빠른 선택' : 'Quick Pick'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {popularCountries.map(c => (
                  <button
                    key={c.code}
                    onPointerDown={(e) => e.stopPropagation()} // ✅ 추가
                    onClick={() => { onSelect(c); setOpen(false); }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-all ${selected?.code === c.code
                      ? 'bg-neon-lime/20 border-neon-lime/50 text-neon-lime'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                      }`}
                  >
                    <span>{c.flag}</span>
                    <span className="text-[10px] font-black">{c.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 overscroll-contain">
            {filtered.map(c => (
              <button
                key={c.code}
                onPointerDown={(e) => e.stopPropagation()} // ✅ 추가
                onClick={() => { onSelect(c); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/10 transition-colors text-left ${selected?.code === c.code ? 'bg-neon-lime/10 text-neon-lime' : 'text-zinc-300'
                  }`}
              >
                <span className="text-base flex-shrink-0">{c.flag}</span>
                <span className="font-medium text-xs flex-1 truncate">{lang === 'KO' ? c.nameKo : c.name}</span>
                <span className="text-[9px] text-zinc-600 font-black flex-shrink-0">{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-zinc-600 text-xs">No results</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
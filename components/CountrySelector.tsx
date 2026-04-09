'use client';

import { useState, useRef } from 'react';
import { Search, ChevronDown, Globe } from 'lucide-react';

// Full country list with ISO codes, names, flags, and coordinates
export const COUNTRIES = [
  { code: 'KR', name: 'South Korea', nameKo: '대한민국', flag: '🇰🇷', lat: 37.5665, lng: 126.9780 },
  { code: 'JP', name: 'Japan', nameKo: '일본', flag: '🇯🇵', lat: 36.2048, lng: 138.2529 },
  { code: 'US', name: 'United States', nameKo: '미국', flag: '🇺🇸', lat: 37.0902, lng: -95.7129 },
  { code: 'CN', name: 'China', nameKo: '중국', flag: '🇨🇳', lat: 35.8617, lng: 104.1954 },
  { code: 'TH', name: 'Thailand', nameKo: '태국', flag: '🇹🇭', lat: 15.8700, lng: 100.9925 },
  { code: 'PH', name: 'Philippines', nameKo: '필리핀', flag: '🇵🇭', lat: 12.8797, lng: 121.7740 },
  { code: 'VN', name: 'Vietnam', nameKo: '베트남', flag: '🇻🇳', lat: 14.0583, lng: 108.2772 },
  { code: 'ID', name: 'Indonesia', nameKo: '인도네시아', flag: '🇮🇩', lat: -0.7893, lng: 113.9213 },
  { code: 'MY', name: 'Malaysia', nameKo: '말레이시아', flag: '🇲🇾', lat: 4.2105, lng: 101.9758 },
  { code: 'SG', name: 'Singapore', nameKo: '싱가포르', flag: '🇸🇬', lat: 1.3521, lng: 103.8198 },
  { code: 'IN', name: 'India', nameKo: '인도', flag: '🇮🇳', lat: 20.5937, lng: 78.9629 },
  { code: 'GB', name: 'United Kingdom', nameKo: '영국', flag: '🇬🇧', lat: 55.3781, lng: -3.4360 },
  { code: 'FR', name: 'France', nameKo: '프랑스', flag: '🇫🇷', lat: 46.2276, lng: 2.2137 },
  { code: 'DE', name: 'Germany', nameKo: '독일', flag: '🇩🇪', lat: 51.1657, lng: 10.4515 },
  { code: 'BR', name: 'Brazil', nameKo: '브라질', flag: '🇧🇷', lat: -14.2350, lng: -51.9253 },
  { code: 'MX', name: 'Mexico', nameKo: '멕시코', flag: '🇲🇽', lat: 23.6345, lng: -102.5528 },
  { code: 'AU', name: 'Australia', nameKo: '호주', flag: '🇦🇺', lat: -25.2744, lng: 133.7751 },
  { code: 'CA', name: 'Canada', nameKo: '캐나다', flag: '🇨🇦', lat: 56.1304, lng: -106.3468 },
  { code: 'RU', name: 'Russia', nameKo: '러시아', flag: '🇷🇺', lat: 61.5240, lng: 105.3188 },
  { code: 'TR', name: 'Turkey', nameKo: '터키', flag: '🇹🇷', lat: 38.9637, lng: 35.2433 },
  { code: 'SA', name: 'Saudi Arabia', nameKo: '사우디아라비아', flag: '🇸🇦', lat: 23.8859, lng: 45.0792 },
  { code: 'ZA', name: 'South Africa', nameKo: '남아공', flag: '🇿🇦', lat: -30.5595, lng: 22.9375 },
  { code: 'NG', name: 'Nigeria', nameKo: '나이지리아', flag: '🇳🇬', lat: 9.0820, lng: 8.6753 },
  { code: 'EG', name: 'Egypt', nameKo: '이집트', flag: '🇪🇬', lat: 26.8206, lng: 30.8025 },
  { code: 'AR', name: 'Argentina', nameKo: '아르헨티나', flag: '🇦🇷', lat: -38.4161, lng: -63.6167 },
];

export type Country = typeof COUNTRIES[0];

interface CountrySelectorProps {
  selected: Country | null;
  onSelect: (country: Country) => void;
  lang?: 'EN' | 'KO';
}

export default function CountrySelector({ selected, onSelect, lang = 'EN' }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = COUNTRIES.filter(c => {
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameKo.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative z-30 w-full max-w-xs">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 glassmorphism rounded-2xl border border-white/10 hover:border-cyan-500/40 transition-all group"
      >
        <Globe size={14} className="text-zinc-500 group-hover:text-cyan-400 transition-colors" />
        {selected ? (
          <>
            <span className="text-xl">{selected.flag}</span>
            <span className="font-black text-sm tracking-tight flex-1 text-left">
              {lang === 'KO' ? selected.nameKo : selected.name}
            </span>
            <span className="text-[10px] text-zinc-500 font-black">{selected.code}</span>
          </>
        ) : (
          <span className="text-zinc-500 text-sm font-bold flex-1 text-left">
            {lang === 'KO' ? '내 국가 선택...' : 'Select your country...'}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 glassmorphism rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,243,255,0.1)] overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <Search size={12} className="text-zinc-500" />
            <input
              autoFocus
              type="text"
              placeholder={lang === 'KO' ? '국가 검색...' : 'Search country...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="bg-transparent outline-none text-xs flex-1 font-bold placeholder:text-zinc-600"
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {filtered.map(c => (
              <button
                key={c.code}
                onClick={() => { onSelect(c); setOpen(false); setQuery(''); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/10 transition-colors text-left ${selected?.code === c.code ? 'bg-cyan-500/10 text-cyan-400' : ''}`}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="font-black text-xs tracking-tight flex-1">
                  {lang === 'KO' ? c.nameKo : c.name}
                </span>
                <span className="text-[10px] text-zinc-600 font-black">{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-zinc-600 text-xs py-6 font-bold">No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

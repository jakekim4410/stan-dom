'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Language, getT } from '@/constants/i18n';
import { COUNTRY_DATA } from '@/constants/countryData';
import { getLangName } from '@/utils/localization';

const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
      {getT(localStorage.getItem('stan_lang') as any || 'EN')('loadingGlobe')}
    </div>
  ),
});

// Color constants
const C_GREEN = '#37C561'; 
const C_MAGENTA = '#FF00FF';
const C_LIME = '#37C561';

const COUNTRY_COORDS_MAP = COUNTRY_DATA.reduce(
  (acc, c) => ({ ...acc, [c.code]: c }),
  {} as Record<string, any>
);

// DEMO_STATS removed to ensure 100% real-time data accuracy as requested.

interface GlobeMapProps {
  stats: Record<string, number>;
  detailedVotes?: Record<string, Record<string, number>>;
  artists?: Array<{ id: string; name: string }>;
  topArtistByCountry?: Record<string, string>;
  lastVoteCountry?: string;
  userCountry?: { code: string; lat: number; lng: number; name: string } | null;
  onCountryClick: (countryCode: string, countryName: string) => void;
  lang: Language;
}

export default function GlobeMap({
  stats,
  detailedVotes = {},
  artists = [],
  topArtistByCountry = {},
  lastVoteCountry,
  userCountry,
  onCountryClick,
  lang,
}: GlobeMapProps) {
  const globeRef = useRef<any>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 300 });
  const [isMounted, setIsMounted] = useState(false);
  const [ringsData, setRingsData] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const t = getT(lang);

  // 100% Real-time data from props
  const mergedStats = useMemo(() => {
    const merged: Record<string, number> = {};
    for (const [code, count] of Object.entries(stats)) {
      merged[code] = (merged[code] || 0) + count; // Simplified, remove demo multiplier if not needed, or keep v * 10
    }
    return merged;
  }, [stats]);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then(data => setCountries(data.features))
      .catch(() => setCountries([]));
  }, []);

  const maxVotes = useMemo(() => Math.max(1, ...Object.values(mergedStats)), [mergedStats]);

  const getPolygonColor = useCallback((iso: string) => {
    const votes = mergedStats[iso] || 0;
    if (votes === 0) return 'rgba(0,0,0,0)'; // No color for inactive countries

    const ratio = Math.sqrt(votes / maxVotes);

    // Dark green -> Point Color (55, 197, 97)
    const r = Math.round(10 + 45 * ratio);
    const g = Math.round(40 + 157 * ratio);
    const b = Math.round(20 + 77 * ratio);
    return `rgba(${r},${g},${b},${(0.4 + 0.5 * ratio).toFixed(2)})`;
  }, [mergedStats, maxVotes]);

  const labelData = useMemo(() => {
    return Object.entries(mergedStats)
      .filter(([code]) => COUNTRY_COORDS_MAP[code] && stats[code])
      .map(([code, count]) => ({
        ...COUNTRY_COORDS_MAP[code],
        id: code,
        votes: count,
        label: COUNTRY_COORDS_MAP[code].name,
      }));
  }, [stats]);

  const arcsData = useMemo(() => {
    return Object.entries(stats)
      .filter(([code, votes]) => COUNTRY_COORDS_MAP[code] && votes > 0)
      .map(([code, votes]) => {
        const coords = COUNTRY_COORDS_MAP[code];
        const countryVotes = stats[code] || 0;
        const color = countryVotes > 50 ? C_LIME : 'rgba(255,255,255,0.6)'; // Use green or white for arcs
        return {
          startLat: coords.lat,
          startLng: coords.lng,
          endLat: coords.lat,
          endLng: coords.lng + 2,
          color: [color, 'rgba(0,0,0,0)'],
          altitude: 0.5 + Math.random() * 0.3,
          stroke: 0.5,
          dashAnimateTime: 2000,
        };
      });
  }, [stats]);

  const triggerPause = useCallback(() => {
    setIsPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setIsPaused(false), 5000);
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = !isPaused;
    }
  }, [isPaused]);

  useEffect(() => {
    if (!lastVoteCountry) return;
    const coords = COUNTRY_COORDS_MAP[lastVoteCountry] || { lat: 0, lng: 0 };
    setRingsData([{ ...coords, maxR: 10, propagationSpeed: 4, repeatPeriod: 600 }]);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 2 }, 1500);
      triggerPause();
    }
    const timer = setTimeout(() => setRingsData([]), 2000);
    return () => clearTimeout(timer);
  }, [lastVoteCountry, triggerPause]);

  useEffect(() => {
    setIsMounted(true);
    const updateSize = () => {
      const width = window.innerWidth;
      setDimensions({ width: Math.min(width, 1400), height: width < 768 ? 400 : 600 });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getTopThreeList = useCallback((iso: string) => {
    const countryVotes = detailedVotes[iso] || {};
    const top3 = Object.entries(countryVotes).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top3.length === 0) return `<li style="color: #666; font-size: 10px; font-weight: 900; letter-spacing: 0.1em;">${t('noCountryData')}</li>`;
    return top3.map(([id, count], idx) => {
      const artist = artists.find(a => a.id === id);
      const name = artist ? getLangName(artist.name, lang) : 'SYNC_ERROR';
      const color = idx === 0 ? C_MAGENTA : idx === 1 ? C_GREEN : C_LIME;
      return `
        <li style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:12px;">
          <span style="color:${color};font-weight:900;margin-right:8px;">0${idx + 1}</span>
          <span style="flex:1;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
          <span style="font-family:monospace;opacity:0.6;font-size:10px;margin-left:8px;">${count.toLocaleString()}</span>
        </li>`;
    }).join('');
  }, [detailedVotes, artists, lang, t]);

  if (!isMounted) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
        {t('loadingGlobe')}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center overflow-visible py-4">
      <div className="relative z-10 rounded-[3rem] overflow-hidden" style={{ boxShadow: `0 0 100px ${C_LIME}1A` }}>
        <Globe
          ref={globeRef}
          width={dimensions.width - (typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : 100)}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"

          showAtmosphere={true}
          atmosphereColor={C_LIME}
          atmosphereAltitude={0.15}

          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

          polygonsData={countries}
          polygonCapColor={(feat: any) => getPolygonColor(feat?.properties?.ISO_A2)}
          polygonSideColor={() => 'rgba(255,255,255,0.05)'}
          polygonStrokeColor={() => 'rgba(255,255,255,0.3)'}
          polygonAltitude={0.006}

          onPolygonClick={(polygon: any) => {
            triggerPause();
            const iso = polygon?.properties?.ISO_A2 as string;
            if (!iso || iso === '-1') return;
            const name = COUNTRY_COORDS_MAP[iso]?.name ?? polygon?.properties?.NAME ?? iso;
            onCountryClick(iso, name);
          }}

          polygonLabel={(feat: any) => {
            const iso = feat?.properties?.ISO_A2 as string;
            const name = feat?.properties?.NAME ?? iso;
            const votes = stats[iso] || 0;
            return `
              <div style="
                background:rgba(8,10,15,0.95);
                backdrop-filter:blur(16px);
                border:1px solid rgba(255,255,255,0.2);
                box-shadow:0 8px 32px rgba(0,0,0,0.8);
                border-radius:20px;
                padding:20px;
                font-family:monospace;
                color:white;
                min-width:220px;
              ">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;">
                  <span style="font-weight:900;font-size:18px;letter-spacing:-0.05em;text-transform:uppercase;">${name}</span>
                  <span style="font-size:10px;color:#666;font-weight:900;">[${iso}]</span>
                </div>
                <div style="margin-bottom:12px;">
                  <div style="font-size:8px;color:${C_LIME};font-weight:900;text-transform:uppercase;letter-spacing:0.3em;margin-bottom:8px;">${t('countryTop3')}</div>
                  <ul style="list-style:none;padding:0;margin:0;">${getTopThreeList(iso)}</ul>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;">
                  <span style="font-size:8px;color:#444;font-weight:900;text-transform:uppercase;">${t('totalVotes')}</span>
                  <span style="color:${votes > 0 ? C_LIME : '#666'};font-weight:900;font-size:14px;">${votes.toLocaleString()}</span>
                </div>
              </div>`;
          }}

          labelsData={labelData}
          labelLat="lat"
          labelLng="lng"
          labelText="label"
          labelSize={0.4}
          labelColor={() => 'rgba(255,255,255,0.7)'}
          labelDotRadius={0.2}
          labelAltitude={0.02}

          arcsData={arcsData}
          arcColor="color"
          arcAltitude="altitude"
          arcStroke="stroke"
          arcDashLength={0.4}
          arcDashGap={4}
          arcDashAnimateTime="dashAnimateTime"

          ringsData={ringsData}
          ringColor={() => C_LIME}
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"

          onGlobeReady={() => {
            if (globeRef.current) {
              globeRef.current.controls().autoRotate = true;
              globeRef.current.controls().autoRotateSpeed = 0.5;
              globeRef.current.controls().enableDamping = true;
              globeRef.current.pointOfView({ lat: 25, lng: 100, altitude: 2.2 });
            }
          }}
        />

        {/* Title overlay */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none text-center z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-1">{t('globeFrequency')}</p>
          <h2 className="text-xl font-black italic tracking-tighter neon-text-lime flex items-center justify-center gap-2">
            {t('globeTitle')}
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]" />
          </h2>
        </div>

        {/* Active nodes badge */}
        <div className="absolute bottom-5 left-5 pointer-events-none hidden md:block">
          <div className="glassmorphism px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
              {Object.keys(stats).length} {t('globeNodes')}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-5 right-5 pointer-events-none hidden md:flex flex-col gap-1 items-end">
          <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Heat Scale</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500">Low</span>
            <div
              className="w-20 h-2 rounded-full"
              style={{ background: `linear-gradient(to right, rgba(10,40,20,0.8), #37C561)` }}
            />
            <span className="text-[9px] text-zinc-300">High</span>
          </div>
        </div>

        {/* Hint */}
        <div className="absolute top-5 right-5 pointer-events-none hidden md:block">
          <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">← {t('clickCountryHint')}</p>
        </div>
      </div>
    </div>
  );
}
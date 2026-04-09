'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Language, getT } from '@/constants/i18n';

const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
      Syncing Global Nodes...
    </div>
  )
});

export const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  KR: { lat: 37.5665, lng: 126.978, name: 'South Korea' },
  US: { lat: 37.0902, lng: -95.7129, name: 'United States' },
  JP: { lat: 36.2048, lng: 138.2529, name: 'Japan' },
  CN: { lat: 35.8617, lng: 104.1954, name: 'China' },
  BR: { lat: -14.235, lng: -51.9253, name: 'Brazil' },
  FR: { lat: 46.2276, lng: 2.2137, name: 'France' },
  GB: { lat: 55.3781, lng: -3.436, name: 'United Kingdom' },
  DE: { lat: 51.1657, lng: 10.4515, name: 'Germany' },
  IN: { lat: 20.5937, lng: 78.9629, name: 'India' },
  ID: { lat: -0.7893, lng: 113.9213, name: 'Indonesia' },
  PH: { lat: 12.8797, lng: 121.774, name: 'Philippines' },
  TH: { lat: 15.87, lng: 100.9925, name: 'Thailand' },
  VN: { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
  MX: { lat: 23.6345, lng: -102.5528, name: 'Mexico' },
  UN: { lat: 0, lng: 0, name: 'Unknown' },
};

// Heatmap color scale: no votes → deep purple, max votes → neon green
function getHeatColor(votes: number, maxVotes: number): string {
  if (maxVotes === 0 || votes === 0) return 'rgba(30,10,60,0.6)';
  const ratio = Math.sqrt(votes / maxVotes); // sqrt for better visual distribution
  // Interpolate: purple (138,43,226) → cyan (0,243,255) → neon green (0,255,100)
  if (ratio < 0.5) {
    const t = ratio / 0.5;
    const r = Math.round(138 * (1 - t));
    const g = Math.round(43 * (1 - t) + 243 * t);
    const b = Math.round(226 * (1 - t) + 255 * t);
    return `rgba(${r},${g},${b},${0.4 + 0.4 * t})`;
  } else {
    const t = (ratio - 0.5) / 0.5;
    const r = 0;
    const g = Math.round(243 * (1 - t) + 255 * t);
    const b = Math.round(255 * (1 - t) + 100 * t);
    return `rgba(${r},${g},${b},${0.75 + 0.25 * t})`;
  }
}

// Demo background data so globe looks vibrant even with no real votes
const DEMO_STATS: Record<string, number> = {
  KR: 1250, JP: 1100, US: 980, CN: 850, BR: 720,
  IN: 640, TH: 510, GB: 480, ID: 450, PH: 390,
  FR: 360, DE: 320, VN: 290, MX: 240,
};

interface GlobeMapProps {
  stats: Record<string, number>;
  lastVoteCountry?: string;
  userCountry?: { code: string; lat: number; lng: number; name: string } | null;
  onCountryClick: (countryCode: string, countryName: string) => void;
  lang: Language;
}

export default function GlobeMap({ stats, lastVoteCountry, userCountry, onCountryClick, lang }: GlobeMapProps) {
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [ringsData, setRingsData] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const t = getT(lang);

  // Merge demo + real data (real votes boost on top of demo)
  const mergedStats = useMemo(() => {
    const merged = { ...DEMO_STATS };
    for (const [code, count] of Object.entries(stats)) {
      merged[code] = (merged[code] || 0) + count * 10; // real votes count 10× heavier
    }
    return merged;
  }, [stats]);

  // Fetch world GeoJSON (countries polygons)
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then(data => setCountries(data.features))
      .catch(() => setCountries([]));
  }, []);

  const maxVotes = useMemo(() => Math.max(1, ...Object.values(mergedStats)), [mergedStats]);

  const labelData = useMemo(() => {
    return Object.entries(mergedStats)
      .filter(([code]) => COUNTRY_COORDS[code])
      .map(([code, count]) => ({
        ...COUNTRY_COORDS[code],
        id: code,
        votes: count,
        label: COUNTRY_COORDS[code].name,
      }));
  }, [mergedStats]);

  // Trigger ring Vfx on new vote
  useEffect(() => {
    if (!lastVoteCountry) return;
    const coords = COUNTRY_COORDS[lastVoteCountry] || COUNTRY_COORDS['UN'];
    setRingsData([{ ...coords, maxR: 6, propagationSpeed: 2.5, repeatPeriod: 900 }]);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 2 }, 1200);
    }
    const timer = setTimeout(() => setRingsData([]), 2800);
    return () => clearTimeout(timer);
  }, [lastVoteCountry]);

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      setDimensions({ width: Math.min(width, 1400), height: width < 768 ? 380 : 580 });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden py-8">
      <div className="relative z-10 glassmorphism rounded-[2.5rem] border border-white/5 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]">
        <Globe
          ref={globeRef}
          width={dimensions.width - 32}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere
          atmosphereColor="#00c8ff"
          atmosphereAltitude={0.2}

          // Dark base globe
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"

          // ── Heatmap Layer (Polygon per country) ──
          polygonsData={countries}
          polygonCapColor={(feat: any) => {
            const iso = feat?.properties?.ISO_A2 as string;
            const votes = mergedStats[iso] || 0;
            return getHeatColor(votes, maxVotes);
          }}
          polygonSideColor={() => 'rgba(0,0,0,0.05)'}
          polygonStrokeColor={() => 'rgba(255,255,255,0.04)'}
          polygonAltitude={(feat: any) => {
            const iso = feat?.properties?.ISO_A2 as string;
            const votes = mergedStats[iso] || 0;
            return votes > 0 ? 0.008 + 0.012 * Math.sqrt(votes / maxVotes) : 0.001;
          }}
          onPolygonClick={(polygon: any) => {
            const iso = polygon?.properties?.ISO_A2 as string;
            if (!iso || iso === '-1') return;
            const known = COUNTRY_COORDS[iso];
            const name = known?.name ?? polygon?.properties?.NAME ?? iso;
            onCountryClick(iso, name);
          }}
          polygonLabel={(feat: any) => {
            const iso = feat?.properties?.ISO_A2 as string;
            const votes = stats[iso] || 0;
            const name = feat?.properties?.NAME ?? iso;
            return `<div style="
              background: rgba(5,5,5,0.85);
              backdrop-filter: blur(8px);
              border: 1px solid rgba(0,243,255,0.3);
              border-radius: 8px;
              padding: 6px 10px;
              font-family: monospace;
              font-weight: 900;
              font-size: 11px;
              color: white;
            ">
              <div style="color:#00f3ff;letter-spacing:2px;font-size:9px;text-transform:uppercase;">${iso}</div>
              <div style="font-size:13px;">${name}</div>
              ${votes > 0 ? `<div style="color:#00ff88;font-size:10px;margin-top:2px;">● ${votes.toLocaleString()} votes</div>` : ''}
            </div>`;
          }}

          // ── Country Name Labels ──
          labelsData={labelData}
          labelLat="lat"
          labelLng="lng"
          labelText="label"
          labelSize={(d: any) => Math.max(0.4, 0.3 + 0.5 * Math.sqrt(d.votes / maxVotes))}
          labelColor={() => 'rgba(255,255,255,0.85)'}
          labelDotRadius={0}
          labelAltitude={0.025}
          labelResolution={2}

          // ── Neon Rings on Vote ──
          ringsData={ringsData}
          ringColor={() => '#00FF88'}
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"

          onGlobeReady={() => {
            if (globeRef.current) {
              globeRef.current.controls().autoRotate = true;
              globeRef.current.controls().autoRotateSpeed = 0.7;
              globeRef.current.pointOfView({ lat: 25, lng: 100, altitude: 2.2 });
            }
          }}
        />

        {/* Title overlay */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none text-center z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-1">{t('globeFrequency')}</p>
          <h2 className="text-xl font-black italic tracking-tighter neon-text-cyan flex items-center justify-center gap-2">
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
            <div className="w-20 h-2 rounded-full" style={{background: 'linear-gradient(to right, rgba(138,43,226,0.5), rgba(0,243,255,0.7), rgba(0,255,136,0.95))'}} />
            <span className="text-[9px] text-zinc-300">High</span>
          </div>
        </div>

        {/* Hint */}
        <div className="absolute top-5 right-5 pointer-events-none hidden md:block">
          <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">← Click country for details</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Language, getT } from '@/constants/i18n';
import { Country } from './CountrySelector';

// Country code → approx normalized map position [x%, y%] for 2D flat map
const FLAT_POSITIONS: Record<string, [number, number]> = {
  KR: [78.5, 35], JP: [81, 34], US: [20, 35], CN: [75, 34],
  TH: [73, 44], PH: [79, 45], VN: [73, 42], ID: [76, 52],
  MY: [74, 49], SG: [74, 51], IN: [68, 42], GB: [47, 26],
  FR: [48, 28], DE: [50, 26], BR: [29, 58], MX: [17, 42],
  AU: [80, 67], CA: [17, 24], RU: [72, 22], TR: [57, 32],
  SA: [60, 40], ZA: [53, 68], NG: [50, 48], EG: [55, 37],
  AR: [27, 68], UN: [50, 50],
};

function getHeatColor(votes: number, maxVotes: number): string {
  if (maxVotes === 0 || votes === 0) return 'rgba(30,10,60,0.7)';
  const ratio = Math.sqrt(votes / maxVotes);
  if (ratio < 0.5) {
    const t = ratio / 0.5;
    return `rgba(${Math.round(138*(1-t))},${Math.round(43*(1-t)+243*t)},${Math.round(226*(1-t)+255*t)},${0.5 + 0.4*t})`;
  } else {
    const t = (ratio - 0.5) / 0.5;
    return `rgba(0,${Math.round(243*(1-t)+255*t)},${Math.round(255*(1-t)+100*t)},${0.8 + 0.2*t})`;
  }
}

interface FlatMapProps {
  stats: Record<string, number>;
  lastVoteCountry?: string;
  userCountry?: Country | null;
  onCountryClick: (code: string, name: string) => void;
  lang: Language;
}

interface Ripple { id: number; x: number; y: number; }

export default function FlatMap({ stats, lastVoteCountry, userCountry, onCountryClick, lang }: FlatMapProps) {
  const t = getT(lang);
  const [countries, setCountries] = useState<any[]>([]);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 500 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);

  // Combine demo + real stats
  const DEMO: Record<string, number> = {
    KR:1250, JP:1100, US:980, CN:850, BR:720, IN:640,
    TH:510, GB:480, ID:450, PH:390, FR:360, DE:320, VN:290, MX:240,
  };
  const mergedStats = useMemo(() => {
    const m = {...DEMO};
    for (const [c, v] of Object.entries(stats)) m[c] = (m[c]||0) + v*10;
    return m;
  }, [stats]);

  const maxVotes = useMemo(() => Math.max(1, ...Object.values(mergedStats)), [mergedStats]);

  // Fetch world GeoJSON
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then(d => setCountries(d.features))
      .catch(() => {});
  }, []);

  // Convert lng/lat to SVG x/y for Mercator-like projection (1000×500)
  const project = useCallback((lng: number, lat: number): [number, number] => {
    const x = ((lng + 180) / 360) * 1000;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = 250 - (mercN / Math.PI) * 250;
    return [x, Math.max(0, Math.min(500, y))];
  }, []);

  // Convert GeoJSON polygon rings to SVG path
  const geoToPath = useCallback((geometry: any): string => {
    if (!geometry) return '';
    const rings: number[][][] = geometry.type === 'Polygon'
      ? geometry.coordinates
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates.flat(1)
        : [];
    return rings.map(ring =>
      ring.map((pt, i) => {
        const [x, y] = project(pt[0], pt[1]);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ') + 'Z'
    ).join(' ');
  }, [project]);

  // Trigger ripple on vote
  useEffect(() => {
    if (!lastVoteCountry) return;
    const pos = FLAT_POSITIONS[lastVoteCountry];
    if (!pos) return;
    const x = (pos[0] / 100) * 1000;
    const y = (pos[1] / 100) * 500;
    const id = ++rippleId.current;
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 2000);
  }, [lastVoteCountry]);

  // Render country labels
  const labelData = useMemo(() => {
    return Object.entries(FLAT_POSITIONS)
      .filter(([code]) => mergedStats[code] && mergedStats[code] > 0)
      .map(([code, [px, py]]) => ({
        code,
        x: (px / 100) * 1000,
        y: (py / 100) * 500,
        votes: mergedStats[code] || 0,
      }));
  }, [mergedStats]);

  return (
    <div className="relative glassmorphism rounded-[2rem] border border-white/5 overflow-hidden">
      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
        <p className="text-[9px] uppercase tracking-[0.4em] font-black text-zinc-500">{t('globeFrequency')}</p>
        <h2 className="text-lg font-black italic tracking-tighter neon-text-cyan flex items-center gap-1.5 justify-center">
          {t('globeTitle')} <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]" />
        </h2>
      </div>

      <svg
        viewBox="0 0 1000 500"
        className="w-full h-auto"
        style={{ background: 'linear-gradient(180deg, #020408 0%, #050510 100%)' }}
      >
        {/* Subtle grid lines */}
        <defs>
          <pattern id="grid" width="100" height="50" patternUnits="userSpaceOnUse">
            <path d="M100,0 L0,0 0,50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="1000" height="500" fill="url(#grid)" />

        {/* Country Polygons */}
        {countries.map((feat: any, i: number) => {
          const iso = feat?.properties?.ISO_A2 as string;
          const votes = mergedStats[iso] || 0;
          const color = getHeatColor(votes, maxVotes);
          const path = geoToPath(feat.geometry);
          if (!path) return null;
          return (
            <path
              key={i}
              d={path}
              fill={color}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.4"
              className="cursor-pointer transition-all hover:brightness-150"
              onClick={() => {
                const name = feat?.properties?.NAME ?? iso;
                onCountryClick(iso, name);
              }}
            />
          );
        })}

        {/* User country highlight */}
        {userCountry && (() => {
          const [px, py] = FLAT_POSITIONS[userCountry.code] || [50, 50];
          const x = (px / 100) * 1000;
          const y = (py / 100) * 500;
          return (
            <g>
              <circle cx={x} cy={y} r="12" fill="none" stroke="#00FF88" strokeWidth="2" className="animate-ping" opacity={0.6} />
              <circle cx={x} cy={y} r="6" fill="#00FF88" opacity={0.9} />
              <circle cx={x} cy={y} r="3" fill="white" />
            </g>
          );
        })()}

        {/* Vote Ripples */}
        {ripples.map(rp => (
          <g key={rp.id}>
            {[0, 1, 2].map(i => (
              <circle
                key={i}
                cx={rp.x}
                cy={rp.y}
                r={20 + i * 20}
                fill="none"
                stroke="#00FF88"
                strokeWidth="2"
                opacity={0}
              >
                <animate attributeName="r" from={10} to={80 + i*20} dur="1.5s" begin={`${i*0.2}s`} fill="freeze" />
                <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" begin={`${i*0.2}s`} fill="freeze" />
              </circle>
            ))}
            <circle cx={rp.x} cy={rp.y} r="8" fill="#00FF88">
              <animate attributeName="r" from="8" to="2" dur="0.5s" fill="freeze" />
              <animate attributeName="opacity" from="1" to="0" dur="0.5s" fill="freeze" />
            </circle>
          </g>
        ))}

        {/* Country name labels */}
        {labelData.map(({ code, x, y, votes }) => (
          <g key={code}>
            <circle cx={x} cy={y} r={2 + 4 * Math.sqrt(votes / maxVotes)} fill={getHeatColor(votes, maxVotes)} />
            <text x={x} y={y - 8} textAnchor="middle" fontSize="7" fontWeight="900"
              fill="rgba(255,255,255,0.75)" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
              {code}
            </text>
          </g>
        ))}

        {/* Heat Legend */}
        <g transform="translate(820, 460)">
          <text x="0" y="-6" fontSize="6" fontWeight="900" fill="rgba(255,255,255,0.3)" fontFamily="monospace">HEAT SCALE</text>
          <defs>
            <linearGradient id="heatGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(138,43,226,0.7)" />
              <stop offset="50%" stopColor="rgba(0,243,255,0.8)" />
              <stop offset="100%" stopColor="rgba(0,255,136,1)" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="6" rx="3" fill="url(#heatGrad)" />
          <text x="0" y="16" fontSize="5.5" fill="rgba(255,255,255,0.3)" fontFamily="monospace">Low</text>
          <text x="78" y="16" fontSize="5.5" fill="rgba(255,255,255,0.3)" fontFamily="monospace">High</text>
        </g>
      </svg>

      {/* Active nodes */}
      <div className="absolute bottom-4 left-4 hidden md:block pointer-events-none">
        <div className="glassmorphism px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">
            {Object.keys(stats).length} {t('globeNodes')}
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Language, getT } from '@/constants/i18n';
import { COUNTRY_DATA } from '@/constants/countryData';

// Country code → approx normalized map position [x%, y%] for 2D flat map
// Positions derived dynamically from lat/lng in countryData.ts
const FLAT_COORDS_MAP: Record<string, [number, number]> = COUNTRY_DATA.reduce(
  (acc: Record<string, [number, number]>, c) => {
    const x = ((c.lng + 180) / 360) * 100;
    const latRad = (c.lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = 50 - (mercN / Math.PI) * 50;
    acc[c.code] = [x, Math.max(0, Math.min(100, y))];
    return acc;
  },
  {}
);

function getHeatColor(votes: number, maxVotes: number): string {
  if (maxVotes === 0 || votes === 0) return 'rgba(0,0,0,0)';
  const ratio = Math.sqrt(votes / maxVotes);
  const r = Math.round(10 + 45 * ratio);
  const g = Math.round(40 + 157 * ratio);
  const b = Math.round(20 + 77 * ratio);
  return `rgba(${r},${g},${b},${0.4 + 0.6 * ratio})`;
}

interface FlatMapProps {
  stats: Record<string, number>;
  lastVoteCountry?: string;
  userCountry?: { code: string; name: string; flag: string; lat: number; lng: number; nameKo: string } | null;
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

  // 100% Real-time data
  const mergedStats = useMemo(() => {
    const m: Record<string, number> = {};
    for (const [c, v] of Object.entries(stats)) m[c] = (m[c]||0) + v;
    return m;
  }, [stats]);

  const maxVotes = useMemo(() => Math.max(1, ...Object.values(mergedStats)), [mergedStats]);

  // Fetch world GeoJSON for node generation
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then(d => setCountries(d.features))
      .catch(() => {});
  }, []);

  // Convert lng/lat to SVG x/y
  const project = useCallback((lng: number, lat: number): [number, number] => {
    const x = ((lng + 180) / 360) * 1000;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = 250 - (mercN / Math.PI) * 250;
    return [x, Math.max(0, Math.min(500, y))];
  }, []);

  // Neural Grid Generation (Performance optimized)
  const gridNodes = useMemo(() => {
    if (countries.length === 0) return [];
    
    const nodes: any[] = [];
    const step = 8; // Density of the grid
    
    // Create a simplified country bounding box/lookup for speed
    // This is a mockup of the neural grid logic
    // In a real implementation, we'd use a canvas or a more complex spatial check
    // Here we'll use the existing FLAT_POSITIONS to create "hot zones"
    Object.entries(FLAT_COORDS_MAP).forEach(([code, pos]) => {
      const votes = mergedStats[code] || 0;
      const x = (pos[0] / 100) * 1000;
      const y = (pos[1] / 100) * 500;
      
      // Generate clusters around major nodes
      const clusterSize = votes > 500 ? 5 : 3;
      for (let i = 0; i < clusterSize; i++) {
        for (let j = 0; j < clusterSize; j++) {
           nodes.push({
             id: `${code}-${i}-${j}`,
             x: x + (i - clusterSize/2) * 12,
             y: y + (j - clusterSize/2) * 12,
             votes,
             code
           });
        }
      }
    });
    
    return nodes;
  }, [countries, mergedStats]);

  // Trigger ripple on vote
  useEffect(() => {
    if (!lastVoteCountry) return;
    const pos = FLAT_COORDS_MAP[lastVoteCountry];
    if (!pos) return;
    const x = (pos[0] / 100) * 1000;
    const y = (pos[1] / 100) * 500;
    const id = ++rippleId.current;
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 2000);
  }, [lastVoteCountry]);

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 bg-black/40 backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.5)]">
      {/* Title */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 bg-[#37C561] rounded-full animate-pulse shadow-[0_0_8px_#37C561]" />
          <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[#37C561]/80">Fandom Grid Active</p>
        </div>
        <h2 className="text-2xl font-black italic tracking-tighter text-white">
          FAN <span className="text-neon-magenta">SYNC</span>
        </h2>
      </div>

      {/* Stats legend */}
      <div className="absolute top-6 right-6 z-10 flex flex-col items-end gap-1">
         <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Signal Strength</p>
         <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-1.5 h-3 rounded-sm ${i < 3 ? 'bg-[#37C561]' : 'bg-zinc-800'}`} />
            ))}
         </div>
      </div>

      <svg
        viewBox="0 0 1000 500"
        className="w-full h-auto cursor-crosshair"
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="rgba(55, 197, 97, 0.8)" />
            <stop offset="100%" stopColor="rgba(55, 197, 97, 0)" />
          </radialGradient>
          <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
             <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.05)" />
          </pattern>
        </defs>
        
        <rect width="1000" height="500" fill="url(#dotGrid)" />

        {/* Neural Grid Nodes */}
        {gridNodes.map((node) => {
          const ratio = Math.min(1, Math.sqrt(node.votes / maxVotes));
          const color = node.votes > 800 ? '#37C561' : (node.votes > 400 ? '#7CFFAB' : '#FF00FF');
          const size = 1.5 + ratio * 4;
          
          return (
            <g key={node.id} className="transition-transform duration-500 hover:scale-150 cursor-pointer" 
               onClick={() => onCountryClick(node.code, COUNTRY_DATA.find(c => c.code === node.code)?.name || node.code)}>
              <circle 
                cx={node.x} 
                cy={node.y} 
                r={size * 2} 
                fill={color} 
                opacity={0.1 * ratio}
                className="animate-pulse"
              />
              <circle 
                cx={node.x} 
                cy={node.y} 
                r={size} 
                fill={color}
              />
            </g>
          );
        })}

        {/* User Node highlight */}
        {userCountry && (() => {
          const pos = FLAT_COORDS_MAP[userCountry.code] || [50, 50];
          const x = (pos[0] / 100) * 1000;
          const y = (pos[1] / 100) * 500;
          return (
            <g>
              <circle cx={x} cy={y} r="20" fill="none" stroke="#37C561" strokeWidth="1" className="animate-ping" opacity={0.4} />
              <path d={`M${x-15},${y} L${x+15},${y} M${x},${y-15} L${x},${y+15}`} stroke="#37C561" strokeWidth="0.5" opacity={0.5} />
              <rect x={x-2} y={y-2} width="4" height="4" fill="white" />
            </g>
          );
        })()}

        {/* Ripples */}
        {ripples.map(rp => (
           <circle key={rp.id} cx={rp.x} cy={rp.y} r="0" fill="none" stroke="#37C561" strokeWidth="2">
             <animate attributeName="r" from="0" to="150" dur="2s" fill="freeze" />
             <animate attributeName="opacity" from="0.6" to="0" dur="2s" fill="freeze" />
           </circle>
        ))}
      </svg>

      {/* Footer Info */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
        <div className="space-y-1">
          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none">Global Sync Status</p>
          <p className="text-xs font-mono text-[#37C561] font-black">ENCRYPTED_LINK_ESTABLISHED</p>
        </div>
        <div className="text-right">
          <p className="text-[24px] font-black italic tracking-tighter text-white opacity-20">2D_SCAN_V.2.0</p>
        </div>
      </div>
    </div>
  );
}

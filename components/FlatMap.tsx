'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Language } from '@/constants/i18n';
import { COUNTRY_DATA } from '@/constants/countryData';

/* ─── 좌표 유틸 ──────────────────────────────────────────── */
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

// ─── ISO_A2 → 표준 코드 정규화 맵 ───────────────────────────
// GeoJSON의 ISO_A2가 -1이거나 비표준인 경우 대응
const ISO_A2_OVERRIDE: Record<string, string> = {
  '-99': '',   // 없는 국가
  '-1': '',    // 없는 국가
  'XK': 'XK', // 코소보 (비UN)
};

// ─── 숫자 코드 → ISO_A2 (TopoJSON 폴백용) ───────────────────
// GeoJSON 소스가 숫자 ID를 쓸 경우에만 사용
const NUM2CODE: Record<string, string> = {
  // 아시아
  '410': 'KR', '392': 'JP', '156': 'CN', '764': 'TH', '608': 'PH', '360': 'ID',
  '704': 'VN', '458': 'MY', '356': 'IN', '702': 'SG', '096': 'BN', '116': 'KH',
  '418': 'LA', '104': 'MM', '050': 'BD', '144': 'LK', '524': 'NP', '064': 'BT',
  '462': 'MV', '586': 'PK', '004': 'AF', '496': 'MN', '408': 'KP', '158': 'TW',
  // 중동
  '364': 'IR', '368': 'IQ', '400': 'JO', '414': 'KW', '422': 'LB', '512': 'OM',
  '634': 'QA', '760': 'SY', '784': 'AE', '887': 'YE', '682': 'SA', '275': 'PS',
  '048': 'BH', '376': 'IL',
  // 중앙아시아
  '398': 'KZ', '417': 'KG', '762': 'TJ', '795': 'TM', '860': 'UZ',
  // 코카서스
  '031': 'AZ', '051': 'AM', '268': 'GE',
  // 아메리카
  '840': 'US', '124': 'CA', '076': 'BR', '484': 'MX', '032': 'AR', '152': 'CL',
  '170': 'CO', '604': 'PE', '862': 'VE', '218': 'EC', '068': 'BO', '600': 'PY',
  '858': 'UY', '591': 'PA', '188': 'CR', '340': 'HN', '222': 'SV', '320': 'GT',
  '558': 'NI', '192': 'CU', '214': 'DO', '332': 'HT', '388': 'JM', '630': 'PR',
  '328': 'GY', '740': 'SR', '084': 'BZ', '780': 'TT',
  // 유럽
  '826': 'GB', '250': 'FR', '276': 'DE', '380': 'IT', '724': 'ES', '792': 'TR',
  '643': 'RU', '040': 'AT', '056': 'BE', '100': 'BG', '191': 'HR', '196': 'CY',
  '203': 'CZ', '208': 'DK', '372': 'IE', '300': 'GR', '348': 'HU', '428': 'LV',
  '440': 'LT', '442': 'LU', '470': 'MT', '528': 'NL', '578': 'NO', '616': 'PL',
  '620': 'PT', '642': 'RO', '703': 'SK', '705': 'SI', '752': 'SE', '756': 'CH',
  '804': 'UA', '246': 'FI', '352': 'IS', '008': 'AL', '070': 'BA', '807': 'MK',
  '499': 'ME', '688': 'RS', '112': 'BY', '498': 'MD', '233': 'EE',
  // 오세아니아
  '036': 'AU', '554': 'NZ', '598': 'PG', '242': 'FJ', '090': 'SB', '548': 'VU',
  '882': 'WS', '776': 'TO',
  // 아프리카 - 북부
  '818': 'EG', '504': 'MA', '012': 'DZ', '788': 'TN', '434': 'LY', '729': 'SD',
  // 아프리카 - 서부
  '566': 'NG', '288': 'GH', '686': 'SN', '466': 'ML', '854': 'BF', '562': 'NE',
  '384': 'CI', '694': 'SL', '324': 'GN', '624': 'GW', '430': 'LR', '204': 'BJ',
  '768': 'TG', '270': 'GM', '132': 'CV',
  // 아프리카 - 중부
  '180': 'CD', '178': 'CG', '120': 'CM', '140': 'CF', '148': 'TD',
  '266': 'GA', '226': 'GQ', '024': 'AO', '678': 'ST',
  // 아프리카 - 동부
  '404': 'KE', '231': 'ET', '834': 'TZ', '800': 'UG', '706': 'SO', '262': 'DJ',
  '232': 'ER', '728': 'SS', '450': 'MG', '508': 'MZ', '454': 'MW', '894': 'ZM',
  '646': 'RW', '108': 'BI', '174': 'KM',
  // 아프리카 - 남부
  '710': 'ZA', '516': 'NA', '072': 'BW', '716': 'ZW', '748': 'SZ', '426': 'LS',
};

const COUNTRY_FLAGS: Record<string, string> = Object.fromEntries(COUNTRY_DATA.map(c => [c.code, c.flag]));
const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(COUNTRY_DATA.map(c => [c.code, c.name]));
const COUNTRY_NAMES_KO: Record<string, string> = Object.fromEntries(COUNTRY_DATA.map(c => [c.code, c.nameKo]));

/* ─── 히트맵 색상 ─────────────────────────────────────────── */
function getHeatColor(votes: number, maxVotes: number): string {
  if (!votes || maxVotes === 0) return '#111111';
  const r = Math.sqrt(votes / maxVotes);
  if (r < 0.15) return `rgba(20,55,30,${(0.5 + r * 2).toFixed(2)})`;
  if (r < 0.4) return `rgba(${Math.round(20 + 30 * r)},${Math.round(80 + 100 * r)},${Math.round(40 + 60 * r)},0.85)`;
  if (r < 0.7) return `rgba(${Math.round(55 + 80 * r)},${Math.round(180 + 30 * r)},${Math.round(60 + 20 * r)},0.9)`;
  return `rgba(${Math.round(150 + 80 * r)},${Math.round(220 + 30 * r)},${Math.round(50 + 30 * r)},0.95)`;
}

/* ─── 상수 ───────────────────────────────────────────────── */
const SVG_W = 1000;
const SVG_H = 480;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const DRAG_THRESH = 6;

/* ─── 타입 ───────────────────────────────────────────────── */
export interface ArtistStat {
  id: string;
  name: string;
  image?: string;
  votes: number;
}

interface FlatMapProps {
  stats: Record<string, number>;
  countryArtistStats?: Record<string, ArtistStat[]>;
  detailedVotes?: Record<string, Record<string, number>>;
  artists?: Array<{ id: string; name: string; image?: string }>;
  lastVoteCountry?: string;
  userCountry?: { code: string; name: string; flag: string; lat: number; lng: number; nameKo: string } | null;
  onCountryClick: (code: string, name: string) => void;
  lang: Language;
}

interface Ripple { id: number; x: number; y: number }
interface TooltipState { visible: boolean; x: number; y: number; code: string; votes: number }
interface Transform { x: number; y: number; scale: number }
interface PanelState { open: boolean; code: string }

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const RANK_BAR_COLORS = ['#bcfe00', '#7CFF8A', '#37C561', '#2d7a45', '#1a4a2a'];

/* ═══════════════════════════════════════════════════════════ */
export default function FlatMap({
  stats,
  countryArtistStats = {},
  detailedVotes = {},
  artists = [],
  lastVoteCountry,
  userCountry,
  onCountryClick,
  lang,
}: FlatMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [geoFeatures, setGeoFeatures] = useState<any[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, code: '', votes: 0 });
  const [panel, setPanel] = useState<PanelState>({ open: false, code: '' });
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const containerSizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      if (!e) return;
      const { width, height } = e.contentRect;
      containerSizeRef.current = { w: width, h: height };
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    containerSizeRef.current = { w: rect.width, h: rect.height };
    setContainerSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, []);

  const txRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  txRef.current = transform;

  const rippleId = useRef(0);
  const maxVotes = useMemo(() => Math.max(1, ...Object.values(stats)), [stats]);

  /* ─── 아티스트 데이터 resolve ─────────────────────────── */
  const resolveArtists = useCallback((code: string): ArtistStat[] => {
    if (detailedVotes[code] && Object.keys(detailedVotes[code]).length > 0) {
      return Object.entries(detailedVotes[code])
        .map(([id, votes]) => {
          const a = artists.find(a => a.id === id);
          return { id, name: a?.name ?? id, image: a?.image, votes };
        })
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 5);
    }
    return (countryArtistStats[code] || []).slice(0, 5);
  }, [detailedVotes, artists, countryArtistStats]);

  /* ─── clamp ───────────────────────────────────────────── */
  const clamp = useCallback((t: Transform, _w: number, _h: number): Transform => {
    const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, t.scale));
    const maxX = Math.max(0, (SVG_W * scale - SVG_W) / 2);
    const maxY = Math.max(0, (SVG_H * scale - SVG_H) / 2);
    return {
      scale,
      x: Math.max(-maxX, Math.min(maxX, t.x)),
      y: Math.max(-maxY, Math.min(maxY, t.y)),
    };
  }, []);

  /* ─── zoom helpers ────────────────────────────────────── */
  const zoomAt = useCallback((screenCx: number, screenCy: number, factor: number) => {
    const { w, h } = containerSizeRef.current;
    if (!w || !h) return;
    const renderScale = w / SVG_W;
    const cx = screenCx / renderScale;
    const cy = screenCy / renderScale;
    setTransform(prev => {
      const s = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.scale * factor));
      const r = s / prev.scale;
      return clamp({ scale: s, x: cx - r * (cx - prev.x), y: cy - r * (cy - prev.y) }, w, h);
    });
  }, [clamp]);

  const zoomIn = useCallback(() => zoomAt(0, 0, 1.5), [zoomAt]);
  const zoomOut = useCallback(() => {
    setTransform(prev => clamp({ ...prev, scale: Math.max(MIN_ZOOM, prev.scale / 1.5) }, 0, 0));
  }, [clamp]);
  const resetZoom = useCallback(() => setTransform({ x: 0, y: 0, scale: 1 }), []);

  /* ─── wheel zoom ──────────────────────────────────────── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const { w, h } = containerSizeRef.current;
      zoomAt(
        e.clientX - rect.left - w / 2,
        e.clientY - rect.top - h / 2,
        e.deltaY < 0 ? 1.15 : 1 / 1.15,
      );
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoomAt]);

  /* ─── Pointer Events ──────────────────────────────────── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ptrs = new Map<number, { lastX: number; lastY: number }>();
    let drag: {
      startX: number; startY: number;
      snapX: number; snapY: number; snapScale: number;
      didDrag: boolean; pointerId: number;
    } | null = null;
    let pinchSnap: {
      midX: number; midY: number; dist: number;
      tx: number; ty: number; scale: number;
    } | null = null;
    let downTarget: EventTarget | null = null;

    const getTwo = (): [number, number] | null => {
      const ids = [...ptrs.keys()];
      if (ids.length < 2) return null;
      return [ids[0], ids[1]];
    };

    const calcPinch = (id1: number, id2: number) => {
      const a = ptrs.get(id1)!;
      const b = ptrs.get(id2)!;
      return {
        midX: (a.lastX + b.lastX) / 2,
        midY: (a.lastY + b.lastY) / 2,
        dist: Math.hypot(a.lastX - b.lastX, a.lastY - b.lastY),
      };
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { lastX: e.clientX, lastY: e.clientY });
      downTarget = e.target;

      if (ptrs.size === 1) {
        drag = {
          startX: e.clientX, startY: e.clientY,
          snapX: txRef.current.x, snapY: txRef.current.y, snapScale: txRef.current.scale,
          didDrag: false, pointerId: e.pointerId,
        };
        pinchSnap = null;
      } else if (ptrs.size === 2) {
        drag = null;
        const two = getTwo()!;
        const p = calcPinch(two[0], two[1]);
        const rect = el.getBoundingClientRect();
        const { w } = containerSizeRef.current;
        const renderScale = w / SVG_W;
        pinchSnap = {
          midX: (p.midX - rect.left - w / 2) / renderScale,
          midY: (p.midY - rect.top - (w / SVG_W * SVG_H) / 2) / renderScale,
          dist: p.dist,
          tx: txRef.current.x,
          ty: txRef.current.y,
          scale: txRef.current.scale,
        };
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { lastX: e.clientX, lastY: e.clientY });

      const { w } = containerSizeRef.current;
      if (!w) return;
      const renderScale = w / SVG_W;
      const rect = el.getBoundingClientRect();

      if (ptrs.size >= 2 && pinchSnap) {
        const two = getTwo()!;
        const cur = calcPinch(two[0], two[1]);
        const curMidX = (cur.midX - rect.left - w / 2) / renderScale;
        const curMidY = (cur.midY - rect.top - (w / SVG_W * SVG_H) / 2) / renderScale;
        const ratio = cur.dist / pinchSnap.dist;
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchSnap.scale * ratio));
        const r = newScale / pinchSnap.scale;
        const newX = pinchSnap.midX + (pinchSnap.tx - pinchSnap.midX) * r + (curMidX - pinchSnap.midX);
        const newY = pinchSnap.midY + (pinchSnap.ty - pinchSnap.midY) * r + (curMidY - pinchSnap.midY);
        e.preventDefault();
        setTransform(clamp({ scale: newScale, x: newX, y: newY }, 0, 0));
      } else if (ptrs.size === 1 && drag && e.pointerId === drag.pointerId) {
        const dxScreen = e.clientX - drag.startX;
        const dyScreen = e.clientY - drag.startY;
        if (!drag.didDrag && (Math.abs(dxScreen) > DRAG_THRESH || Math.abs(dyScreen) > DRAG_THRESH)) {
          drag.didDrag = true;
          setTooltip(t => ({ ...t, visible: false }));
        }
        if (!drag.didDrag) return;
        e.preventDefault();
        const dx = dxScreen / renderScale;
        const dy = dyScreen / renderScale;
        setTransform(clamp(
          { scale: drag.snapScale, x: drag.snapX + dx, y: drag.snapY + dy },
          0, 0,
        ));
      }
    };

    const onUp = (e: PointerEvent) => {
      e.preventDefault();
      const wasDrag = drag?.didDrag ?? true;
      const wasThisPointer = drag?.pointerId === e.pointerId;

      ptrs.delete(e.pointerId);

      if (ptrs.size === 0) {
        if (!wasDrag && wasThisPointer) {
          const upTarget = e.target as HTMLElement;
          const countryPath =
            upTarget.closest('[data-code]') ??
            (downTarget as HTMLElement)?.closest('[data-code]');
          const countryCode = countryPath?.getAttribute('data-code');
          if (countryCode) {
            handleCountryClick(countryCode);
          }
        }
        drag = null;
        pinchSnap = null;
        downTarget = null;
      } else if (ptrs.size === 1) {
        pinchSnap = null;
        const remainId = [...ptrs.keys()][0];
        const rem = ptrs.get(remainId)!;
        drag = {
          startX: rem.lastX, startY: rem.lastY,
          snapX: txRef.current.x,
          snapY: txRef.current.y,
          snapScale: txRef.current.scale,
          didDrag: false, pointerId: remainId,
        };
      }
    };

    const onCancel = (e: PointerEvent) => {
      ptrs.delete(e.pointerId);
      if (ptrs.size === 0) { drag = null; pinchSnap = null; }
    };

    el.addEventListener('pointerdown', onDown, { passive: false });
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp, { passive: false });
    el.addEventListener('pointercancel', onCancel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamp, panel]);

  /* ─── Mercator projection ─────────────────────────────── */
  const project = useCallback((lng: number, lat: number): [number, number] => {
    const cLat = Math.max(-85, Math.min(85, lat));
    const x = ((lng + 180) / 360) * SVG_W;
    const mercN = Math.log(Math.tan(Math.PI / 4 + (cLat * Math.PI / 180) / 2));
    const y = (SVG_H / 2) - (mercN / Math.PI) * (SVG_H / 2);
    return [x, Math.max(0, Math.min(SVG_H, y))];
  }, []);

  const coordsToPath = useCallback((coords: number[][]): string => {
    if (!coords || coords.length < 3) return '';
    const pts = coords.map(c => project(c[0], c[1]));
    return pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join('') + 'Z';
  }, [project]);

  const featureToPath = useCallback((geometry: any): string => {
    if (!geometry) return '';
    let d = '';
    if (geometry.type === 'Polygon')
      for (const r of geometry.coordinates) d += coordsToPath(r);
    else if (geometry.type === 'MultiPolygon')
      for (const p of geometry.coordinates) for (const r of p) d += coordsToPath(r);
    return d;
  }, [coordsToPath]);

  /* ─── GeoJSON 로드 ────────────────────────────────────── */
  // ISO_A2를 직접 사용하는 Natural Earth GeoJSON 소스 사용
  // → NUM2CODE 매핑 불필요, 누락 국가 문제 근본 해결
  // → GlobeMap과 동일한 방식
  useEffect(() => {
    (async () => {
      try {
        // 1순위: unpkg Natural Earth (CORS 안전)
        const res = await fetch(
          'https://unpkg.com/world-atlas@2/countries-110m.json'
        );
        const topo = await res.json();
        const sc = topo.transform?.scale || [1, 1];
        const tr = topo.transform?.translate || [0, 0];
        const arcs = topo.arcs.map((arc: number[][]) => {
          let x = 0, y = 0;
          return arc.map(([dx, dy]: number[]) => {
            x += dx; y += dy;
            return [x * sc[0] + tr[0], y * sc[1] + tr[1]];
          });
        });
        const stitch = (idx: any[]): number[][] => {
          const out: number[][] = [];
          for (const i of idx) {
            const a = i >= 0 ? arcs[i] : [...arcs[~i]].reverse();
            out.push(...(out.length ? a.slice(1) : a));
          }
          return out;
        };
        setGeoFeatures(
          topo.objects.countries.geometries
            .map((g: any) => {
              const numId = g.id != null ? String(g.id).padStart(3, '0') : null;
              const code = numId ? (NUM2CODE[numId] || '') : '';
              return {
                code,
                geometry:
                  g.type === 'Polygon'
                    ? { type: 'Polygon', coordinates: (g.arcs as any[][]).map((r: any[]) => stitch(r)) }
                    : g.type === 'MultiPolygon'
                      ? { type: 'MultiPolygon', coordinates: (g.arcs as any[][][]).map((p: any[][]) => p.map((r: any[]) => stitch(r))) }
                      : null,
              };
            })
            .filter((f: any) => f.code && f.code.length === 2)
        );
      } catch (e) {
        console.error('GeoJSON load failed', e);
      }
    })();
  }, []);

  /* ─── ripple ──────────────────────────────────────────── */
  useEffect(() => {
    if (!lastVoteCountry) return;
    const pos = FLAT_COORDS_MAP[lastVoteCountry];
    if (!pos) return;
    const id = ++rippleId.current;
    setRipples(r => [...r, { id, x: (pos[0] / 100) * SVG_W, y: (pos[1] / 100) * SVG_H }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 2000);
  }, [lastVoteCountry]);

  /* ─── tooltip ─────────────────────────────────────────── */
  const showTooltip = useCallback((e: React.PointerEvent, code: string, votes: number) => {
    if (e.pointerType !== 'mouse' || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: Math.max(4, Math.min(e.clientX - rect.left + 14, rect.width - 160)),
      y: Math.max(4, Math.min(e.clientY - rect.top - 10, rect.height - 100)),
      code, votes,
    });
  }, []);

  const moveTooltip = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTooltip(prev => ({
      ...prev,
      x: Math.max(4, Math.min(e.clientX - rect.left + 14, rect.width - 160)),
      y: Math.max(4, Math.min(e.clientY - rect.top - 10, rect.height - 100)),
    }));
  }, []);

  const hideTooltip = useCallback(() => setTooltip(t => ({ ...t, visible: false })), []);

  /* ─── country click ───────────────────────────────────── */
  const handleCountryClick = useCallback((code: string) => {
    hideTooltip();
    const isToggle = panel.open && panel.code === code;
    setPanel(isToggle ? { open: false, code: '' } : { open: true, code });
    if (!isToggle) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
      });
    }
    onCountryClick(code, COUNTRY_NAMES[code] || code);
  }, [panel, onCountryClick, hideTooltip]);

  /* ─── panel data ──────────────────────────────────────── */
  const panelName = lang === 'KO'
    ? (COUNTRY_NAMES_KO[panel.code] || COUNTRY_NAMES[panel.code] || panel.code)
    : (COUNTRY_NAMES[panel.code] || panel.code);
  const panelFlag = COUNTRY_FLAGS[panel.code] || '🌐';
  const panelTotal = stats[panel.code] || 0;
  const panelArtists = resolveArtists(panel.code);
  const panelMax = Math.max(1, ...panelArtists.map(a => a.votes));
  const strokeW = Math.max(0.2, 0.4 / transform.scale);
  const strokeHoverW = Math.max(0.4, 0.8 / transform.scale);

  const globalTotalVotes = Object.values(stats).reduce((a, b) => a + b, 0);
  const countryShare = globalTotalVotes > 0 ? ((panelTotal / globalTotalVotes) * 100).toFixed(1) : '0.0';

  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col gap-3">

      {/* ── 지도 컨테이너 ────────────────────────────────── */}
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#090909] shadow-[0_0_60px_rgba(0,0,0,0.6)] select-none"
        style={{
          touchAction: transform.scale <= 1.02 ? 'pan-y' : 'none',
          cursor: transform.scale > 1 ? 'grab' : 'default',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onPointerLeave={hideTooltip}
      >
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-auto block"
          style={{ display: 'block', userSelect: 'none' }}
        >
          <defs>
            <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.03)" />
            </pattern>
            <clipPath id="mapClip">
              <rect x="0" y="0" width={SVG_W} height={SVG_H} />
            </clipPath>
          </defs>
          <rect width={SVG_W} height={SVG_H} fill="#090909" />
          <rect width={SVG_W} height={SVG_H} fill="url(#dotGrid)" />

          <g
            clipPath="url(#mapClip)"
            style={{
              transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`,
              transformOrigin: `${SVG_W / 2}px ${SVG_H / 2}px`,
            }}
          >
            {geoFeatures.map((feat, i) => {
              const code = feat.code;
              if (!code) return null;
              const votes = stats[code] || 0;
              const d = featureToPath(feat.geometry);
              if (!d) return null;
              const selected = panel.open && panel.code === code;
              return (
                <path
                  key={`f-${code}-${i}`}
                  d={d}
                  data-code={code}
                  fill={selected ? '#1a3d26' : getHeatColor(votes, maxVotes)}
                  stroke={selected ? '#bcfe00' : 'rgba(255,255,255,0.10)'}
                  strokeWidth={selected ? strokeHoverW * 2 : strokeW}
                  strokeLinejoin="round"
                  style={{
                    transition: 'fill 0.3s',
                    cursor: 'pointer',
                    pointerEvents: 'all',
                  }}
                  onPointerEnter={e => showTooltip(e, code, votes)}
                  onPointerMove={moveTooltip}
                  onPointerLeave={hideTooltip}
                  onPointerOver={e => {
                    if (selected) return;
                    (e.target as SVGPathElement).setAttribute('stroke', 'rgba(255,255,255,0.45)');
                    (e.target as SVGPathElement).setAttribute('stroke-width', String(strokeHoverW));
                  }}
                  onPointerOut={e => {
                    if (selected) return;
                    (e.target as SVGPathElement).setAttribute('stroke', 'rgba(255,255,255,0.10)');
                    (e.target as SVGPathElement).setAttribute('stroke-width', String(strokeW));
                  }}
                />
              );
            })}

            {/* ripple */}
            {ripples.map(rp => (
              <circle key={rp.id} cx={rp.x} cy={rp.y} r="0" fill="none"
                stroke="#37C561" strokeWidth="1.5" opacity="0.5"
                style={{ pointerEvents: 'none' }}>
                <animate attributeName="r" from="0" to="120" dur="2s" fill="freeze" />
                <animate attributeName="opacity" from="0.5" to="0" dur="2s" fill="freeze" />
              </circle>
            ))}
          </g>
        </svg>

        {/* ── 줌 버튼 ────────────────────────────────────── */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-20">
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={zoomIn}
            className="w-8 h-8 rounded-xl bg-[#111]/90 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:border-white/25 transition-all active:scale-95 shadow-lg"
            aria-label="Zoom in"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <line x1="6.5" y1="1" x2="6.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="1" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={zoomOut}
            className="w-8 h-8 rounded-xl bg-[#111]/90 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:border-white/25 transition-all active:scale-95 shadow-lg"
            aria-label="Zoom out"
          >
            <svg width="13" height="4" viewBox="0 0 13 4" fill="none">
              <line x1="1" y1="2" x2="12" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {transform.scale > 1.05 && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={resetZoom}
              className="w-8 h-8 rounded-xl bg-[#37C561]/15 border border-[#37C561]/30 backdrop-blur-sm flex items-center justify-center text-[#37C561] hover:bg-[#37C561]/25 transition-all active:scale-95 shadow-lg"
              aria-label="Reset zoom"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6a4 4 0 1 1 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M2 4v2H4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* 줌 레벨 */}
        {transform.scale > 1.05 && (
          <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
            <span className="text-[10px] font-mono font-bold text-[#37C561]/70 tracking-widest">
              {transform.scale.toFixed(1)}×
            </span>
          </div>
        )}

        {/* 범례 */}
        <div className="absolute top-4 right-4 z-10 pointer-events-none flex flex-col items-end gap-1">
          <div className="flex items-center gap-0.5">
            {['#1a371e', '#2d6e42', '#37C561', '#7CFF8A', '#bcfe00'].map(c => (
              <div key={c} style={{ background: c }} className="w-3.5 h-1.5 first:rounded-l-full last:rounded-r-full" />
            ))}
          </div>
          <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Low → High</p>
        </div>

        {/* Live 뱃지 */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#37C561] rounded-full animate-pulse shadow-[0_0_6px_#37C561]" />
          <p className="text-[9px] uppercase tracking-[0.2em] font-black text-[#37C561]/60">Live</p>
        </div>

        {/* 클릭 힌트 */}
        {!panel.open && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="#37C561" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              </svg>
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                {lang === 'KO' ? '국가를 클릭하세요' : 'Click a country'}
              </span>
            </div>
          </div>
        )}

        {/* 호버 툴팁 (마우스 전용) */}
        {tooltip.visible && tooltip.code && !panel.open && (
          <div
            className="absolute pointer-events-none z-50 bg-[#0d0d0d]/95 border border-white/15 rounded-2xl px-3 py-2.5 min-w-[130px] backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="text-lg">{COUNTRY_FLAGS[tooltip.code] || '🌐'}</div>
            <div className="text-[10px] font-black text-white/80 uppercase tracking-wider mt-1.5">
              {lang === 'KO'
                ? (COUNTRY_NAMES_KO[tooltip.code] || COUNTRY_NAMES[tooltip.code])
                : (COUNTRY_NAMES[tooltip.code] || tooltip.code)}
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[15px] font-black text-[#bcfe00]">{tooltip.votes.toLocaleString()}</span>
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest">{lang === 'KO' ? '표' : 'votes'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ══ 국가 랭킹 패널 ══════════════════════════════════ */}
      <div
        ref={panelRef}
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{
          maxHeight: panel.open ? '600px' : '0px',
          opacity: panel.open ? 1 : 0,
          transform: panel.open ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        {panel.open && panel.code && (
          <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]">

            {/* ── 헤더 ── */}
            <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.05]">
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top left, #37C561, transparent 60%)' }}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <div className="text-4xl leading-none">{panelFlag}</div>
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#37C561] rounded-full border-2 border-[#0a0a0a] shadow-[0_0_6px_#37C561]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-[#37C561]/50 uppercase tracking-[0.25em] leading-none mb-1">
                      {lang === 'KO' ? '지역 랭킹' : 'Regional Ranking'}
                    </p>
                    <h3 className="text-xl font-black text-white tracking-tight leading-tight truncate">
                      {panelName}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#bcfe00] tabular-nums leading-none">
                        {panelTotal.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest">
                        {lang === 'KO' ? '표' : 'votes'}
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-600 font-black mt-0.5">
                      {lang === 'KO' ? `글로벌 ${countryShare}%` : `${countryShare}% global`}
                    </p>
                  </div>
                  <button
                    onClick={() => setPanel({ open: false, code: '' })}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* ── 콘텐츠 ── */}
            <div className="p-5">
              {panelArtists.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8" stroke="#3f3f3f" strokeWidth="1.5" />
                      <path d="M10 7v4M10 13v.5" stroke="#3f3f3f" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-zinc-600 text-sm font-black">
                    {lang === 'KO' ? '아직 투표 데이터가 없습니다' : 'No votes yet'}
                  </p>
                  <p className="text-zinc-700 text-[10px] font-black uppercase tracking-widest">
                    {lang === 'KO' ? '첫 번째로 투표해보세요!' : 'Be the first to vote!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {panelArtists.length >= 1 && (
                    <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.25em] mb-3">
                        {lang === 'KO' ? '🏆 TOP 아티스트' : '🏆 Top Artists'}
                      </p>
                      <div className={`grid gap-3 ${panelArtists.slice(0, 3).length === 1 ? 'grid-cols-1' : panelArtists.slice(0, 3).length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {panelArtists.slice(0, 3).map((artist, idx) => {
                          const medalColor = MEDAL_COLORS[idx];
                          const medals = ['🥇', '🥈', '🥉'];
                          const pct = Math.round((artist.votes / panelMax) * 100);
                          const isFirst = idx === 0;
                          return (
                            <div
                              key={artist.id}
                              className="relative flex flex-col items-center gap-2 rounded-2xl p-4"
                              style={{
                                background: isFirst
                                  ? `linear-gradient(135deg, ${medalColor}0d, ${medalColor}05)`
                                  : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${medalColor}${isFirst ? '30' : '18'}`,
                                boxShadow: isFirst ? `0 0 20px ${medalColor}10` : 'none',
                              }}
                            >
                              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-base leading-none">
                                {medals[idx]}
                              </span>
                              {artist.image ? (
                                <img
                                  src={artist.image}
                                  alt={artist.name}
                                  className="w-14 h-14 rounded-full object-cover mt-1"
                                  style={{ border: `2px solid ${medalColor}50` }}
                                />
                              ) : (
                                <div
                                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black mt-1"
                                  style={{
                                    background: `${medalColor}15`,
                                    border: `2px solid ${medalColor}40`,
                                    color: medalColor,
                                  }}
                                >
                                  {artist.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span
                                className="text-[11px] font-black text-center leading-tight w-full truncate px-1"
                                style={{ color: isFirst ? medalColor : 'rgba(255,255,255,0.8)' }}
                                title={artist.name}
                              >
                                {artist.name}
                              </span>
                              <div className="flex flex-col items-center gap-1 w-full">
                                <span className="text-[13px] font-black tabular-nums" style={{ color: medalColor }}>
                                  {artist.votes.toLocaleString()}
                                </span>
                                <div className="w-full h-[3px] rounded-full bg-white/5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${pct}%`,
                                      background: `linear-gradient(90deg, ${medalColor}60, ${medalColor})`,
                                      transition: 'width 0.8s ease',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {Array.from({ length: Math.max(0, 3 - Math.min(3, panelArtists.length)) }).map((_, i) => (
                          <div
                            key={`empty-${i}`}
                            className="flex flex-col items-center justify-center gap-2 rounded-2xl py-4 border border-dashed border-white/5"
                          >
                            <span className="text-2xl opacity-15">?</span>
                            <span className="text-[9px] text-zinc-700 font-black uppercase tracking-wider">
                              {lang === 'KO' ? '없음' : 'No data'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {panelArtists.length > 3 && (
                    <div>
                      <div className="h-px bg-white/[0.04] mb-4" />
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.25em] mb-3">
                        {lang === 'KO' ? '그 외 순위' : 'Others'}
                      </p>
                      <div className="space-y-3">
                        {panelArtists.slice(3).map((artist, idx) => {
                          const realIdx = idx + 3;
                          const bar = Math.round((artist.votes / panelMax) * 100);
                          const color = RANK_BAR_COLORS[realIdx] ?? '#1a4a2a';
                          return (
                            <div key={artist.id} className="flex items-center gap-3">
                              <span className="text-[11px] font-black w-4 text-right shrink-0 tabular-nums" style={{ color }}>
                                {realIdx + 1}
                              </span>
                              {artist.image ? (
                                <img src={artist.image} alt={artist.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/10" />
                              ) : (
                                <div
                                  className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-black"
                                  style={{ background: `${color}18`, border: `1px solid ${color}30`, color: `${color}99` }}
                                >
                                  {artist.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[13px] font-bold text-white/90 truncate leading-none">{artist.name}</span>
                                  <span className="text-[12px] font-black ml-2 shrink-0 tabular-nums" style={{ color }}>
                                    {artist.votes.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-[3px] rounded-full bg-white/5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${bar}%`,
                                      background: `linear-gradient(90deg, ${color}55, ${color})`,
                                      transition: 'width 0.7s ease',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import Globe from 'globe.gl';
import { 
  Globe as GlobeIcon, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  Flame, 
  Skull, 
  Heart, 
  Users, 
  MapPin,
  Moon,
  Sun,
  Layers
} from 'lucide-react';
import { CountryAudienceStats, GlobeLightPoint } from '../lib/audienceService';
import { FlagImage } from './FlagImage';

// Ensure global THREE is available for globe.gl submodules
if (typeof window !== 'undefined') {
  (window as any).THREE = THREE;
}

// In-memory cache for GeoJSON to prevent multiple fetches across tabs
let cachedCountriesGeoJson: any = null;

interface GuardianGlobeProps {
  stats: CountryAudienceStats[];
  lights: GlobeLightPoint[];
  personajeName: string;
  personajeNationality?: string;
  totalVotes: number;
  onSelectCountry?: (country: string) => void;
}

type MapTextureMode = 'satellite' | 'night' | 'dark';

const TEXTURE_URLS: Record<MapTextureMode, { globe: string; bump: string; name: string }> = {
  satellite: {
    globe: '/earth-blue-marble.jpg',
    bump: '/earth-topology.png',
    name: 'Satelital (Blue Marble)'
  },
  night: {
    globe: '/earth-night.jpg',
    bump: '/earth-topology.png',
    name: 'Nocturno (Luces de Ciudades)'
  },
  dark: {
    globe: '/earth-dark.jpg',
    bump: '/earth-topology.png',
    name: 'Topográfico Oscuro'
  }
};

// Helper to build 2D Canvas Sprites for Country Labels with 100% UTF-8 accent support (e.g. Perú)
const createCountryLabelSprite = (text: string, color: string = '#facc15') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Group();

  canvas.width = 512;
  canvas.height = 128;

  // Crisp sans-serif font supporting all unicode accents natively
  ctx.font = 'bold 32px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  const paddingX = 26;
  const badgeWidth = Math.min(490, Math.max(160, textWidth + paddingX * 2));
  const badgeHeight = 56;
  const x = (512 - badgeWidth) / 2;
  const y = (128 - badgeHeight) / 2;
  const radius = 16;

  // Translucent dark badge pill
  ctx.fillStyle = 'rgba(10, 16, 31, 0.88)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, badgeWidth, badgeHeight, radius);
  } else {
    ctx.rect(x, y, badgeWidth, badgeHeight);
  }
  ctx.fill();

  // Vibrant accent border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // High contrast white text with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(spriteMat);
  // Scale in Globe units: width 11, height 2.75
  sprite.scale.set(11, 2.75, 1);
  return sprite;
};

export const GuardianGlobe: React.FC<GuardianGlobeProps> = ({
  stats,
  lights,
  personajeName,
  personajeNationality,
  totalVotes,
  onSelectCountry
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);

  // Interaction State
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'fan' | 'simp' | 'hater' | 'conozco'>('all');
  const [selectedGender, setSelectedGender] = useState<'all' | 'm' | 'f'>('all');
  const [autoRotate, setAutoRotate] = useState(false);
  const [textureMode, setTextureMode] = useState<MapTextureMode>('satellite');
  const [showBorders, setShowBorders] = useState(true);

  // Filtered lights by Attitude AND Gender
  const activeLights = useMemo(() => {
    return lights.filter(l => {
      if (l.type === 'home') return true;

      if (selectedFilter !== 'all' && l.type !== selectedFilter) {
        return false;
      }

      if (selectedGender !== 'all') {
        if (l.gender !== selectedGender) return false;
      }

      return true;
    });
  }, [lights, selectedFilter, selectedGender]);

  // Counts for attitude tabs
  const filterCounts = useMemo(() => {
    const counts = { all: totalVotes, fan: 0, simp: 0, hater: 0, conozco: 0 };
    stats.forEach(s => {
      counts.fan += s.fanCount;
      counts.simp += s.simpCount;
      counts.hater += s.haterCount;
      counts.conozco += s.conozcoCount;
    });
    return counts;
  }, [stats, totalVotes]);

  // Counts for gender filter buttons - SCOPED DIRECTLY TO SELECTED ATTITUDE
  const genderCounts = useMemo(() => {
    if (selectedFilter === 'all') {
      let m = 0;
      let f = 0;
      stats.forEach(s => {
        m += s.maleCount;
        f += s.femaleCount;
      });
      return { all: totalVotes, m, f };
    }

    // When an attitude is selected (e.g. Fans), calculate ONLY for that attitude
    let m = 0;
    let f = 0;
    let all = 0;

    stats.forEach(s => {
      if (s.byActitud && s.byActitud[selectedFilter]) {
        const actData = s.byActitud[selectedFilter];
        m += actData.m;
        f += actData.f;
        all += actData.total;
      } else {
        let baseCount = 0;
        if (selectedFilter === 'fan') baseCount = s.fanCount;
        else if (selectedFilter === 'simp') baseCount = s.simpCount;
        else if (selectedFilter === 'hater') baseCount = s.haterCount;
        else if (selectedFilter === 'conozco') baseCount = s.conozcoCount;

        all += baseCount;
        const ratioM = s.totalInteractions > 0 ? s.maleCount / s.totalInteractions : 0;
        const ratioF = s.totalInteractions > 0 ? s.femaleCount / s.totalInteractions : 0;
        m += Math.round(baseCount * ratioM);
        f += Math.round(baseCount * ratioF);
      }
    });

    return { all, m, f };
  }, [stats, totalVotes, selectedFilter]);

  // Helper to get filtered count for a country
  const getCountryCount = (st: CountryAudienceStats): number => {
    if (selectedFilter === 'all') {
      if (selectedGender === 'm') return st.maleCount;
      if (selectedGender === 'f') return st.femaleCount;
      return st.totalInteractions;
    }

    const actData = st.byActitud?.[selectedFilter];
    if (actData) {
      if (selectedGender === 'm') return actData.m;
      if (selectedGender === 'f') return actData.f;
      return actData.total;
    }

    let baseCount = 0;
    if (selectedFilter === 'fan') baseCount = st.fanCount;
    else if (selectedFilter === 'simp') baseCount = st.simpCount;
    else if (selectedFilter === 'hater') baseCount = st.haterCount;
    else if (selectedFilter === 'conozco') baseCount = st.conozcoCount;

    if (selectedGender === 'all') return baseCount;
    const genderRatio = st.totalInteractions > 0
      ? (selectedGender === 'm' ? st.maleCount / st.totalInteractions : st.femaleCount / st.totalInteractions)
      : 0;
    return Math.round(baseCount * genderRatio);
  };

  // Labels layer for countries with votes - using 2D Canvas Sprite to guarantee 100% full UTF-8 accent support (e.g. Perú)
  const countryLabelsData = useMemo(() => {
    return stats
      .filter(s => getCountryCount(s) > 0 || s.isHomeCountry)
      .map(st => {
        const count = getCountryCount(st);
        let suffix = `${count} ${count === 1 ? 'voto' : 'votos'}`;
        if (selectedGender === 'm') suffix = `${count} ${count === 1 ? 'hombre' : 'hombres'}`;
        else if (selectedGender === 'f') suffix = `${count} ${count === 1 ? 'mujer' : 'mujeres'}`;

        // Ensure correct Unicode spelling (fix "Per?" -> "Perú")
        let countryName = st.country;
        if (countryName.toLowerCase() === 'peru' || countryName.toLowerCase() === 'perú' || countryName.toLowerCase().startsWith('per')) {
          countryName = 'Perú';
        }

        let color = '#facc15';
        if (st.isHomeCountry) color = '#10b981';
        else if (selectedFilter === 'simp') color = '#f97316';
        else if (selectedFilter === 'hater') color = '#c084fc';
        else if (selectedFilter === 'conozco') color = '#38bdf8';
        else if (selectedGender === 'm') color = '#38bdf8';
        else if (selectedGender === 'f') color = '#f472b6';

        return {
          lat: st.lat,
          lng: st.lng,
          country: countryName,
          text: `${countryName} (${suffix})`,
          color
        };
      });
  }, [stats, selectedFilter, selectedGender]);

  // Initialize Globe.gl
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const globe = new Globe(container)
      .globeImageUrl(TEXTURE_URLS[textureMode].globe)
      .bumpImageUrl(TEXTURE_URLS[textureMode].bump)
      .backgroundColor('rgba(0,0,0,0)')
      .atmosphereColor('#38bdf8')
      .atmosphereAltitude(0.2)
      .showAtmosphere(true)
      .width(container.clientWidth || 400)
      .height(container.clientHeight || 500)
      // 1. Guardian Lights Points (lying flat on map surface, organic constellations)
      .pointsData(activeLights)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor('color')
      .pointAltitude((d: any) => d.altitude || 0.005)
      .pointRadius((d: any) => d.radius || 0.08)
      .pointResolution(24)
      .pointLabel((d: any) => `
        <div style="background: rgba(10, 16, 31, 0.95); border: 1px solid ${d.color}; padding: 6px 12px; border-radius: 10px; color: #ffffff; font-family: system-ui, sans-serif; font-size: 12px; box-shadow: 0 0 15px ${d.color}66; pointer-events: none;">
          <div style="font-weight: 700; color: ${d.color}; text-transform: uppercase; font-size: 11px;">
            ${d.type === 'home' ? '🏠 País de Origen' : d.type}
          </div>
          <div style="font-weight: 600; font-size: 13px; margin-top: 2px;">${d.userName || d.label || d.country}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 1px;">📍 ${d.country}</div>
        </div>
      `)
      .onPointClick((d: any) => {
        if (onSelectCountry) onSelectCountry(d.country);
        globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1200);
      })
      // 2. Country Labels using 2D Canvas Sprite (Supports all UTF-8 characters like Perú)
      .objectsData(countryLabelsData)
      .objectLat('lat')
      .objectLng('lng')
      .objectAltitude(0.04)
      .objectThreeObject((d: any) => createCountryLabelSprite(d.text, d.color))
      .onObjectClick((d: any) => {
        if (onSelectCountry) onSelectCountry(d.country);
        globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1200);
      });

    globeInstanceRef.current = globe;

    // Configure Orbit Controls
    // Configure Orbit Controls & Deep Zoom
    const controls = globe.controls();
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.6;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // Allow zooming in much closer to the ground (default is often 100+, minDistance allows close-up examination)
    controls.minDistance = 101.5;
    controls.maxDistance = 600;

    // Set Initial Perspective View
    globe.pointOfView({ lat: 15, lng: -40, altitude: 2.4 });

    // Load Country Borders from local GeoJSON file
    const applyGeoJson = (geo: any) => {
      globe
        .polygonsData(showBorders ? geo.features : [])
        .polygonCapColor(() => 'rgba(0, 0, 0, 0.0)')
        .polygonSideColor(() => 'rgba(56, 189, 248, 0.08)')
        .polygonStrokeColor(() => 'rgba(56, 189, 248, 0.65)')
        .polygonAltitude(0.006)
        .polygonLabel(({ properties: d }: any) => `
          <div style="background: rgba(10, 16, 31, 0.95); border: 1px solid rgba(56, 189, 248, 0.5); padding: 5px 10px; border-radius: 8px; color: white; font-family: system-ui, sans-serif; font-size: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.6); pointer-events: none;">
            <b style="color: #38bdf8;">${d.NAME || d.ADMIN}</b> <span style="color: #94a3b8; font-size: 11px;">(${d.ISO_A2 || ''})</span>
          </div>
        `)
        .onPolygonClick(({ properties: d }: any) => {
          const countryName = d.NAME || d.ADMIN;
          if (onSelectCountry) onSelectCountry(countryName);
        });
    };

    if (cachedCountriesGeoJson) {
      applyGeoJson(cachedCountriesGeoJson);
    } else {
      fetch('/ne_110m_admin_0_countries.geojson')
        .then(r => r.json())
        .then(data => {
          cachedCountriesGeoJson = data;
          applyGeoJson(data);
        })
        .catch(err => {
          console.warn('Could not load local country borders GeoJSON:', err);
        });
    }

    // Resize Observer
    const handleResize = () => {
      if (containerRef.current && globeInstanceRef.current) {
        globeInstanceRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight || 500);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeInstanceRef.current && globeInstanceRef.current._destructor) {
        globeInstanceRef.current._destructor();
      }
      container.innerHTML = '';
      globeInstanceRef.current = null;
    };
  }, []);

  // Update Points & Labels whenever data changes
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current
      .pointsData(activeLights)
      .objectsData(countryLabelsData);
  }, [activeLights, countryLabelsData]);

  // Update Auto-Rotate
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    const controls = globeInstanceRef.current.controls();
    if (controls) {
      controls.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Update Texture Mode
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current
      .globeImageUrl(TEXTURE_URLS[textureMode].globe)
      .bumpImageUrl(TEXTURE_URLS[textureMode].bump);
  }, [textureMode]);

  // Update Borders Visibility
  useEffect(() => {
    if (!globeInstanceRef.current || !cachedCountriesGeoJson) return;
    globeInstanceRef.current.polygonsData(showBorders ? cachedCountriesGeoJson.features : []);
  }, [showBorders]);

  // Zoom Handlers - allows deep close-up examination down to 0.08 altitude
  const handleZoom = (deltaAlt: number) => {
    if (!globeInstanceRef.current) return;
    const pov = globeInstanceRef.current.pointOfView();
    const nextAlt = Math.max(0.08, Math.min(3.5, pov.altitude + deltaAlt));
    globeInstanceRef.current.pointOfView({ ...pov, altitude: nextAlt }, 300);
  };

  const handleResetView = () => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.pointOfView({ lat: 15, lng: -40, altitude: 2.4 }, 800);
  };

  const cycleTexture = () => {
    setTextureMode(prev => {
      if (prev === 'satellite') return 'night';
      if (prev === 'night') return 'dark';
      return 'satellite';
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info Panel */}
      <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <GlobeIcon className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
                Radar Mundial de Audiencia
                <span className="text-[10px] font-normal lowercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-zinc-400">
                  {totalVotes} {totalVotes === 1 ? 'voto registrado' : 'votos registrados'}
                </span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400 max-w-xl">
              Inspirado en el mapa de <strong className="text-amber-300">El Origen de los Guardianes</strong>: cada punto de luz representa a un usuario real que ha votado por <span className="text-white font-semibold">{personajeName}</span> en todo el planeta.
            </p>
          </div>

          {personajeNationality && (
            <div className="flex items-center gap-2 bg-[#181822] border border-white/10 px-3 py-2 rounded-xl text-xs shrink-0 self-start sm:self-auto">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Origen:</span>
              <FlagImage countryName={personajeNationality} size="sm" />
              <span className="font-semibold text-emerald-400">{personajeNationality}</span>
            </div>
          )}
        </div>

        {/* Attitude & Gender Filter Controls */}
        <div className="mt-5 space-y-3 border-t border-white/5 pt-4">
          
          {/* Attitude Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-1 hidden sm:inline">Actitud:</span>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Todos ({filterCounts.all})</span>
            </button>

            <button
              onClick={() => setSelectedFilter('fan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedFilter === 'fan'
                  ? 'bg-[#facc15] text-black shadow-[0_0_15px_rgba(250,204,21,0.35)]'
                  : 'bg-white/5 text-zinc-400 hover:text-amber-300 hover:bg-white/10'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Fans ({filterCounts.fan})</span>
            </button>

            <button
              onClick={() => setSelectedFilter('simp')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedFilter === 'simp'
                  ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.35)]'
                  : 'bg-white/5 text-zinc-400 hover:text-orange-400 hover:bg-white/10'
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>SIMPs ({filterCounts.simp})</span>
            </button>

            <button
              onClick={() => setSelectedFilter('hater')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedFilter === 'hater'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                  : 'bg-white/5 text-zinc-400 hover:text-purple-400 hover:bg-white/10'
              }`}
            >
              <Skull className="w-3.5 h-3.5 text-purple-400" />
              <span>Haters ({filterCounts.hater})</span>
            </button>

            <button
              onClick={() => setSelectedFilter('conozco')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedFilter === 'conozco'
                  ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.35)]'
                  : 'bg-white/5 text-zinc-400 hover:text-sky-400 hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Conozco ({filterCounts.conozco})</span>
            </button>
          </div>

          {/* Gender Demographics Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-1 hidden sm:inline">Filtrar por Sexo:</span>
            
            <button
              onClick={() => setSelectedGender('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedGender === 'all'
                  ? 'bg-zinc-200 text-zinc-950 font-bold shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>🌐 Ambos sexos ({genderCounts.all})</span>
            </button>

            <button
              onClick={() => setSelectedGender('m')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedGender === 'm'
                  ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                  : 'bg-white/5 text-zinc-400 hover:text-sky-300 hover:bg-white/10'
              }`}
            >
              <span>👨 Hombres ({genderCounts.m})</span>
            </button>

            <button
              onClick={() => setSelectedGender('f')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedGender === 'f'
                  ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(244,114,182,0.4)]'
                  : 'bg-white/5 text-zinc-400 hover:text-pink-300 hover:bg-white/10'
              }`}
            >
              <span>👩 Mujeres ({genderCounts.f})</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3D Globe Stage Container */}
      <div className="relative bg-[#020308] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[460px] sm:min-h-[520px]">
        
        {/* Background cosmic radial effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(249,115,22,0.06)_0%,transparent_60%)] pointer-events-none" />

        {/* 3D Canvas Mount */}
        <div 
          ref={containerRef} 
          className="w-full h-[460px] sm:h-[520px] cursor-grab active:cursor-grabbing relative z-10"
        />

        {/* Top-Right Floating Control Bar */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-[#0a101f]/85 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-xl">
          <button
            onClick={() => handleZoom(-0.35)}
            title="Acercar (Zoom In)"
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom(0.35)}
            title="Alejar (Zoom Out)"
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetView}
            title="Centrar vista"
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowBorders(!showBorders)}
            title={showBorders ? 'Ocultar fronteras geopolíticas' : 'Mostrar fronteras geopolíticas'}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              showBorders ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-400 hover:text-white bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={cycleTexture}
            title={`Textura actual: ${TEXTURE_URLS[textureMode].name}. Clic para cambiar.`}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center border-t border-white/5 mt-0.5"
          >
            {textureMode === 'satellite' ? (
              <Sun className="w-4 h-4 text-emerald-400" />
            ) : textureMode === 'night' ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : (
              <GlobeIcon className="w-4 h-4 text-sky-400" />
            )}
          </button>
        </div>

        {/* Bottom instructions badge */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-between">
          <div className="bg-[#0a101f]/85 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Arrastra para girar · Rueda para zoom · {TEXTURE_URLS[textureMode].name}</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 bg-[#0a101f]/85 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-zinc-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#facc15]" /> Fan</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]" /> Simp</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#c084fc]" /> Hater</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Conozco</span>
          </div>
        </div>
      </div>

      {/* Country Breakdown Leaderboard */}
      <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <h4 className="text-sm font-extrabold uppercase tracking-widest text-white">
              Desglose Geográfico por Países
            </h4>
          </div>
          <span className="text-xs text-zinc-500">
            {stats.filter(s => getCountryCount(s) > 0).length} {stats.filter(s => getCountryCount(s) > 0).length === 1 ? 'país activo' : 'países activos'}
          </span>
        </div>

        {stats.filter(s => getCountryCount(s) > 0).length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">
              {selectedFilter === 'all' && selectedGender === 'all'
                ? '¡Sé la primera luz en el mapa!'
                : 'Sin registros para este filtro'}
            </p>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              {selectedFilter === 'all' && selectedGender === 'all'
                ? `Aún no hay votos con país registrado para ${personajeName}. Marca tu actitud (Fan, Simp, Hater o Te Conozco) en la parte superior para encender tu nación en el globo terráqueo.`
                : `Aún no hay votos registrados de ${selectedFilter === 'fan' ? 'Fans' : selectedFilter === 'simp' ? 'SIMPs' : selectedFilter === 'hater' ? 'Haters' : selectedFilter === 'conozco' ? 'Conozco' : 'audiencia'}${selectedGender === 'm' ? ' (Hombres)' : selectedGender === 'f' ? ' (Mujeres)' : ''} para ${personajeName}.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {stats
              .filter(s => getCountryCount(s) > 0)
              .map((st, index) => {
                const count = getCountryCount(st);

                // Scope demographic counts strictly to the active attitude filter
                let countryMale = st.maleCount;
                let countryFemale = st.femaleCount;
                let countryBaseTotal = st.totalInteractions;

                if (selectedFilter !== 'all') {
                  const actData = st.byActitud?.[selectedFilter];
                  if (actData) {
                    countryMale = actData.m;
                    countryFemale = actData.f;
                    countryBaseTotal = actData.total;
                  } else {
                    countryBaseTotal = count;
                    const ratioM = st.totalInteractions > 0 ? st.maleCount / st.totalInteractions : 0;
                    const ratioF = st.totalInteractions > 0 ? st.femaleCount / st.totalInteractions : 0;
                    countryMale = Math.round(count * ratioM);
                    countryFemale = Math.round(count * ratioF);
                  }
                }

                const pctMale = countryBaseTotal > 0 ? Math.round((countryMale / countryBaseTotal) * 100) : 0;
                const pctFemale = countryBaseTotal > 0 ? Math.round((countryFemale / countryBaseTotal) * 100) : 0;

                return (
                  <div
                    key={st.country}
                    className="bg-[#161620] hover:bg-[#1c1c28] border border-white/5 hover:border-white/10 rounded-xl p-3.5 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-zinc-500 w-4">#{index + 1}</span>
                        <FlagImage countryName={st.country} size="sm" />
                        <span className="text-xs font-bold text-white">{st.country}</span>
                        {st.isHomeCountry && (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">
                            Origen
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-amber-400">
                        {selectedGender === 'm'
                          ? `${countryMale} ${countryMale === 1 ? 'hombre' : 'hombres'}`
                          : selectedGender === 'f'
                          ? `${countryFemale} ${countryFemale === 1 ? 'mujer' : 'mujeres'}`
                          : `${count} ${count === 1 ? 'voto' : 'votos'}`}
                      </span>
                    </div>

                    {/* Progress bar of percentage by attitude */}
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden flex">
                      {st.fanCount > 0 && (
                        <div 
                          style={{ width: `${(st.fanCount / st.totalInteractions) * 100}%` }} 
                          className="bg-[#facc15] h-full" 
                          title={`Fans: ${st.fanCount}`}
                        />
                      )}
                      {st.simpCount > 0 && (
                        <div 
                          style={{ width: `${(st.simpCount / st.totalInteractions) * 100}%` }} 
                          className="bg-orange-500 h-full" 
                          title={`SIMPs: ${st.simpCount}`}
                        />
                      )}
                      {st.haterCount > 0 && (
                        <div 
                          style={{ width: `${(st.haterCount / st.totalInteractions) * 100}%` }} 
                          className="bg-purple-500 h-full" 
                          title={`Haters: ${st.haterCount}`}
                        />
                      )}
                      {st.conozcoCount > 0 && (
                        <div 
                          style={{ width: `${(st.conozcoCount / st.totalInteractions) * 100}%` }} 
                          className="bg-sky-400 h-full" 
                          title={`Conozco: ${st.conozcoCount}`}
                        />
                      )}
                    </div>

                    {/* Mini badges breakdown by attitude */}
                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 pt-0.5">
                      {st.fanCount > 0 && (
                        <span className="flex items-center gap-1 text-[#facc15]">
                          <Heart className="w-2.5 h-2.5 fill-current" /> {st.fanCount}
                        </span>
                      )}
                      {st.simpCount > 0 && (
                        <span className="flex items-center gap-1 text-orange-400">
                          <Flame className="w-2.5 h-2.5 fill-current" /> {st.simpCount}
                        </span>
                      )}
                      {st.haterCount > 0 && (
                        <span className="flex items-center gap-1 text-purple-400">
                          <Skull className="w-2.5 h-2.5" /> {st.haterCount}
                        </span>
                      )}
                      {st.conozcoCount > 0 && (
                        <span className="flex items-center gap-1 text-sky-400">
                          <Users className="w-2.5 h-2.5" /> {st.conozcoCount}
                        </span>
                      )}
                    </div>

                    {/* Demographic breakdown by sex (Hombre / Mujer) for current attitude */}
                    {(countryMale > 0 || countryFemale > 0) && (
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-sky-400 font-medium flex items-center gap-1">
                            ♂ {countryMale} {countryMale === 1 ? 'hombre' : 'hombres'} ({pctMale}%)
                          </span>
                          <span className="text-pink-400 font-medium flex items-center gap-1">
                            ♀ {countryFemale} {countryFemale === 1 ? 'mujer' : 'mujeres'} ({pctFemale}%)
                          </span>
                        </div>
                        <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden flex">
                          {countryMale > 0 && (
                            <div
                              style={{ width: `${pctMale}%` }}
                              className="bg-sky-500 h-full"
                              title={`Hombres: ${countryMale} (${pctMale}%)`}
                            />
                          )}
                          {countryFemale > 0 && (
                            <div
                              style={{ width: `${pctFemale}%` }}
                              className="bg-pink-500 h-full"
                              title={`Mujeres: ${countryFemale} (${pctFemale}%)`}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

    </div>
  );
};

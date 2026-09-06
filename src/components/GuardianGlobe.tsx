import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import Globe from 'globe.gl';
import { 
  Globe as GlobeIcon, 
  RotateCcw, 
  Play, 
  Pause, 
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
  const [autoRotate, setAutoRotate] = useState(true);
  const [textureMode, setTextureMode] = useState<MapTextureMode>('satellite');
  const [showBorders, setShowBorders] = useState(true);

  // Filtered lights
  const activeLights = useMemo(() => {
    if (selectedFilter === 'all') return lights;
    return lights.filter(l => l.type === selectedFilter || l.type === 'home');
  }, [lights, selectedFilter]);

  // Counts for tabs
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

  // Concentric pulsing radar rings for countries with votes
  const ringsData = useMemo(() => {
    return stats
      .filter(s => s.totalInteractions > 0 || s.isHomeCountry)
      .map(st => ({
        lat: st.lat,
        lng: st.lng,
        maxR: Math.min(st.totalInteractions * 2.2 + 5, 18),
        propagationSpeed: 1.4,
        repeatPeriod: 1200,
        color: () => st.isHomeCountry ? 'rgba(16, 185, 129, 0.85)' : 'rgba(249, 115, 22, 0.85)'
      }));
  }, [stats]);

  // Labels layer for countries with votes
  const labelsData = useMemo(() => {
    return stats
      .filter(s => s.totalInteractions > 0 || s.isHomeCountry)
      .map(st => ({
        lat: st.lat,
        lng: st.lng,
        text: `${st.country} (${st.totalInteractions})`,
        size: 0.9,
        color: st.isHomeCountry ? '#10b981' : '#facc15'
      }));
  }, [stats]);

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
      // 1. Guardian Lights Points
      .pointsData(activeLights)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor('color')
      .pointAltitude(0.04)
      .pointRadius(0.75)
      .pointResolution(32)
      .pointLabel((d: any) => `
        <div style="background: rgba(10, 16, 31, 0.95); border: 1px solid ${d.color}; padding: 6px 12px; border-radius: 10px; color: #ffffff; font-family: system-ui, sans-serif; font-size: 12px; box-shadow: 0 0 15px ${d.color}66; pointer-events: none;">
          <div style="font-weight: 700; color: ${d.color}; text-transform: uppercase; font-size: 11px;">
            ${d.type === 'home' ? '🏠 País de Origen' : d.type}
          </div>
          <div style="font-weight: 600; font-size: 13px; margin-top: 2px;">${d.label}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 1px;">📍 ${d.country}</div>
        </div>
      `)
      .onPointClick((d: any) => {
        if (onSelectCountry) onSelectCountry(d.country);
        globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1200);
      })
      // 2. Concentric Radar Rings
      .ringsData(ringsData)
      .ringLat('lat')
      .ringLng('lng')
      .ringColor('color')
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod')
      // 3. Country Labels
      .labelsData(labelsData)
      .labelLat('lat')
      .labelLng('lng')
      .labelText('text')
      .labelSize('size')
      .labelColor('color')
      .labelDotRadius(0.3)
      .labelResolution(2);

    globeInstanceRef.current = globe;

    // Configure Orbit Controls
    const controls = globe.controls();
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.6;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

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

  // Update Points & Rings whenever data changes
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current
      .pointsData(activeLights)
      .ringsData(ringsData)
      .labelsData(labelsData);
  }, [activeLights, ringsData, labelsData]);

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

  // Zoom Handlers
  const handleZoom = (deltaAlt: number) => {
    if (!globeInstanceRef.current) return;
    const pov = globeInstanceRef.current.pointOfView();
    const nextAlt = Math.max(0.6, Math.min(3.5, pov.altitude + deltaAlt));
    globeInstanceRef.current.pointOfView({ ...pov, altitude: nextAlt }, 350);
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

        {/* Attitude Filter Tabs */}
        <div className="mt-5 flex flex-wrap gap-1.5 border-t border-white/5 pt-4">
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
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pausar rotación automática' : 'Reanudar rotación automática'}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              autoRotate ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-400 hover:text-white bg-white/5'
            }`}
          >
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleZoom(-0.4)}
            title="Acercar (Zoom In)"
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom(0.4)}
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
            {stats.filter(s => s.totalInteractions > 0).length} países activos
          </span>
        </div>

        {stats.filter(s => s.totalInteractions > 0).length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">¡Sé la primera luz en el mapa!</p>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Aún no hay votos con país registrado para {personajeName}. Marca tu actitud (Fan, Simp, Hater o Te Conozco) en la parte superior para encender tu nación en el globo terráqueo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {stats
              .filter(s => s.totalInteractions > 0)
              .map((st, index) => (
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
                      {st.totalInteractions} {st.totalInteractions === 1 ? 'voto' : 'votos'}
                    </span>
                  </div>

                  {/* Progress bar of percentage */}
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

                  {/* Mini badges breakdown */}
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
                </div>
              ))}
          </div>
        )}
      </div>

    </div>
  );
};

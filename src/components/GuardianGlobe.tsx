import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
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
  Info,
  MapPin
} from 'lucide-react';
import { CountryAudienceStats, GlobeLightPoint } from '../lib/audienceService';
import { latLngToVector3 } from '../data/countryCoordinates';
import { FlagImage } from './FlagImage';

const COLOR_MAP: Record<string, string> = {
  fan: '#facc15',
  simp: '#f97316',
  hater: '#c084fc',
  conozco: '#38bdf8',
  home: '#10b981'
};

// Global singleton texture cache to prevent any re-computation or re-download
let cachedEarthTexture: THREE.CanvasTexture | null = null;

function getOrCreateEarthTexture(): THREE.CanvasTexture {
  if (cachedEarthTexture) {
    return cachedEarthTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dark oceanic background
    ctx.fillStyle = '#09090e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Parallels (Latitude lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Meridians (Longitude lines)
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Equator & Prime Meridian highlight
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Stylized glowing dot-matrix for landmasses
    const landClusters: [number, number, number, number][] = [
      [150, 60, 160, 100],
      [200, 160, 100, 60],
      [260, 260, 80, 130],
      [480, 80, 100, 80],
      [490, 170, 110, 150],
      [600, 80, 240, 130],
      [800, 140, 90, 100],
      [820, 310, 100, 70]
    ];

    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    landClusters.forEach(([cx, cy, cw, ch]) => {
      for (let x = cx; x < cx + cw; x += 12) {
        for (let y = cy; y < cy + ch; y += 12) {
          const dx = (x - (cx + cw / 2)) / (cw / 2);
          const dy = (y - (cy + ch / 2)) / (ch / 2);
          if (dx * dx + dy * dy < 0.95 + (Math.sin(x * y) * 0.15)) {
            ctx.beginPath();
            ctx.arc(x, y, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    });
  }

  cachedEarthTexture = new THREE.CanvasTexture(canvas);
  cachedEarthTexture.wrapS = THREE.RepeatWrapping;
  cachedEarthTexture.wrapT = THREE.ClampToEdgeWrapping;
  return cachedEarthTexture;
}

interface GuardianGlobeProps {
  stats: CountryAudienceStats[];
  lights: GlobeLightPoint[];
  personajeName: string;
  personajeNationality?: string;
  totalVotes: number;
  onSelectCountry?: (country: string) => void;
}

export const GuardianGlobe: React.FC<GuardianGlobeProps> = ({
  stats,
  lights,
  personajeName,
  personajeNationality,
  totalVotes,
  onSelectCountry
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Interaction State
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'fan' | 'simp' | 'hater' | 'conozco'>('all');
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<GlobeLightPoint | null>(null);
  const [selectedCountryStats, setSelectedCountryStats] = useState<CountryAudienceStats | null>(null);

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

  // Setup Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 240;
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(100, 80, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-100, -50, -100);
    scene.add(dirLight2);

    // 4. Master Globe Group
    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.25; // Slight tilt
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // 5. In-Memory Procedural Earth Texture (Reused instantly from memory cache)
    const earthTexture = getOrCreateEarthTexture();

    // Inner Dark Core Sphere
    const sphereGeo = new THREE.SphereGeometry(78, 48, 48);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.8,
      metalness: 0.2,
      color: 0x181824
    });
    const earthMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(earthMesh);

    // Glowing Atmosphere Ring
    const atmosphereGeo = new THREE.SphereGeometry(82, 32, 32);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    globeGroup.add(atmosphere);

    // Thin celestial latitude/longitude wireframe ring around globe
    const ringGeo = new THREE.RingGeometry(86, 87, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const celestialRing = new THREE.Mesh(ringGeo, ringMat);
    celestialRing.rotation.x = Math.PI / 2;
    globeGroup.add(celestialRing);

    // Dynamic Lights Group
    const lightsGroup = new THREE.Group();
    globeGroup.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // Interaction handlers (Drag to Rotate & Zoom)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !globeGroupRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - previousMousePosition.x;
      const deltaY = clientY - previousMousePosition.y;

      globeGroupRef.current.rotation.y += deltaX * 0.008;
      globeGroupRef.current.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: clientX, y: clientY };
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z = THREE.MathUtils.clamp(
        cameraRef.current.position.z + e.deltaY * 0.2,
        140,
        340
      );
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    dom.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    // Handle Window Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Auto-rotation if not dragging
      if (globeGroupRef.current && autoRotate && !isDragging) {
        globeGroupRef.current.rotation.y += 0.0035;
      }

      // Animate pulsing lights and rings
      if (lightsGroupRef.current) {
        lightsGroupRef.current.children.forEach((child, index) => {
          const pulse = Math.sin(elapsedTime * 3.5 + index * 0.8) * 0.25 + 1.0;
          child.scale.set(pulse, pulse, pulse);
        });
      }

      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      dom.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);
      renderer.dispose();
    };
  }, [autoRotate]);

  // Update Lights when filtered list changes
  useEffect(() => {
    if (!lightsGroupRef.current) return;
    const group = lightsGroupRef.current;

    // Clear previous light meshes
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    const globeRadius = 78.5;

    // 1. Plot each individual vote point (Guardian of the Lights style)
    activeLights.forEach(light => {
      const [x, y, z] = latLngToVector3(light.lat, light.lng, globeRadius);

      const lightMeshGroup = new THREE.Group();
      lightMeshGroup.position.set(x, y, z);
      lightMeshGroup.lookAt(0, 0, 0);

      // Core Glowing Particle
      const coreGeo = new THREE.SphereGeometry(light.type === 'home' ? 2.2 : 1.4, 12, 12);
      const coreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(light.color),
        transparent: true,
        opacity: 0.95
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      lightMeshGroup.add(core);

      // Soft Luminous Glow Halo
      const haloGeo = new THREE.RingGeometry(1.6, light.type === 'home' ? 4.5 : 3.2, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(light.color),
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      lightMeshGroup.add(halo);

      group.add(lightMeshGroup);
    });

    // 2. Add pulsing Radar Pings for active countries
    stats.forEach(st => {
      if (st.totalInteractions <= 0 && !st.isHomeCountry) return;
      const [cx, cy, cz] = latLngToVector3(st.lat, st.lng, globeRadius);

      const beaconGroup = new THREE.Group();
      beaconGroup.position.set(cx, cy, cz);
      beaconGroup.lookAt(0, 0, 0);

      const ringGeo = new THREE.RingGeometry(3.5, 5.0, 24);
      const ringColor = st.isHomeCountry ? 0x10b981 : 0xf97316;
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      beaconGroup.add(ring);

      group.add(beaconGroup);
    });
  }, [activeLights, stats]);

  // Controls
  const handleZoom = (delta: number) => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = THREE.MathUtils.clamp(
      cameraRef.current.position.z + delta,
      140,
      340
    );
  };

  const handleResetView = () => {
    if (!cameraRef.current || !globeGroupRef.current) return;
    cameraRef.current.position.z = 240;
    globeGroupRef.current.rotation.set(0.25, 0, 0);
  };

  return (
    <div className="space-y-6">
      
      {/* Header card with guardian quote and explanation */}
      <div className="bg-[#111116] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
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
                ? 'bg-[#facc15] text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                : 'bg-white/5 text-zinc-400 hover:text-[#facc15] hover:bg-white/10'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-[#facc15] text-[#facc15]" />
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
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
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
      <div className="relative bg-[#0b0b10] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[440px] sm:min-h-[500px]">
        
        {/* Background cosmic radial effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(249,115,22,0.05)_0%,transparent_60%)] pointer-events-none" />

        {/* 3D Canvas Mount */}
        <div 
          ref={containerRef} 
          className="w-full h-[440px] sm:h-[500px] cursor-grab active:cursor-grabbing relative z-10"
        />

        {/* Top-Right Floating Control Bar */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-[#121218]/90 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-xl">
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
            onClick={() => handleZoom(-30)}
            title="Acercar (Zoom In)"
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom(30)}
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
        </div>

        {/* Bottom instructions badge */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-between">
          <div className="bg-[#121218]/85 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Arrastra para girar · Rueda para zoom</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 bg-[#121218]/85 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-zinc-400">
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

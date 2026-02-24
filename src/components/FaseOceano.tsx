import { Sparkles, Html, PerspectiveCamera, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { HydrothermalVent } from './HydrothermalVent';
import { useGameStore, type EvolutionStage } from '../store/gameStore';
import { LifeParameters } from './LifeParameters';
import { LifeSpawner } from './LifeSpawner';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

// ─── Stage-based interpolation ────────────────────────────────────────────────

const STAGE_ORDER: EvolutionStage[] = ['AminoAcids', 'RNA', 'Protocell', 'Life'];

/**
 * Returns a 0→1 global evolution factor.
 */
function evolutionFactor(stage: EvolutionStage, progress: number): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return (idx + Math.min(progress, 100) / 100) / STAGE_ORDER.length;
}

function lerpColor(a: string, b: string, t: number): THREE.Color {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── Presets for each evolution extreme ───────────────────────────────────────

// Fog / background
const FOG_START = '#002a35';
const FOG_END = '#006677';

// Hemisphere light
const HEMI_SKY_START = '#113344';
const HEMI_SKY_END = '#22aadd';
const HEMI_GND_START = '#0a1e2a';
const HEMI_GND_END = '#004455';

// Spotlight (sun)
const SUN_COLOR_START = '#5577aa';
const SUN_COLOR_END = '#ccddff';

// Sparkles
const SPARKLE_COLOR_START = '#556677';
const SPARKLE_COLOR_END = '#88ffee';

export function FaseOceano() {
  const updateSimulation = useGameStore((state) => state.updateSimulation);
  const parameters = useGameStore((state) => state.parameters);
  const stage = useGameStore((state) => state.stage);
  const progress = useGameStore((state) => state.progress);
  const isMobile = useIsMobile();

  // ── Evolution factor (0 → 1) ─────────────────────────────────────────
  const t = evolutionFactor(stage, progress);

  // ── Mobile adaptations ────────────────────────────────────────────────
  const cameraFov = isMobile ? 65 : 50;
  const orbitRadius = isMobile ? 20 : 15;
  const cameraY = isMobile ? 8 : 5;

  // ── Derived visuals ──────────────────────────────────────────────────
  const fogColor = useMemo(() => lerpColor(FOG_START, FOG_END, t), [t]);
  const fogColorHex = useMemo(() => '#' + fogColor.getHexString(), [fogColor]);
  const hemiSky = useMemo(() => lerpColor(HEMI_SKY_START, HEMI_SKY_END, t), [t]);
  const hemiGround = useMemo(() => lerpColor(HEMI_GND_START, HEMI_GND_END, t), [t]);
  const sunColor = useMemo(() => lerpColor(SUN_COLOR_START, SUN_COLOR_END, t), [t]);
  const sparkleColor = useMemo(() => '#' + lerpColor(SPARKLE_COLOR_START, SPARKLE_COLOR_END, t).getHexString(), [t]);

  const hemiIntensity = lerp(0.4, 0.8, t);
  const sunIntensity = lerp(10, 30, t);
  const sparkleOpacity = lerp(0.2, 0.55, t);
  // ── PERF: Cap sparkles, especially on mobile ──
  const sparkleCount = isMobile ? Math.floor(lerp(20, 70, t)) : Math.floor(lerp(50, 150, t));
  const headlightIntensity = lerp(5, 8, t);

  // Fog limits
  const fogNear = lerp(8, 15, t);
  const fogFar = lerp(45, 70, t);

  // Refs for animated values
  const fogRef = useRef<THREE.Fog>(null!);
  const bgRef = useRef<THREE.Color>(null!);

  // ── Dive-in transition ────────────────────────────────────────────────
  const diveProgress = useRef(0);
  const DIVE_SPEED = 0.6;

  // Loop de Simulação
  useFrame((state, delta) => {
    updateSimulation(delta);

    // ── Dive-in animation (first ~3 seconds) ────────────────────────
    const elapsed = state.clock.getElapsedTime();
    if (diveProgress.current < 0.99) {
      diveProgress.current += (1 - diveProgress.current) * DIVE_SPEED * delta;
      if (diveProgress.current > 0.99) diveProgress.current = 1;
      const dp = diveProgress.current;
      const currentY = 60 + (cameraY - 60) * dp;
      const currentRadius = orbitRadius * dp;
      state.camera.position.set(
        Math.sin(elapsed * 0.05) * currentRadius,
        currentY,
        Math.cos(elapsed * 0.05) * currentRadius,
      );
    } else {
      state.camera.position.set(
        Math.sin(elapsed * 0.05) * orbitRadius,
        cameraY,
        Math.cos(elapsed * 0.05) * orbitRadius,
      );
    }
    state.camera.lookAt(0, 0, 0);

    // Smooth fog color transition
    if (bgRef.current) bgRef.current.lerp(fogColor, 0.02);
    if (fogRef.current) {
      fogRef.current.color.lerp(fogColor, 0.02);
      fogRef.current.near += (fogNear - fogRef.current.near) * 0.02;
      fogRef.current.far += (fogFar - fogRef.current.far) * 0.02;
    }
  });

  // Carregando Texturas do fundo do mar
  const [sandColor, sandNormal, sandRoughness] = useTexture([
    '/textures/Ground054_2K-JPG/sand.jpg',
    '/textures/Ground054_2K-JPG/sand_normal.jpg',
    '/textures/Ground054_2K-JPG/Ground054_2K-JPG_Roughness.jpg',
  ]);

  // Configuração de repetição
  sandColor.wrapS = sandColor.wrapT = THREE.RepeatWrapping;
  sandColor.repeat.set(8, 8);
  sandNormal.wrapS = sandNormal.wrapT = THREE.RepeatWrapping;
  sandNormal.repeat.set(8, 8);
  sandRoughness.wrapS = sandRoughness.wrapT = THREE.RepeatWrapping;
  sandRoughness.repeat.set(8, 8);

  // Sand tint
  const sandTint = useMemo(() => '#' + lerpColor('#666666', '#bbbbbb', t).getHexString(), [t]);

  // Restaura qualidade da areia do fundo como original 
  const floorSubdivisions = 256;

  return (
    <>
      <PerspectiveCamera makeDefault position={[10, cameraY, 10]} fov={cameraFov}>
        <pointLight
          intensity={headlightIntensity}
          distance={20}
          decay={2}
          color="#aaddff"
          position={[0, 0, 0]}
        />
      </PerspectiveCamera>

      <Html fullscreen zIndexRange={[100, 0]}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <LifeParameters />
        </div>
      </Html>

      {/* ── Atmosfera Progressiva ──────────────────────────────────────── */}
      <color ref={bgRef} attach="background" args={[fogColorHex]} />
      <fog ref={fogRef} attach="fog" args={[fogColorHex, fogNear, fogFar]} />

      <hemisphereLight
        intensity={hemiIntensity}
        color={hemiSky}
        groundColor={hemiGround}
      />

      {/* Sol — PERF: shadows completely disabled to save GPU */}
      <spotLight
        position={[0, 50, 0]}
        angle={0.6}
        penumbra={0.5}
        intensity={sunIntensity}
        color={sunColor}
        castShadow={false}
      />

      <Environment preset="night" background={false} />

      {/* ── Fundo do Mar ─────────────────────────────────────────────── */}
      <group position={[0, -6, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100, floorSubdivisions, floorSubdivisions]} />
          <meshStandardMaterial
            map={sandColor}
            normalMap={sandNormal}
            roughnessMap={sandRoughness}
            roughness={1}
            envMapIntensity={0.5}
            color={sandTint}
          />
        </mesh>
      </group>

      {/* Fill light */}
      <pointLight position={[-10, 0, -10]} intensity={lerp(0.5, 2.5, t)} color="#003344" />

      {/* Luz vulcânica */}
      <pointLight
        position={[0, -5, 0]}
        intensity={5 + parameters.temperature * 3}
        color="#ff4400"
        distance={15}
        decay={2}
      />

      {/* ── Partículas ──────────────────────────────────────────────── */}
      <Sparkles
        count={sparkleCount}
        scale={40}
        size={isMobile ? 4 : 6}
        speed={0.4}
        opacity={sparkleOpacity}
        color={sparkleColor}
      />

      {/* ── Eco-sistema ──────────────────────────────────────────────── */}
      <group position={[0, -6, 0]}>
        {/* PERF: 3 vents on mobile, 5 on desktop */}
        <HydrothermalVent position={[0, 0, 0]} />
        <HydrothermalVent position={[-4, 0, 3]} />
        <HydrothermalVent position={[3, 0.5, -3]} />
        {!isMobile && <HydrothermalVent position={[5, -1, 4]} />}
        {!isMobile && <HydrothermalVent position={[-3, 1, -5]} />}

        <LifeSpawner />
      </group>
    </>
  );
}

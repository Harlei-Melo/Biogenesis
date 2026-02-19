import { Sparkles, Html, PerspectiveCamera, Caustics, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { HydrothermalVent } from './HydrothermalVent';
import { useGameStore, type EvolutionStage } from '../store/gameStore';
import { LifeParameters } from './LifeParameters';
import { LifeSpawner } from './LifeSpawner';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';

// ─── Stage-based interpolation ────────────────────────────────────────────────

const STAGE_ORDER: EvolutionStage[] = ['AminoAcids', 'RNA', 'Protocell', 'Life'];

/**
 * Returns a 0→1 global evolution factor.
 * AminoAcids 0%→100% maps to 0.00→0.25
 * RNA        0%→100% maps to 0.25→0.50
 * Protocell  0%→100% maps to 0.50→0.75
 * Life       0%→100% maps to 0.75→1.00
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
const FOG_START = '#000d12';  // Abyssal black-blue (AminoAcids)
const FOG_END = '#004455';  // Rich teal (Life)

// Hemisphere light
const HEMI_SKY_START = '#001122';
const HEMI_SKY_END = '#1199cc';
const HEMI_GND_START = '#000811';
const HEMI_GND_END = '#003344';

// Spotlight (sun)
const SUN_COLOR_START = '#334466'; // dim, cold
const SUN_COLOR_END = '#bbddff'; // bright daylight

// Sparkles
const SPARKLE_COLOR_START = '#445566';
const SPARKLE_COLOR_END = '#88ffee';

// Caustics
const CAUSTIC_COLOR_START = '#223344';
const CAUSTIC_COLOR_END = '#aaffff';

export function FaseOceano() {
  const updateSimulation = useGameStore((state) => state.updateSimulation);
  const parameters = useGameStore((state) => state.parameters);
  const stage = useGameStore((state) => state.stage);
  const progress = useGameStore((state) => state.progress);

  // ── Evolution factor (0 → 1) ─────────────────────────────────────────
  const t = evolutionFactor(stage, progress);

  // ── Derived visuals ──────────────────────────────────────────────────
  const fogColor = useMemo(() => lerpColor(FOG_START, FOG_END, t), [t]);
  const fogColorHex = useMemo(() => '#' + fogColor.getHexString(), [fogColor]);
  const hemiSky = useMemo(() => lerpColor(HEMI_SKY_START, HEMI_SKY_END, t), [t]);
  const hemiGround = useMemo(() => lerpColor(HEMI_GND_START, HEMI_GND_END, t), [t]);
  const sunColor = useMemo(() => lerpColor(SUN_COLOR_START, SUN_COLOR_END, t), [t]);
  const causticColor = useMemo(() => lerpColor(CAUSTIC_COLOR_START, CAUSTIC_COLOR_END, t), [t]);
  const sparkleColor = useMemo(() => '#' + lerpColor(SPARKLE_COLOR_START, SPARKLE_COLOR_END, t).getHexString(), [t]);

  const hemiIntensity = lerp(0.15, 0.7, t);
  const sunIntensity = lerp(5, 25, t);
  const causticIntensity = lerp(0.03, 0.2, t);
  const sparkleOpacity = lerp(0.1, 0.5, t);
  const sparkleCount = Math.floor(lerp(100, 600, t));
  const headlightIntensity = lerp(3, 6, t);

  // Fog limits — far fog fades out as ocean brightens
  const fogNear = lerp(5, 12, t);
  const fogFar = lerp(35, 60, t);

  // Refs for animated values
  const fogRef = useRef<THREE.Fog>(null!);
  const bgRef = useRef<THREE.Color>(null!);

  // Loop de Simulação
  useFrame((state, delta) => {
    updateSimulation(delta);

    // Câmera: rotação cinematográfica lenta
    const elapsed = state.clock.getElapsedTime();
    state.camera.position.x = Math.sin(elapsed * 0.05) * 15;
    state.camera.position.z = Math.cos(elapsed * 0.05) * 15;
    state.camera.lookAt(0, 0, 0);

    // Smooth fog color transition (avoid per-frame useMemo re-allocations)
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

  // Sand tint: slightly brighter as ocean evolves
  const sandTint = useMemo(() => '#' + lerpColor('#666666', '#bbbbbb', t).getHexString(), [t]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[10, 5, 10]} fov={50}>
        {/* Headlight */}
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

      {/* Hemisphere light — evolves from dim to vivid */}
      <hemisphereLight
        intensity={hemiIntensity}
        color={hemiSky}
        groundColor={hemiGround}
      />

      {/* Sol — fica mais forte conforme evolui */}
      <spotLight
        position={[0, 50, 0]}
        angle={0.6}
        penumbra={0.5}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-bias={-0.001}
        shadow-mapSize={[2048, 2048]}
      />

      <Environment preset="night" background={false} />

      {/* ── Fundo do Mar ─────────────────────────────────────────────── */}
      <group position={[0, -6, 0]}>
        <Caustics
          color={causticColor}
          lightSource={[0, 50, 0]}
          intensity={causticIntensity}
          worldRadius={30}
          ior={1.1}
          backside={false}
          causticsOnly={false}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 100, 256, 256]} />
            <meshStandardMaterial
              map={sandColor}
              normalMap={sandNormal}
              roughnessMap={sandRoughness}
              roughness={1}
              envMapIntensity={0.5}
              color={sandTint}
            />
          </mesh>
        </Caustics>
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

      {/* ── Partículas — evoluem com a vida ──────────────────────────── */}
      <Sparkles
        count={sparkleCount}
        scale={40}
        size={6}
        speed={0.4}
        opacity={sparkleOpacity}
        color={sparkleColor}
      />

      {/* ── Eco-sistema ──────────────────────────────────────────────── */}
      <group position={[0, -6, 0]}>
        <HydrothermalVent position={[0, 0, 0]} />
        <HydrothermalVent position={[-4, 0, 3]} />
        <HydrothermalVent position={[3, 0.5, -3]} />
        <HydrothermalVent position={[5, -1, 4]} />
        <HydrothermalVent position={[-3, 1, -5]} />

        {/* Spawner de Vida (flora + fauna) */}
        <LifeSpawner />
      </group>
    </>
  );
}

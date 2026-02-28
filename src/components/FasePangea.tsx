import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles, Environment, Html, Clouds, Cloud } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore, type EvolutionStage } from "../store/gameStore";

// IMPORTAÇÃO DOS NOVOS MÓDULOS
import { ProceduralGround } from "./ProceduralGround";
import { ProceduralGrass } from "./ProceduralGrass";
import { LandFlora } from "./LandFlora";
import { LandFauna } from "./LandFauna";
import { ExtinctionMeteor } from "./ExtinctionMeteor";
import { PangeaStoryteller } from "./PangeaStoryteller";

const STAGE_ORDER: EvolutionStage[] = ["Pangea", "Extinction"];

function evolutionFactor(stage: string, progress: number): number {
  if (["AminoAcids", "RNA", "Protocell", "Life"].includes(stage)) return 0;
  const idx = STAGE_ORDER.indexOf(stage as EvolutionStage);
  if (idx === -1) return 1;
  return (idx + Math.min(progress, 100) / 100) / STAGE_ORDER.length;
}

function lerpColor(a: string, b: string, t: number): THREE.Color {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Substitua as cores no topo do arquivo FasePangea.tsx por estas:
const FOG_PANGEA_START = "#ffaa88"; // Um rosa/laranja suave estilo pôr do sol alienígena
const FOG_PANGEA_END = "#cc6655";
const FOG_EXTINCTION = "#2a0800";
const SUN_PANGEA = "#ffffff";
const SUN_EXTINCTION = "#ff2200";

export function FasePangea() {
  const updateSimulation = useGameStore((state) => state.updateSimulation);
  const stage = useGameStore((state) => state.stage);
  const progress = useGameStore((state) => state.progress);
  const t = evolutionFactor(stage, progress);

  const [introComplete, setIntroComplete] = useState(false);
  const introTimeRef = useRef(0);

  const fogColor = useMemo(() => {
    if (t < 0.35) return new THREE.Color(FOG_PANGEA_START);
    if (t < 0.5)
      return lerpColor(FOG_PANGEA_START, FOG_PANGEA_END, (t - 0.35) * 6.66);
    return lerpColor(FOG_PANGEA_END, FOG_EXTINCTION, (t - 0.5) * 2);
  }, [t]);

  const sunColor = useMemo(() => {
    if (t < 0.35) return new THREE.Color(SUN_PANGEA);
    if (t < 0.5) return lerpColor(SUN_PANGEA, "#ffaa55", (t - 0.35) * 6.66);
    return lerpColor("#ffaa55", SUN_EXTINCTION, (t - 0.5) * 2);
  }, [t]);

  // CALIBRAÇÃO PBR: Luzes reduzidas para evitar o estouro de branco (Overexposure)
  const sunIntensity = t < 0.8 ? 1.8 : lerp(1.8, 0.3, (t - 0.8) * 5);
  const ambientIntensity = t < 0.8 ? 0.4 : lerp(0.4, 0.15, (t - 0.8) * 5);

  const sunPosition = useMemo(() => {
    const sunY = t < 0.7 ? 50 : lerp(50, -5, (t - 0.7) * 3.33);
    return new THREE.Vector3(40, sunY, -20);
  }, [t]);

  const fogRef = useRef<THREE.FogExp2>(null!);
  const bgRef = useRef<THREE.Color>(null!);

  useFrame((state, delta) => {
    updateSimulation(delta);

    if (!introComplete) {
      introTimeRef.current += delta;
      const introT = Math.min(introTimeRef.current / 4.0, 1);
      const easeT = 1 - Math.pow(1 - introT, 3);
      state.camera.position.set(0, lerp(0.5, 3, easeT), 10 - easeT * 2);
      state.camera.lookAt(0, lerp(0.5, 1.5, easeT), 0);
      if (introT >= 1) setIntroComplete(true);
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    state.camera.position.set(
      Math.sin(elapsed * 0.015) * 12,
      3,
      Math.cos(elapsed * 0.015) * 12,
    );
    state.camera.lookAt(0, 1.5, 0);

    if (bgRef.current) bgRef.current.lerp(fogColor, 0.03);
    if (fogRef.current) {
      fogRef.current.color.lerp(fogColor, 0.03);
      const targetDensity =
        t < 0.7 ? 0.018 : lerp(0.018, 0.04, (t - 0.7) * 3.33);
      fogRef.current.density = THREE.MathUtils.lerp(
        fogRef.current.density,
        targetDensity,
        0.03,
      );
    }
  });

  return (
    <>
      <color attach="background" ref={bgRef} args={[FOG_PANGEA_START]} />
      <fogExp2 attach="fog" args={[FOG_PANGEA_START, 0.018]} ref={fogRef} />

      <Environment preset="forest" background={false} />

      <Html fullscreen zIndexRange={[100, 0]}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <PangeaStoryteller />
        </div>
      </Html>

      {/* LUZES CALIBRADAS */}
      <ambientLight intensity={ambientIntensity} color="#e8dcc8" />
      <hemisphereLight intensity={0.4} color="#87CEEB" groundColor="#2d4a1e" />
      <directionalLight
        position={sunPosition}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {t < 0.8 && (
        <Clouds material={THREE.MeshBasicMaterial}>
          <Cloud
            segments={40}
            bounds={[10, 2, 2]}
            volume={10}
            color="#ffffff"
            position={[-20, 25, -30]}
          />
          <Cloud
            segments={30}
            bounds={[8, 2, 2]}
            volume={8}
            color="#f0d5c9"
            position={[25, 28, -40]}
          />
          <Cloud
            segments={50}
            bounds={[15, 3, 3]}
            volume={12}
            color="#ffffff"
            position={[5, 26, 35]}
          />
          <Cloud
            segments={20}
            bounds={[6, 1, 1]}
            volume={6}
            color="#e0e8f0"
            position={[-35, 27, 15]}
          />
        </Clouds>
      )}

      {/* 🌿 NOSSOS MÓDULOS DE ALTO NÍVEL 🌿 */}
      <ProceduralGround fogColor={fogColor} />
      <ProceduralGrass />
      <LandFlora />
      <LandFauna />
      <ExtinctionMeteor />

      <Sparkles
        count={t < 0.8 ? 80 : 200}
        scale={50}
        size={2}
        speed={0.3}
        opacity={0.4}
        color={t < 0.8 ? "#d4e8c2" : "#ff5500"}
      />
    </>
  );
}

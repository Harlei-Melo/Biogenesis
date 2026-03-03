import { useRef, useMemo, useState, useEffect } from "react";
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
import { CutsceneMeteoro } from "./CutsceneMeteoro";

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

const FOG_PANGEA_START = "#c2c8b8";
const FOG_PANGEA_END = "#55aadd";
const FOG_EXTINCTION = "#1a0500";
const SUN_PANGEA = "#fff7e6";
const SUN_EXTINCTION = "#ff3300";

const HEMI_GROUND_DRY = "#4a3525";
const HEMI_GROUND_LUSH = "#152e0a";

export function FasePangea() {
  const updateSimulation = useGameStore((state) => state.updateSimulation);
  const stage = useGameStore((state) => state.stage);
  const progress = useGameStore((state) => state.progress);
  const t = evolutionFactor(stage, progress);

  const [introComplete, setIntroComplete] = useState(false);
  const introTimeRef = useRef(0);

  // === ESTADOS DA TRANSIÇÃO ===
  const [isBlinded, setIsBlinded] = useState(false);

  // REFERÊNCIAS DO CLARÃO 3D
  const flashRef = useRef<THREE.Mesh>(null!);
  const flashTarget = useRef(0); // 0 = invisível, 1 = tela totalmente branca

  useEffect(() => {
    if (stage === "Extinction") {
      // 1. Inicia o Fade In do plano 3D Branco
      flashTarget.current = 1;

      const timerMount = setTimeout(() => {
        setIsBlinded(true); // Troca a Pangeia pelo Meteoro

        // 2. Fade Out do plano Branco revelando o Espaço Sideral
        setTimeout(() => {
          flashTarget.current = 0;
        }, 100);
      }, 1500);

      return () => clearTimeout(timerMount);
    }
  }, [stage]);

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

  const hemiGroundColor = useMemo(() => {
    if (t < 0.35) return new THREE.Color(HEMI_GROUND_DRY);
    if (t < 0.5)
      return lerpColor(HEMI_GROUND_DRY, HEMI_GROUND_LUSH, (t - 0.35) * 6.66);
    return lerpColor(HEMI_GROUND_LUSH, "#110000", (t - 0.5) * 2);
  }, [t]);

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

    // 🔴 A MÁGICA DA CÂMERA: O CLARÃO PERFEITO 🔴
    if (flashRef.current) {
      // 1. Copia a posição da lente
      flashRef.current.position.copy(state.camera.position);
      // 2. COPIA A ROTAÇÃO! Isso impede o quadrado de ficar torto!
      flashRef.current.quaternion.copy(state.camera.quaternion);
      // 3. Move o plano exatamente meio metro pra frente da lente
      flashRef.current.translateZ(-0.5);

      const mat = flashRef.current.material as THREE.MeshBasicMaterial;
      if (flashTarget.current === 1) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 1.0, delta * 3.0); // Clareia
      } else if (flashTarget.current === 0 && mat.opacity > 0) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.0, delta * 5.0); // Apaga
      }
    }

    if (isBlinded) return;

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

      {/* A CORTINA BRANCA 3D (Substituiu a DIV HTML falha) */}
      <mesh ref={flashRef} renderOrder={999999}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <Html fullscreen zIndexRange={[1000, 0]}>
        {!isBlinded && (
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
        )}
      </Html>

      {!isBlinded ? (
        <>
          <Environment preset="forest" background={false} />
          <ambientLight intensity={ambientIntensity} color="#e8dcc8" />
          <hemisphereLight
            intensity={0.4}
            color="#87CEEB"
            groundColor={hemiGroundColor}
          />
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
                color="#ffffff"
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
                color="#ffffff"
                position={[-35, 27, 15]}
              />
            </Clouds>
          )}

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
      ) : (
        <CutsceneMeteoro />
      )}
    </>
  );
}

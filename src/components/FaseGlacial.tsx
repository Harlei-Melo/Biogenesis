import { useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Clouds, Cloud } from "@react-three/drei";
import * as THREE from "three";

import { ProceduralGround } from "./ProceduralGround";
import { LandFlora } from "./LandFlora";

// 🔴 IMPORTANDO O NOSSO MOTOR DE NEVE AAA
import { SnowStorm } from "./SnowStorm";

const FOG_ICE_AGE = "#8a9ba8"; // Deixei um pouco mais escuro e ameaçador
const SUN_ICE_AGE = "#c0c0d0";

export function FaseGlacial() {
  const { scene } = useThree();

  const fogColor = useMemo(() => new THREE.Color(FOG_ICE_AGE), []);

  useEffect(() => {
    scene.background = fogColor;
    // Neblina densa para esconder o horizonte onde a neve nasce
    scene.fog = new THREE.FogExp2(FOG_ICE_AGE, 0.035);

    return () => {
      scene.fog = null;
    };
  }, [scene, fogColor]);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();

    // Órbita da câmera
    state.camera.position.set(
      Math.sin(elapsed * 0.02) * 15,
      4,
      Math.cos(elapsed * 0.02) * 15,
    );
    state.camera.lookAt(0, 1.5, 0);

    // 🔴 TRUQUE DE CÂMERA: Rajadas de Vento na Lente
    // Pulsamos o Campo de Visão (FOV) milimetricamente para simular a pressão do vento batendo
    const windGust = Math.sin(elapsed * 3.0) * Math.cos(elapsed * 1.5) * 1.5;
    const perspectiveCamera = state.camera as THREE.PerspectiveCamera;
    perspectiveCamera.fov = THREE.MathUtils.lerp(
      perspectiveCamera.fov,
      50 + windGust,
      delta * 5,
    );
    perspectiveCamera.updateProjectionMatrix();
  });

  return (
    <group>
      <Environment preset="night" background={false} />
      <ambientLight intensity={0.5} color="#a0b0cf" />
      <directionalLight
        position={[40, 30, -20]}
        intensity={0.8}
        color={SUN_ICE_AGE}
      />

      <ProceduralGround fogColor={fogColor} />
      <LandFlora />

      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud
          segments={120}
          bounds={[60, 5, 60]}
          volume={25}
          color="#778899"
          position={[0, 15, 0]}
          opacity={0.8}
          speed={0.8}
        />
      </Clouds>

      {/* 🔴 AQUI ENTRA A NOSSA FÍSICA PESADA DE TEMPESTADE 🔴 */}
      <SnowStorm count={5000} />
    </group>
  );
}

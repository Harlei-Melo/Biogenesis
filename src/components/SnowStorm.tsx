import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function SnowStorm({ count = 4000 }) {
  const pointsRef = useRef<THREE.Points>(null!);

  // 1. GERAÇÃO INICIAL (Criamos milhares de flocos espalhados pelo céu)
  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count); // Uma "fase" aleatória para cada floco girar diferente
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80; // Posição X (Largura)
      pos[i * 3 + 1] = Math.random() * 40; // Posição Y (Altura inicial nas nuvens)
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80; // Posição Z (Profundidade)
      ph[i] = Math.random() * Math.PI * 2;
    }
    return [pos, ph];
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const positionsAttribute = pointsRef.current.geometry.attributes.position;
    const posArray = positionsAttribute.array as Float32Array;
    const time = state.clock.elapsedTime;

    // A FÍSICA DO VENTO
    const gravity = 18; // Velocidade de queda
    const windX = 25; // Vento fortíssimo para a direita
    const windZ = -10; // Vento contra a câmera

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Aplica a Gravidade
      posArray[i3 + 1] -= gravity * delta * (0.8 + phases[i] * 0.1);

      // Aplica o Vento + Turbulência
      posArray[i3] += windX * delta + Math.sin(time * 2 + phases[i]) * 0.1;
      posArray[i3 + 2] += windZ * delta + Math.cos(time * 2 + phases[i]) * 0.1;

      // RECICLAGEM
      if (posArray[i3 + 1] < -2) {
        posArray[i3 + 1] = 30 + Math.random() * 10;
        posArray[i3] = (Math.random() - 0.5) * 80 - windX * 1.5;
        posArray[i3 + 2] = (Math.random() - 0.5) * 80 - windZ * 1.5;
      }
    }

    positionsAttribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        {/* 🔴 CORREÇÃO DO TYPESCRIPT AQUI: Usando "args" 🔴 */}
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#ffffff"
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

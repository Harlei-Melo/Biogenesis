import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo } from 'react';

export function StarLayer() {
  const bgRef = useRef<THREE.Mesh>(null!);
  const starsRef = useRef<THREE.Points>(null!);
  
  // 1. Fundo Infinito (Via Láctea)
  const bgTexture = useTexture("/textures/stars/milky_way.jpg");

  // 2. Estrelas Individuais (Paralaxe)
  // Geramos 500 estrelas manuais para dar profundidade 3D
  const particlePositions = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribuição esférica
      const r = 80 + Math.random() * 40; // Entre raio 80 e 120 (perto do fundo)
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Rotação sutil do universo
    if (bgRef.current) bgRef.current.rotation.y = t * 0.005;
    // As estrelas individuais giram um pouco mais rápido (paralaxe)
    if (starsRef.current) starsRef.current.rotation.y = t * 0.008;
  });

  return (
    <group>
      {/* CAMADA 1: A VIA LÁCTEA (Skybox 8K) */}
      <mesh ref={bgRef}>
        <sphereGeometry args={[400, 64, 64]} />
        <meshBasicMaterial 
          map={bgTexture} 
          side={THREE.BackSide} // Renderiza por dentro da esfera
          transparent
          opacity={0.5} // Um pouco transparente para fundir com o preto do espaço
        />
      </mesh>

      {/* CAMADA 2: ESTRELAS BRILHANTES (Pontos 3D) */}
      <Points ref={starsRef} positions={particlePositions} stride={3}>
        <PointMaterial
          transparent
          color="#ffffff"
          size={0.8}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.8}
        />
      </Points>
    </group>
  );
}
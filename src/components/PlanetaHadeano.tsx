import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export function PlanetaHadeano() {
  const superficieRef = useRef<THREE.Mesh>(null!);
  const nuvensRef = useRef<THREE.Mesh>(null!);
  const atmosferaRef = useRef<THREE.Mesh>(null!);

  // Carrega as texturas
  const [lavaDiff, lavaNor, lavaRough, lavaDisp, lavaEmit, nuvensMap] =
    useTexture([
      "/textures/Lava002_4K-JPG/volcanic_diff.jpg",
      "/textures/Lava002_4K-JPG/volcanic_nor.jpg",
      "/textures/Lava002_4K-JPG/volcanic_rough.jpg",
      "/textures/Lava002_4K-JPG/volcanic_disp.jpg",
      "/textures/Lava002_4K-JPG/volcanic_emissive.jpg",
      "/textures/clouds.jpg", // Certifique-se que esta imagem tem fundo PRETO (padrão Solar System Scope)
    ]);

  // Configura repetição da lava
  [lavaDiff, lavaNor, lavaRough, lavaDisp, lavaEmit].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
  });

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Rotação da superfície
    if (superficieRef.current) superficieRef.current.rotation.y = t * 0.05;

    // Rotação das Nuvens (Camada separada)
    if (nuvensRef.current) {
      nuvensRef.current.rotation.y = t * 0.07;
      nuvensRef.current.rotation.x = Math.sin(t * 0.2) * 0.05;
    }
  });

  return (
    <group scale={2.5}>
      {/* 1. PLANETA (ROCHA E LAVA) */}
      <mesh ref={superficieRef}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial
          map={lavaDiff}
          normalMap={lavaNor}
          roughnessMap={lavaRough}
          displacementMap={lavaDisp}
          displacementScale={0.08} // Reduzi levemente para não atravessar as nuvens
          emissiveMap={lavaEmit}
          emissive="#ff5500"
          emissiveIntensity={2}
          metalness={0.2}
        />
      </mesh>

      {/* 2. NUVENS (ADDITIVE BLENDING - O SEGREDINHO) */}
      <mesh ref={nuvensRef} scale={[1.05, 1.05, 1.05]}>
        {" "}
        {/* Afastei mais da superfície */}
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          map={nuvensMap} // Usamos o MAP normal para pegar os detalhes da imagem
          transparent={true}
          opacity={0.6} // Controle a intensidade aqui
          color="#ffffff" // Branco para nuvens de vapor puro
          blending={THREE.AdditiveBlending} // O preto vira transparente, o branco brilha
          side={THREE.DoubleSide}
          depthWrite={false} // Importante para não bugar a renderização
        />
      </mesh>

      {/* 3. ATMOSFERA (HALO) */}
      <mesh ref={atmosferaRef} scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#bad9ff"
          transparent
          opacity={0.09}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

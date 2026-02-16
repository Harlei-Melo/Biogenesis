import { useMemo, useState, useEffect } from "react"; // Adicionado useEffect para segurança
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface RaioProps {
  posicaoImpacto: [number, number, number];
  onAcabou: () => void;
}

export function Raio({ posicaoImpacto, onAcabou }: RaioProps) {
  const [life, setLife] = useState(1.0);

  // 1. Atualiza a vida do raio no frame (Local)
  useFrame((_, delta) => {
    setLife((prev) => Math.max(0, prev - delta * 5));
  });

  // 2. AVISO SEGURO: Quando a vida chega a 0, avisa o pai (FaseAtmosfera)
  // Isso resolve o erro "Cannot update a component while rendering"
  useEffect(() => {
    if (life <= 0) {
      onAcabou();
    }
  }, [life, onAcabou]);

  const points = useMemo(() => {
    const start = new THREE.Vector3(...posicaoImpacto)
      .normalize()
      .multiplyScalar(10);
    const end = new THREE.Vector3(...posicaoImpacto);
    const segments = 15;
    const pts: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = new THREE.Vector3().lerpVectors(start, end, t);
      if (i > 0 && i < segments) {
        const jitter = 0.5 * (1.0 - t);
        p.x += (Math.random() - 0.5) * jitter;
        p.y += (Math.random() - 0.5) * jitter;
        p.z += (Math.random() - 0.5) * jitter;
      }
      pts.push(p);
    }
    return pts;
  }, [posicaoImpacto]);

  if (life <= 0) return null;

  return (
    <group>
      {/* NÚCLEO BRANCO */}
      <Line
        points={points}
        color={new THREE.Color(20, 20, 25)}
        lineWidth={4 * life}
        transparent
        opacity={life}
        toneMapped={false}
      />

      {/* GLOW AZUL */}
      <Line
        points={points}
        color={new THREE.Color(0.2, 0.5, 5.0)}
        lineWidth={12 * life}
        transparent
        opacity={life * 0.4}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />

      {/* LUZ DE IMPACTO */}
      <pointLight
        position={posicaoImpacto}
        intensity={150 * life}
        distance={15}
        color="#aaddff"
        decay={2}
      />
    </group>
  );
}

import { useState, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
  GodRays,
} from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import * as THREE from "three";

import { PlanetaHadeano } from "./PlanetaHadeano";
import { Raio } from "./RaioHighEnd";
import { Sun } from "./Sun"; // O Sol já está pronto para receber o Ref
import { StarLayer } from "./StarLayer";

interface FaseAtmosferaProps {
  onFaseConcluida: () => void;
  onEnergiaChange: (valor: number) => void;
}

export function FaseAtmosfera({
  onFaseConcluida,
  onEnergiaChange,
}: FaseAtmosferaProps) {
  const [, setEnergia] = useState(0);
  const [raios, setRaios] = useState<
    { id: number; pos: [number, number, number] }[]
  >([]);

  // Ref para o Sol (necessário para os God Rays funcionarem)
  const sunRef = useRef<THREE.Mesh>(null!);

  const [aberrationAmount, setAberration] = useState(0);
  const aberrationVector = useMemo(
    () => new THREE.Vector2(aberrationAmount, aberrationAmount),
    [aberrationAmount],
  );

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const ponto = e.point;
    setAberration(0.01); // Voltei para o valor mais sutil
    setTimeout(() => setAberration(0), 100);

    setEnergia((prev) => {
      const nova = prev + 5;
      onEnergiaChange(nova);
      if (nova >= 100) setTimeout(onFaseConcluida, 1000);
      return Math.min(nova, 100);
    });

    const id = Date.now();
    setRaios((prev) => [...prev, { id, pos: [ponto.x, ponto.y, ponto.z] }]);
  };

  const removeRaio = (id: number) => {
    setRaios((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <>
      {/* 1. PÓS-PROCESSAMENTO (Mantemos os God Rays, mas sem a tremedeira) */}
      <EffectComposer enableNormalPass={false} multisampling={0}>
        {/* GodRays: Os raios de luz continuam aqui */}
        {sunRef.current && (
          <GodRays
            sun={sunRef.current}
            blendFunction={BlendFunction.SCREEN}
            samples={60}
            density={0.96}
            decay={0.9}
            weight={0.6}
            exposure={0.6}
            clampMax={1}
            kernelSize={KernelSize.SMALL}
            blur={true}
          />
        )}

        <Bloom
          luminanceThreshold={1.1}
          mipmapBlur
          intensity={1.2}
          radius={0.6}
        />

        <ChromaticAberration
          offset={aberrationVector}
          blendFunction={BlendFunction.NORMAL}
        />

        <Noise opacity={0.06} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>

      {/* 2. CENA (Sem CameraShake) */}
      <group>
        <Sun ref={sunRef} /> {/* O Sol com Ref para os raios saírem dele */}
        <StarLayer />
      </group>

      <ambientLight intensity={0.05} />
      <pointLight
        position={[-20, -10, -10]}
        intensity={1.0}
        color="#2244ff"
        distance={100}
      />
      <Environment preset="night" />

      <group onClick={handleClick}>
        <PlanetaHadeano />
      </group>

      {raios.map((raio) => (
        <Raio
          key={raio.id}
          posicaoImpacto={raio.pos}
          onAcabou={() => removeRaio(raio.id)}
        />
      ))}

      {/* 3. CONTROLES ORIGINAIS (Sem zoom e estáveis) */}
      <OrbitControls
        enableZoom={false}
        autoRotate={true}
        autoRotateSpeed={0.3}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
      />
    </>
  );
}

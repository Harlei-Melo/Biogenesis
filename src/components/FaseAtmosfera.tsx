import { useState, useMemo } from "react";
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
import { Sun } from "./Sun";
import { StarLayer } from "./StarLayer";

interface FaseAtmosferaProps {
  onFaseConcluida: () => void;
  onEnergiaChange: (valor: number) => void;
}

export function FaseAtmosfera({
  onFaseConcluida,
  onEnergiaChange,
}: FaseAtmosferaProps) {
  const [energiaLocal, setEnergiaLocal] = useState(0);
  const [raios, setRaios] = useState<
    { id: number; pos: [number, number, number] }[]
  >([]);

  // State para capturar a referência do Sol
  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null);

  const [aberrationAmount, setAberration] = useState(0);
  const aberrationVector = useMemo(
    () => new THREE.Vector2(aberrationAmount, aberrationAmount),
    [aberrationAmount],
  );

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const ponto = e.point;
    setAberration(0.015);
    setTimeout(() => setAberration(0), 100);

    setEnergiaLocal((prev) => {
      const nova = prev + 5;
      onEnergiaChange(nova);
      if (nova >= 100) setTimeout(onFaseConcluida, 2000);
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
      <EffectComposer enableNormalPass={false} multisampling={0}>
        {/* CORREÇÃO 1: Usamos ternário (? :) com Fragmento vazio (<></>) */}
        {/* O EffectComposer odeia 'null', mas aceita '<></>' */}
        {sunMesh ? (
          <GodRays
            sun={sunMesh}
            blendFunction={BlendFunction.SCREEN}
            samples={30}
            density={0.96}
            decay={0.9}
            weight={0.6}
            exposure={0.6}
            clampMax={1}
            kernelSize={KernelSize.SMALL}
            blur={true}
          />
        ) : (
          <></>
        )}

        <Bloom
          luminanceThreshold={1.1}
          mipmapBlur
          intensity={0.8}
          radius={0.6}
        />

        <ChromaticAberration
          offset={aberrationVector}
          blendFunction={BlendFunction.NORMAL}
        />

        {/* CORREÇÃO 2: Garantimos que Noise e Vignette estão renderizando corretamente */}
        {/* Às vezes o TS se perde se eles estiverem implícitos, mas aqui deve funcionar */}
        <Noise opacity={0.06} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>

      <group>
        {/* O 'ref' do Sun passa a malha para o estado 'sunMesh' */}
        {/* @ts-ignore: O tipo do ref pode variar ligeiramente, ignoramos para simplificar */}
        <Sun ref={setSunMesh} />
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
        <PlanetaHadeano evolucao={energiaLocal / 100} />
      </group>

      {raios.map((raio) => (
        <Raio
          key={raio.id}
          posicaoImpacto={raio.pos}
          onAcabou={() => removeRaio(raio.id)}
        />
      ))}

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

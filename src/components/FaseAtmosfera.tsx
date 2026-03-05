import { useState, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null);

  // 🔴 1. CÁLCULO DINÂMICO DA COR DA LUZ
  // Conforme o planeta evolui, a luz muda de "Fogo" para "Sol Branco"
  const sunLightColor = useMemo(() => {
    const corHadeana = new THREE.Color("#ff5500"); // Laranja
    const corOceano = new THREE.Color("#ffffff"); // Branco (necessário para o azul do mar não virar verde)
    return corHadeana.lerp(corOceano, energiaLocal / 100);
  }, [energiaLocal]);

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

        <Noise opacity={0.06} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>

      <group>
        {/* @ts-ignore */}
        <Sun ref={setSunMesh} />

        {/* 🔴 2. LUZ PRINCIPAL (O SOL) 
            Fazemos ela ser direcional para criar reflexos nítidos. 
            A cor transiciona para Branco para o oceano ficar azulzinho. */}
        <directionalLight
          position={[10, 10, 10]}
          intensity={2.5}
          color={sunLightColor}
        />
      </group>

      <ambientLight intensity={0.1} />

      {/* 🔴 3. AJUSTE DO POINTLIGHT AZUL
          Diminuímos a intensidade e suavizamos a cor para não "sujar" o Hadeano de verde. */}
      <pointLight
        position={[-20, -10, -10]}
        intensity={0.5} // Reduzido para não dominar a cena
        color="#4466ff" // Um azul mais suave
        distance={100}
      />

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

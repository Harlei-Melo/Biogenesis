import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { JourneyArc } from "./ScienceJourney";

// 🔴 DEFINIÇÃO COMPLETA DAS PROPS
interface PlanetaProps {
  activeJourney: any;
  rotation?: [number, number, number]; // Opcional para o TS não reclamar
}

export function PlanetaModerno({ activeJourney, rotation }: PlanetaProps) {
  const grupoRotacaoRef = useRef<THREE.Group>(null!);
  const nightMap = useTexture("/textures/earth_night_8k.jpg");
  nightMap.colorSpace = THREE.SRGBColorSpace;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // SÓ GIRA AUTOMATICAMENTE SE NÃO HOUVER JORNADA SELECIONADA
    if (grupoRotacaoRef.current && !activeJourney) {
      grupoRotacaoRef.current.rotation.y = t * 0.05; // Velocidade de cruzeiro
    }
  });

  return (
    // Aplicamos a escala global e a rotação de ajuste inicial aqui
    <group scale={2.5} rotation={rotation}>
      <group ref={grupoRotacaoRef}>
        <mesh>
          <sphereGeometry args={[1, 128, 128]} />
          <meshStandardMaterial
            map={nightMap}
            emissiveMap={nightMap}
            emissive={new THREE.Color("#ffffff")}
            emissiveIntensity={2.5}
          />
        </mesh>

        {/* Linhas neon dinâmicas baseadas na escolha do usuário */}
        {activeJourney &&
          activeJourney.steps.map((step: any, index: number) => {
            if (index < activeJourney.steps.length - 1) {
              const nextStep = activeJourney.steps[index + 1];
              return (
                <JourneyArc
                  key={`${activeJourney.id}-arc-${index}`}
                  startLat={step.lat}
                  startLon={step.lon}
                  endLat={nextStep.lat}
                  endLon={nextStep.lon}
                  color={activeJourney.color}
                />
              );
            }
            return null;
          })}
      </group>
    </group>
  );
}

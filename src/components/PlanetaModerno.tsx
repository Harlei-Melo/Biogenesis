import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture, Html } from "@react-three/drei";
import * as THREE from "three";
import { JourneyArc } from "./ScienceJourney";

// 🔴 FUNÇÃO DE NAVEGAÇÃO: Converte Lat/Lon para Coordenadas 3D (X, Y, Z)
function calcPosFromLatLonRad(lat: number, lon: number, radius: number = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

interface PlanetaProps {
  activeJourney: any;
  rotation?: [number, number, number];
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

        {activeJourney && (
          <group>
            {/* 🔴 1. DESENHA AS LINHAS ENTRE OS PONTOS */}
            {activeJourney.steps.map((step: any, index: number) => {
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

            {/* 🔴 2. DESENHA OS MARCADORES NUMÉRICOS HTML EM CADA PONTO */}
            {activeJourney.steps.map((step: any, index: number) => {
              const pos = calcPosFromLatLonRad(step.lat, step.lon, 1.02); // 1.02 para flutuar um pouquinho acima da crosta

              return (
                <group
                  key={`${activeJourney.id}-marker-${index}`}
                  position={pos}
                >
                  {/* Um pequeno pilar visual (opcional) sob o número */}
                  <mesh>
                    <cylinderGeometry args={[0.005, 0.005, 0.04, 8]} />
                    <meshBasicMaterial color={activeJourney.color} />
                  </mesh>

                  <Html center zIndexRange={[100, 0]}>
                    <div
                      style={{
                        pointerEvents: "none",
                        color: "#ffffff",
                        backgroundColor: "rgba(10, 15, 25, 0.8)", // Fundo escuro com leve transparência
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                        fontFamily: "monospace",
                        border: `2px solid ${activeJourney.color}`, // Borda com a cor neon da jornada
                        transform: "translateY(-15px)", // Sobe o número para não ficar em cima do pilar
                        boxShadow: `0 0 12px ${activeJourney.color}, inset 0 0 5px ${activeJourney.color}`, // Glow interno e externo
                        textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                      }}
                    >
                      {index + 1}
                    </div>
                  </Html>
                </group>
              );
            })}
          </group>
        )}
      </group>
    </group>
  );
}

import { useEffect, useState, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { PlanetaModerno } from "./PlanetaModerno";

const JOURNEYS = [
  {
    id: "einstein",
    title: "A Relatividade Geral",
    year: "1905 - 1915",
    color: "#00ffff",
    desc: "A jornada intelectual de Einstein redefinindo a gravidade e o tempo através da Europa e Américas.",
    steps: [
      {
        year: "1905",
        event: "Anos Milagrosos (Berna)",
        lat: 46.948,
        lon: 7.4474,
      },
      { year: "1911", event: "Professor em Praga", lat: 50.0755, lon: 14.4378 },
      { year: "1914", event: "Diretor em Berlim", lat: 52.52, lon: 13.405 },
      {
        year: "1933",
        event: "Refúgio em Princeton",
        lat: 40.3573,
        lon: -74.6672,
      },
    ],
  },
  {
    id: "darwin",
    title: "A Origem das Espécies",
    year: "1831 - 1836",
    color: "#ff00ff",
    desc: "A expedição do HMS Beagle que coletou as evidências fundamentais para a teoria da evolução.",
    steps: [
      {
        year: "1831",
        event: "Partida de Plymouth",
        lat: 50.3755,
        lon: -4.1427,
      },
      {
        year: "1832",
        event: "Passagem por Salvador",
        lat: -12.9714,
        lon: -38.5014,
      },
      { year: "1835", event: "Ilhas Galápagos", lat: -0.8293, lon: -90.9821 },
      {
        year: "1836",
        event: "Retorno à Inglaterra",
        lat: 51.5074,
        lon: -0.1278,
      },
    ],
  },
];

export function FaseHumanidade() {
  const { scene, camera } = useThree();
  const [activeJourneyIndex, setActiveJourneyIndex] = useState<number | null>(
    null,
  );
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    scene.background = new THREE.Color("#000000");
    camera.position.set(0, 5, 12); // Posição inicial épica
  }, [scene, camera]);

  // 🔴 O "DIRETOR" FOI DEMITIDO: A câmera não se move mais sozinha.
  // Deixamos o controle total para o usuário no OrbitControls abaixo.

  const activeJourney =
    activeJourneyIndex !== null ? JOURNEYS[activeJourneyIndex] : null;

  return (
    <group>
      <OrbitControls
        ref={controlsRef}
        // Gira sozinho apenas no menu principal. Se selecionar algo, o usuário assume o leme.
        autoRotate={activeJourneyIndex === null}
        autoRotateSpeed={0.5}
        enablePan={false}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={4}
        maxDistance={20}
        makeDefault
      />

      <ambientLight intensity={0.1} color="#ffffff" />
      <Stars
        radius={120}
        depth={50}
        count={6000}
        factor={3}
        saturation={0}
        fade
        speed={1}
      />

      {/* 🔴 ALINHAMENTO: Math.PI (180 graus) alinha Londres no centro do mapa 8K */}
      <PlanetaModerno
        activeJourney={activeJourney}
        rotation={[0, Math.PI, 0]}
      />

      <Html
        fullscreen
        style={{ pointerEvents: "none", display: "flex", alignItems: "center" }}
      >
        <div
          style={{
            pointerEvents: "auto",
            width: "350px",
            marginLeft: "50px",
            padding: "30px",
            background: "rgba(10, 15, 25, 0.75)",
            backdropFilter: "blur(15px)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "white",
          }}
        >
          <h2
            style={{
              margin: "0 0 5px 0",
              fontSize: "1.2rem",
              fontWeight: 300,
              color: "#88aadd",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            A Era da Informação
          </h2>
          <p
            style={{ margin: "0 0 30px 0", fontSize: "0.85rem", color: "#aaa" }}
          >
            Selecione uma jornada e gire o globo para encontrá-la.
          </p>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {JOURNEYS.map((journey, index) => {
              const isActive = activeJourneyIndex === index;
              return (
                <button
                  key={journey.id}
                  onClick={() => setActiveJourneyIndex(isActive ? null : index)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "15px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    background: isActive
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: isActive
                      ? `1px solid ${journey.color}`
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    color: "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: "1rem" }}>
                      {journey.title}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: isActive ? journey.color : "#88aadd",
                      }}
                    >
                      {journey.year}
                    </span>
                  </div>

                  {isActive && (
                    <div
                      style={{
                        marginTop: "20px",
                        borderLeft: `2px solid ${journey.color}`,
                        paddingLeft: "15px",
                      }}
                    >
                      {journey.steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          style={{ marginBottom: "15px", position: "relative" }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              left: "-21px",
                              top: "4px",
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: journey.color,
                              boxShadow: `0 0 10px ${journey.color}`,
                            }}
                          />
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "#88aadd",
                              fontWeight: "bold",
                            }}
                          >
                            {step.year}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "white" }}>
                            {step.event}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {activeJourneyIndex !== null && (
            <button
              onClick={() => setActiveJourneyIndex(null)}
              style={{
                marginTop: "20px",
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#88aadd",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Resetar Órbita
            </button>
          )}
        </div>
      </Html>

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={1.0} mipmapBlur intensity={0.6} />
      </EffectComposer>
    </group>
  );
}

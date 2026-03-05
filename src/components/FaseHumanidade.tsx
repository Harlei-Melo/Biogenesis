import { useEffect, useState, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Stars, OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { PlanetaModerno } from "./PlanetaModerno";

// 🔴 AS 5 JORNADAS DA BIOLOGIA (Coordenadas reais e cores Neon)
const JOURNEYS = [
  {
    id: "darwin",
    title: "A Origem das Espécies",
    year: "1831 - 1859",
    color: "#ff00ff", // Magenta
    desc: "A histórica expedição que decodificou a árvore da vida e revelou o motor silencioso da natureza: a Seleção Natural.",
    steps: [
      {
        year: "1831",
        event: "Zarpando para o Desconhecido",
        lat: 50.3755,
        lon: -4.1427,
      },
      {
        year: "1832",
        event: "Imersão nos Trópicos (Bahia)",
        lat: -12.9714,
        lon: -38.5014,
      },
      {
        year: "1835",
        event: "O Laboratório Natural (Galápagos)",
        lat: -0.8293,
        lon: -90.9821,
      },
      {
        year: "1859",
        event: "A Síntese da Evolução (Londres)",
        lat: 51.5074,
        lon: -0.1278,
      },
    ],
  },
  {
    id: "fleming",
    title: "A Era dos Antibióticos",
    year: "1928 - 1945",
    color: "#00ff88", // Verde Neon (Lembrando o fungo Penicillium)
    desc: "A descoberta acidental que derrotou infecções milenares e dobrou a expectativa de vida humana.",
    steps: [
      {
        year: "1928",
        event: "O Fungo Milagroso (St. Mary's Hospital)",
        lat: 51.5171,
        lon: -0.1744,
      },
      {
        year: "1940",
        event: "Isolamento da Penicilina (Oxford)",
        lat: 51.752,
        lon: -1.2577,
      },
      {
        year: "1943",
        event: "Produção em Massa (EUA)",
        lat: 40.7128,
        lon: -74.006,
      },
      {
        year: "1945",
        event: "Prêmio Nobel de Medicina (Estocolmo)",
        lat: 59.3293,
        lon: 18.0686,
      },
    ],
  },
  {
    id: "dna",
    title: "O Código da Vida (DNA)",
    year: "1951 - 1953",
    color: "#00ffff", // Ciano
    desc: "A corrida para desvendar a dupla hélice, a molécula que carrega o software de todos os seres vivos.",
    steps: [
      {
        year: "1951",
        event: "A Fotografia 51 de Rosalind Franklin",
        lat: 51.5115,
        lon: -0.116,
      },
      {
        year: "1953",
        event: "O Modelo da Dupla Hélice (Cambridge)",
        lat: 52.2053,
        lon: 0.1218,
      },
      {
        year: "1962",
        event: "O Reconhecimento Global (Nobel)",
        lat: 59.3293,
        lon: 18.0686,
      },
    ],
  },
  {
    id: "genoma",
    title: "O Projeto Genoma Humano",
    year: "1990 - 2003",
    color: "#ffaa00", // Laranja/Dourado
    desc: "O esforço global e monumental para mapear os 3 bilhões de pares de bases do DNA humano.",
    steps: [
      {
        year: "1990",
        event: "Início do Projeto (NIH, Bethesda)",
        lat: 38.9964,
        lon: -77.1025,
      },
      {
        year: "1999",
        event: "1º Cromossomo Decodificado (Sanger Inst.)",
        lat: 52.0805,
        lon: 0.1856,
      },
      {
        year: "2003",
        event: "O Mapa Completo (Washington D.C.)",
        lat: 38.8951,
        lon: -77.0364,
      },
    ],
  },
  {
    id: "crispr",
    title: "A Edição Genética (CRISPR)",
    year: "2012 - Presente",
    color: "#ff3366", // Rosa Neon
    desc: "A descoberta da tesoura molecular que nos permitiu, pela primeira vez, reescrever a própria biologia.",
    steps: [
      {
        year: "2012",
        event: "O Artigo Fundamental (UC Berkeley)",
        lat: 37.8715,
        lon: -122.273,
      },
      {
        year: "2013",
        event: "Edição em Células Humanas (Broad Inst.)",
        lat: 42.3629,
        lon: -71.0898,
      },
      {
        year: "2020",
        event: "A Consagração da Técnica (Nobel)",
        lat: 59.3293,
        lon: 18.0686,
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
    camera.position.set(0, 5, 12);
  }, [scene, camera]);

  const activeJourney =
    activeJourneyIndex !== null ? JOURNEYS[activeJourneyIndex] : null;

  return (
    <group>
      <OrbitControls
        ref={controlsRef}
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
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          {/* 🔴 TEXTOS REVISADOS */}
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
            O Despertar da Consciência
          </h2>
          <p
            style={{
              margin: "0 0 30px 0",
              fontSize: "0.85rem",
              color: "#aaa",
              lineHeight: 1.4,
            }}
          >
            Intercepte os filamentos de dados que reescreveram nossa compreensão
            da vida. Selecione um marco e assuma o controle da órbita.
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
                    <div style={{ marginTop: "15px" }}>
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "#ccc",
                          marginBottom: "20px",
                          lineHeight: 1.4,
                        }}
                      >
                        {journey.desc}
                      </p>
                      <div
                        style={{
                          borderLeft: `2px solid ${journey.color}`,
                          paddingLeft: "15px",
                        }}
                      >
                        {journey.steps.map((step, sIdx) => (
                          <div
                            key={sIdx}
                            style={{
                              marginBottom: "15px",
                              position: "relative",
                            }}
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
                            <div
                              style={{ fontSize: "0.85rem", color: "white" }}
                            >
                              {step.event}
                            </div>
                          </div>
                        ))}
                      </div>
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
              Desconectar Fio de Dados
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

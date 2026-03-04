import { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { FaseAtmosfera } from "./components/FaseAtmosfera";
import { FaseOceano } from "./components/FaseOceano";
import { FasePangea } from "./components/FasePangea";
import { AudioManager } from "./components/AudioManager";
import { useGameStore } from "./store/gameStore";

// 🔴 IMPORTANDO A NOVA TRANSIÇÃO E A CENA 3D DO GELO
import { IceAgeTransition } from "./components/IceAgeTransition";
import { FaseGlacial } from "./components/FaseGlacial";

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="orange" wireframe />
    </mesh>
  );
}

/**
 * Mapeia o estágio interno da gameStore para a "fase visual" (tela) correspondente.
 */
function stageToFase(stage: string): number {
  switch (stage) {
    case "AminoAcids":
    case "RNA":
    case "Protocell":
    case "Life":
      return 1; // Oceano (Sopa Primordial)
    case "Pangea":
    case "Extinction":
      return 2; // Terra Firme
    case "IceAge":
      return 3; // 🔴 Transição da Era do Gelo
    case "Humanity":
      return 4; // 🔴 Terra Moderna (A fase final)
    default:
      return 0; // Atmosfera (Hadean)
  }
}

export default function App() {
  const [faseAtual, setFaseAtual] = useState(0);
  const [energiaHUD, setEnergiaHUD] = useState(0);

  const stage = useGameStore((s) => s.stage);

  useEffect(() => {
    // Sincroniza a store com a tela visual (incluindo as novas fases)
    if (faseAtual >= 1) {
      const novaFase = stageToFase(stage);
      if (novaFase !== faseAtual) {
        setFaseAtual(novaFase);
      }
    }
  }, [stage, faseAtual]);

  // --- 🛠️ DEV ONLY: Função para pular fases ---
  const handleSkipPhase = () => {
    if (faseAtual === 0) {
      setFaseAtual(1);
      setEnergiaHUD(0);
      useGameStore.setState({
        stage: "AminoAcids",
        progress: 0,
        stability: 100,
      });
    } else if (faseAtual === 1) {
      useGameStore.setState({ stage: "Pangea", progress: 0 });
    } else if (faseAtual === 2 && stage === "Pangea") {
      useGameStore.setState({ stage: "Extinction", progress: 0 });
    } else if (faseAtual === 2 && stage === "Extinction") {
      // 🔴 Pula do Meteoro caindo direto pra caixinha de vidro da Era do Gelo!
      useGameStore.setState({ stage: "IceAge", progress: 0 });
    } else if (faseAtual === 3) {
      // 🔴 Pula da Era do Gelo para a Terra Moderna
      useGameStore.setState({ stage: "Humanity", progress: 0 });
    } else {
      setFaseAtual(0);
      useGameStore.setState({
        stage: "AminoAcids",
        progress: 0,
        stability: 100,
      });
    }
  };

  const FASE_TITLES: Record<number, string> = {
    0: "Fase 1: Atmosfera",
    1: "Fase 2: Sopa Primordial",
    2: "Fase 3: Terra Firme (Pangea)",
    3: "", // Era do gelo não tem título superior
    4: "Fase Final: Terra Moderna",
  };

  return (
    <>
      <AudioManager faseAtual={faseAtual} />

      {/* 🔴 A UI DA ERA DO GELO É RENDERIZADA FORA DO CANVAS 🔴 */}
      {stage === "IceAge" && <IceAgeTransition />}

      {/* 🔴 ESCONDEMOS O HUD DURANTE A ERA DO GELO PARA IMERSÃO TOTAL 🔴 */}
      {stage !== "IceAge" && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            color: "white",
            zIndex: 999,
            pointerEvents: "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                textTransform: "uppercase",
                fontSize: "clamp(0.85rem, 3.5vw, 1.5rem)",
                lineHeight: 1.2,
              }}
            >
              {FASE_TITLES[faseAtual]}
            </h1>
            {faseAtual === 0 && (
              <div
                style={{
                  maxWidth: "300px",
                  width: "70%",
                  height: "8px",
                  background: "rgba(255,255,255,0.1)",
                  marginTop: "8px",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${energiaHUD}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #ff8800, #00ff88)",
                    transition: "width 0.3s",
                  }}
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSkipPhase}
            style={{
              pointerEvents: "auto",
              background: "rgba(255, 0, 50, 0.7)",
              backdropFilter: "blur(4px)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              letterSpacing: "1px",
            }}
          >
            ⏭ SKIP
          </button>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 0, 10] }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#020202"]} />

        <Suspense fallback={<Loader />}>
          {faseAtual === 0 && (
            <FaseAtmosfera
              onEnergiaChange={(valor) => setEnergiaHUD(valor)}
              onFaseConcluida={() => {
                setFaseAtual(1);
                setEnergiaHUD(0);
              }}
            />
          )}
          {faseAtual === 1 && <FaseOceano />}
          {faseAtual === 2 && <FasePangea />}

          {/* 🔴 O MUNDO 3D CONGELADO APARECE AQUI NA FASE 3 */}
          {faseAtual === 3 && <FaseGlacial />}

          {/* 🔴 AQUI ENTRARÁ O NOSSO HADEANO REAPROVEITADO PARA A TERRA MODERNA */}
          {faseAtual === 4 && (
            <group>
              {/* O componente FaseHumanidade entrará aqui em breve */}
            </group>
          )}
        </Suspense>
      </Canvas>
    </>
  );
}

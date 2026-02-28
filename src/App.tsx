import { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { FaseAtmosfera } from "./components/FaseAtmosfera";
import { FaseOceano } from "./components/FaseOceano";
import { FasePangea } from "./components/FasePangea";
import { AudioManager } from "./components/AudioManager";
import { useGameStore } from "./store/gameStore";

// Pequeno componente para mostrar que está carregando
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
    default:
      return 0; // Atmosfera (Hadean)
  }
}

export default function App() {
  const [faseAtual, setFaseAtual] = useState(0);
  const [energiaHUD, setEnergiaHUD] = useState(0);

  // Escuta a store global para detectar transição automática
  const stage = useGameStore((s) => s.stage);

  useEffect(() => {
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
      // Pula da Atmosfera para o Oceano
      setFaseAtual(1);
      setEnergiaHUD(0);
      useGameStore.setState({
        stage: "AminoAcids",
        progress: 0,
        stability: 100,
      });
    } else if (faseAtual === 1) {
      // Pula do Oceano para a Pangeia
      useGameStore.setState({ stage: "Pangea", progress: 0 });
    } else if (faseAtual === 2 && stage === "Pangea") {
      // Pula da Pangeia direto para o Meteoro caindo (útil para nossos próximos testes!)
      useGameStore.setState({ stage: "Extinction", progress: 0 });
    } else {
      // Dá a volta e reinicia do zero
      setFaseAtual(0);
      useGameStore.setState({
        stage: "AminoAcids",
        progress: 0,
        stability: 100,
      });
    }
  };

  // Títulos das fases
  const FASE_TITLES: Record<number, string> = {
    0: "Fase 1: Atmosfera",
    1: "Fase 2: Sopa Primordial",
    2: "Fase 3: Terra Firme (Pangea)",
  };

  return (
    <>
      {/* Gerenciador de áudio (sem UI) */}
      <AudioManager faseAtual={faseAtual} />

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

        {/* BOTÃO DEV SKIP */}
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
        </Suspense>
      </Canvas>
    </>
  );
}

import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { FaseAtmosfera } from "./components/FaseAtmosfera";
import { FaseOceano } from "./components/FaseOceano";
import { AudioManager } from "./components/AudioManager";

// Pequeno componente para mostrar que está carregando
function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="orange" wireframe />
    </mesh>
  );
}

export default function App() {
  const [faseAtual, setFaseAtual] = useState(0);
  const [energiaHUD, setEnergiaHUD] = useState(0);

  return (
    <>
      {/* Gerenciador de áudio (sem UI) */}
      <AudioManager faseAtual={faseAtual} />

      <div style={{ position: "absolute", top: 12, left: 12, right: 12, color: "white", zIndex: 10, pointerEvents: "none" }}>
        <h1 style={{ margin: 0, textTransform: "uppercase", fontSize: "clamp(0.85rem, 3.5vw, 1.5rem)", lineHeight: 1.2 }}>
          {faseAtual === 0 ? "Fase 1: Atmosfera" : "Fase 2: Sopa Primordial"}
        </h1>
        {faseAtual === 0 && (
          <div style={{ maxWidth: "300px", width: "70%", height: "8px", background: "rgba(255,255,255,0.1)", marginTop: "8px", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ width: `${energiaHUD}%`, height: "100%", background: "linear-gradient(90deg, #ff8800, #00ff88)", transition: "width 0.3s" }} />
          </div>
        )}
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
              onFaseConcluida={() => { setFaseAtual(1); setEnergiaHUD(0); }}
            />
          )}
          {faseAtual === 1 && <FaseOceano />}
        </Suspense>
      </Canvas>
    </>
  );
}
import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { FaseAtmosfera } from "./components/FaseAtmosfera";
import { FaseOceano } from "./components/FaseOceano";

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
      <div style={{ position: "absolute", top: 20, left: 20, color: "white", zIndex: 10, pointerEvents: "none" }}>
        <h1 style={{ margin: 0, textTransform: "uppercase", fontSize: "1.5rem" }}>
          {faseAtual === 0 ? "Fase 1: Atmosfera" : "Fase 2: Sopa Primordial"}
        </h1>
        {faseAtual === 0 && (
          <div style={{ width: "300px", height: "10px", background: "rgba(255,255,255,0.1)", marginTop: "10px", borderRadius: "5px", overflow: "hidden" }}>
            <div style={{ width: `${energiaHUD}%`, height: "100%", background: "linear-gradient(90deg, #ff8800, #00ff88)", transition: "width 0.3s" }} />
          </div>
        )}
      </div>

      <Canvas 
        camera={{ position: [0, 0, 10] }} // Afastei um pouco a camera para garantir visão
        dpr={[1, 2]} 
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#020202"]} />

        {/* O Suspense agora mostra o 'Loader' enquanto as texturas baixam */}
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
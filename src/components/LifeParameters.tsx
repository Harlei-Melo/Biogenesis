import { useGameStore } from "../store/gameStore";

// 🔴 DICIONÁRIO DE TRADUÇÃO:
// Como a store usa nomes em inglês para a lógica, traduzimos aqui para a interface
const traduzirEstagio = (stage: string) => {
  const dicionario: Record<string, string> = {
    AminoAcids: "Sintetizando Aminoácidos",
    RNA: "Mundo do RNA",
    Protocell: "Formação de Protocélulas",
    Life: "Vida Primitiva",
  };
  return dicionario[stage] || stage;
};

export function LifeParameters() {
  const parameters = useGameStore((state) => state.parameters);
  const setParameter = useGameStore((state) => state.setParameter);
  const stage = useGameStore((state) => state.stage);
  const progress = useGameStore((state) => state.progress);
  const stability = useGameStore((state) => state.stability);

  // 🔴 CONVERSÕES CIENTÍFICAS PARA EXIBIÇÃO
  // Mapeia 0.0 - 1.0 para 273K - 373K (Água em estado líquido)
  const displayTemp = Math.round(273 + parameters.temperature * 100);

  // Mapeia 0.0 - 1.0 para 0.0 - 150.0 kJ (Energia Química)
  const displayEnergy = (parameters.energy * 150).toFixed(1);

  // Mapeia 0.0 - 1.0 para 0% - 100%
  const displayTurbulence = Math.round(parameters.turbulence * 100);

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "clamp(8px, 2vh, 20px)",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "rgba(5, 7, 12, 0.85)", // Um pouco mais escuro/azulado
    backdropFilter: "blur(10px)", // Efeito glassmorphism sutil
    padding: "clamp(15px, 2vw, 25px)",
    borderRadius: "12px",
    color: "white",
    fontFamily: "monospace",
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(8px, 1.5vh, 12px)",
    // Aumentamos um pouco a largura para caber as palavras em português
    width: "clamp(280px, 80vw, 350px)",
    border: "1px solid rgba(0, 255, 255, 0.15)", // Borda sutil neon
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    boxSizing: "border-box",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "clamp(10px, 2.5vw, 13px)",
    flexShrink: 0,
    minWidth: "95px", // Maior para caber "Temperatura" e "Turbulência"
    color: "#aaaaaa",
    textTransform: "uppercase",
    letterSpacing: "1px",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "clamp(11px, 2.5vw, 14px)",
    width: "55px", // Maior para caber "373 K" ou "150.0 kJ"
    textAlign: "right",
    flexShrink: 0,
    color: "#00ffff", // Azul neon para os números científicos
    fontWeight: "bold",
  };

  const sliderStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: "20px",
    cursor: "pointer",
    accentColor: "#00ffff", // Deixa a bolinha do slider com a cor do projeto
  };

  return (
    <div style={containerStyle}>
      <h3
        style={{
          margin: "0 0 5px 0",
          textAlign: "center",
          fontSize: "clamp(12px, 3vw, 15px)",
          color: "#00ff88",
          lineHeight: 1.3,
          textTransform: "uppercase",
          letterSpacing: "2px",
        }}
      >
        Estágio: {traduzirEstagio(stage)} ({Math.round(progress)}%)
      </h3>

      <div style={rowStyle}>
        <span style={labelStyle}>Estabilidade:</span>
        <div
          style={{
            flex: 1,
            height: "6px",
            background: "#222",
            borderRadius: "3px",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: `${stability}%`,
              height: "100%",
              background:
                stability > 50
                  ? "linear-gradient(90deg, #00aa55, #00ff88)"
                  : "linear-gradient(90deg, #aa0000, #ff3333)",
              transition: "width 0.3s ease, background 0.3s ease",
            }}
          />
        </div>
        <span
          style={{
            ...valueStyle,
            color: stability > 50 ? "#00ff88" : "#ff3333",
          }}
        >
          {Math.round(stability)}%
        </span>
      </div>

      <hr
        style={{
          border: "0",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          width: "100%",
          margin: "4px 0",
        }}
      />

      <div style={rowStyle}>
        <label style={labelStyle}>Temperatura</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={parameters.temperature}
          onChange={(e) =>
            setParameter("temperature", parseFloat(e.target.value))
          }
          style={sliderStyle}
        />
        <span style={valueStyle}>{displayTemp} K</span>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Energia</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={parameters.energy}
          onChange={(e) => setParameter("energy", parseFloat(e.target.value))}
          style={sliderStyle}
        />
        <span style={valueStyle}>{displayEnergy} kJ</span>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Turbulência</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={parameters.turbulence}
          onChange={(e) =>
            setParameter("turbulence", parseFloat(e.target.value))
          }
          style={sliderStyle}
        />
        <span style={valueStyle}>{displayTurbulence}%</span>
      </div>
    </div>
  );
}

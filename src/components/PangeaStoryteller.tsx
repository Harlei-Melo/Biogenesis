import { useState } from "react";
import { useGameStore } from "../store/gameStore";

const steps = [
  {
    pergunta:
      "A terra firme é árida. O que é necessário para a vida vegetal prosperar?",
    palavrasChave: ["agua", "água", "chuva", "umidade", "chuvas"],
    progressoAlvo: 30, // Faz nascer as samambaias
    msgSucesso: "Água adicionada. A vida encontra um caminho.",
  },
  {
    pergunta:
      "A flora dominou a terra. Que gigantes logo reinarão sobre este mundo?",
    palavrasChave: [
      "dinossauro",
      "dinossauros",
      "dino",
      "repteis",
      "répteis",
      "t-rex",
      "trex",
    ],
    progressoAlvo: 70, // Faz nascer as árvores e dinossauros maiores
    msgSucesso: "Gigantes adicionados ao ambiente.",
  },
  {
    pergunta: "Tudo parece pacífico... Mas como eles morreram mesmo?",
    palavrasChave: ["asteroide", "asteróide", "meteoro", "cometa", "meteorito"],
    progressoAlvo: 100,
    msgSucesso: "Impacto iminente detectado...",
  },
];

export function PangeaStoryteller() {
  const [stepAtual, setStepAtual] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [erro, setErro] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const stage = useGameStore((s) => s.stage);
  const avancarPangea = useGameStore((s) => s.avancarPangea);
  const triggerExtincao = useGameStore((s) => s.triggerExtincao);

  // Se estiver na fase de extinção (o meteoro já está caindo), removemos a UI
  if (stage === "Extinction") return null;

  const step = steps[stepAtual];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = inputVal.toLowerCase().trim();

    // Verifica se a resposta contém alguma das palavras chave
    const acertou = step.palavrasChave.some((p) => cleanInput.includes(p));

    if (acertou) {
      setErro(false);
      setSucesso(true);
      setInputVal("");

      setTimeout(() => {
        setSucesso(false);
        if (stepAtual === steps.length - 1) {
          triggerExtincao();
        } else {
          avancarPangea(step.progressoAlvo);
          setStepAtual((prev) => prev + 1);
        }
      }, 2500); // Aguarda 2.5s para o usuário ler a mensagem de sucesso
    } else {
      setErro(true);
      setTimeout(() => setErro(false), 600); // Remove o estado de erro após o shake
    }
  };

  // Estilos Inline (Glassmorphism & Animações)
  const glassStyle: React.CSSProperties = {
    background: "rgba(10, 20, 30, 0.55)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "20px",
    padding: "35px",
    color: "#f0f0f0",
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
    textAlign: "center",
    transform: erro ? "translateX(0)" : "none",
    animation: erro ? "shake 0.5s cubic-bezier(.36,.07,.19,.97) both" : "none",
    transition: "all 0.4s ease",
    pointerEvents: "auto",
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: "12%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        width: "90%",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none", // Apenas a caixa interna bloqueia cliques
      }}
    >
      {/* Injeção de keyframes para o Shake Effect */}
      <style>
        {`
                @keyframes shake {
                    10%, 90% { transform: translate3d(-2px, 0, 0); }
                    20%, 80% { transform: translate3d(4px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-8px, 0, 0); }
                    40%, 60% { transform: translate3d(8px, 0, 0); }
                }
                `}
      </style>

      <div style={glassStyle}>
        {sucesso ? (
          <div style={{ animation: "fadeIn 0.5s ease-in" }}>
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 500,
                color: "#00ff88",
                margin: 0,
              }}
            >
              {step.msgSucesso}
            </h2>
          </div>
        ) : (
          <>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 300,
                marginBottom: "25px",
                lineHeight: 1.5,
              }}
            >
              {step.pergunta}
            </h2>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", gap: "12px", height: "45px" }}
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Digite sua resposta..."
                disabled={sucesso}
                style={{
                  flex: 1,
                  background: "rgba(0, 0, 0, 0.4)",
                  border: erro
                    ? "1px solid #ff4444"
                    : "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "10px",
                  padding: "0 18px",
                  color: "white",
                  outline: "none",
                  fontSize: "1rem",
                  transition: "border 0.3s, box-shadow 0.3s",
                  boxShadow: erro ? "0 0 10px rgba(255, 68, 68, 0.4)" : "none",
                }}
              />
              <button
                type="submit"
                disabled={sucesso}
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0 24px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                  transition: "transform 0.1s, background 0.3s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#dddddd")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#ffffff")
                }
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = "scale(0.96)")
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                Enviar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

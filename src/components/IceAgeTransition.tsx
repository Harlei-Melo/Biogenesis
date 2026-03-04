import { useState, useEffect } from "react";
import { useGameStore } from "../store/gameStore";

export function IceAgeTransition() {
  const setStage = useGameStore((state) => state.setStage);

  // Controle de etapas da animação
  // 0 = Clarão Branco -> Esfriando
  // 1 = Mensagem de Impacto
  // 2 = Fade out da Mensagem -> Caixinha de Pergunta
  // 3 = Loading...
  const [step, setStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    // Coreografia de tempo da Cutscene UI
    const t1 = setTimeout(() => setStep(1), 1000); // Espera 1s no branco e revela texto
    const t2 = setTimeout(() => setStep(2), 6500); // Após 5.5s, troca texto pelo Input

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const answer = inputValue.toLowerCase().trim();

    if (
      answer === "humano" ||
      answer === "humanos" ||
      answer === "homo sapiens"
    ) {
      setError(false);
      setStep(3); // Inicia o Loading

      // Espera 3 segundos de loading e joga para a fase 3D da Terra (Humanity)
      setTimeout(() => {
        setStage("Humanity");
      }, 3000);
    } else {
      setError(true);
      setInputValue("");
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        // 🔴 CORREÇÃO AQUI: Fundo transparente para o 3D aparecer!
        background: step === 0 ? "#ffffff" : "rgba(0, 0, 0, 0.5)",
        transition: "background 3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999999, // Fica por cima de absolutamente todo o canvas 3D
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      {/* MENSAGEM DE IMPACTO (GLASSMORPHISM) */}
      <div
        style={{
          position: "absolute",
          opacity: step === 1 ? 1 : 0,
          transform: step === 1 ? "translateY(0)" : "translateY(20px)",
          transition: "all 1.5s ease-in-out",
          pointerEvents: "none",
          padding: "40px 60px",
          background: "rgba(255, 255, 255, 0.05)", // Glass
          backdropFilter: "blur(12px)", // O desfoque do vidro
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "2rem",
            fontWeight: 300,
            letterSpacing: "2px",
            color: "#e0f0ff",
          }}
        >
          O planeta foi atingido.
        </h2>
        <p
          style={{
            margin: "10px 0 0 0",
            fontSize: "1.2rem",
            fontWeight: 200,
            color: "#88aadd",
          }}
        >
          Entramos na Era do Gelo.
        </p>
      </div>

      {/* CAIXINHA DE PERGUNTA */}
      <div
        style={{
          position: "absolute",
          opacity: step === 2 ? 1 : 0,
          pointerEvents: step === 2 ? "all" : "none",
          transition: "opacity 1.5s ease",
          textAlign: "center",
        }}
      >
        <h3
          style={{
            fontSize: "1.5rem",
            fontWeight: 300,
            marginBottom: "30px",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          }}
        >
          Com esse evento, quem dominou a Terra daqui em diante?
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={step !== 2}
            placeholder="Digite sua resposta..."
            style={{
              padding: "15px 25px",
              fontSize: "1.2rem",
              borderRadius: "50px",
              border: error
                ? "2px solid #ff4444"
                : "1px solid rgba(255,255,255,0.3)",
              background: "rgba(0,0,0,0.4)",
              color: "white",
              outline: "none",
              textAlign: "center",
              width: "300px",
              boxShadow: error ? "0 0 15px rgba(255,68,68,0.3)" : "none",
              transition: "all 0.3s ease",
            }}
          />
        </form>
      </div>

      {/* TELA DE LOADING NATIVA */}
      <div
        style={{
          position: "absolute",
          opacity: step === 3 ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 1s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Um spinner minimalista */}
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: "#ffffff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "20px",
          }}
        />
        <p
          style={{
            letterSpacing: "3px",
            fontSize: "0.9rem",
            color: "#88aadd",
            textTransform: "uppercase",
          }}
        >
          Avançando Milênios...
        </p>
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    </div>
  );
}

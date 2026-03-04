import { create } from "zustand";

export type EvolutionStage = 
  | "AminoAcids" 
  | "RNA" 
  | "Protocell" 
  | "Life" 
  | "Pangea" 
  | "Extinction" 
  | "IceAge" 
  | "Humanity"; // <--- FASES ADICIONADAS

interface GameState {
  parameters: {
    temperature: number;
    energy: number;
    turbulence: number;
  };

  stage: EvolutionStage;
  progress: number;
  stability: number; 

  setParameter: (
    param: "temperature" | "energy" | "turbulence",
    value: number,
  ) => void;
  updateSimulation: (delta: number) => void;

  avancarPangea: (novoProgresso: number) => void;
  triggerExtincao: () => void;
  
  // 🔴 NOVO: Função universal para forçar a mudança de fase (usada pela Cutscene e pela UI do Gelo)
  setStage: (stage: EvolutionStage) => void; 
}

export const useGameStore = create<GameState>((set, get) => ({
  parameters: { temperature: 0.5, energy: 0.2, turbulence: 0.3 },
  stage: "AminoAcids",
  progress: 0,
  stability: 100,

  avancarPangea: (novoProgresso) => set({ progress: novoProgresso }),
  triggerExtincao: () => set({ stage: "Extinction", progress: 0, stability: 50 }),
  
  // 🔴 IMPLEMENTAÇÃO DO setStage
  setStage: (stage) => set({ stage, progress: 0, stability: 100 }),

  setParameter: (param, value) =>
    set((state) => ({
      parameters: { ...state.parameters, [param]: value },
    })),

  updateSimulation: (delta) => {
    const { parameters, stage, progress, stability } = get();

    let targetTemp = 0.5;
    let targetEnergy = 0.5;

    if (stage === "AminoAcids") {
      targetTemp = 0.8; 
      targetEnergy = 0.8; 
    } else if (stage === "RNA") {
      targetTemp = 0.5; 
      targetEnergy = 0.5;
    } else if (stage === "Protocell") {
      targetTemp = 0.3; 
      targetEnergy = 0.2;
    }

    const tempDist = Math.abs(parameters.temperature - targetTemp);
    const energyDist = Math.abs(parameters.energy - targetEnergy);
    const conditionScore = 1.0 - (tempDist + energyDist) / 2; 

    const newStability = Math.min(
      100,
      Math.max(
        0,
        stability +
          (conditionScore > 0.8 ? 5 : -5) * delta -
          parameters.turbulence * 2 * delta,
      ),
    );

    let newProgress = progress;

    if (stage === "Extinction") {
      newProgress += delta * 3; 
    } else if (
      // 🔴 PROTEÇÃO AAA: Garante que as fases novas não progridam sozinhas com a matemática velha
      ["AminoAcids", "RNA", "Protocell", "Life"].includes(stage) &&
      newStability > 50 &&
      conditionScore > 0.7
    ) {
      newProgress += delta * 5; 
    }

    if (newProgress >= 100) {
      let nextStage: EvolutionStage = stage;

      if (stage === "AminoAcids") nextStage = "RNA";
      else if (stage === "RNA") nextStage = "Protocell";
      else if (stage === "Protocell") nextStage = "Life";
      else if (stage === "Life") nextStage = "Pangea";
      else if (stage === "Pangea") nextStage = "Extinction";

      if (nextStage !== stage) {
        set({ stage: nextStage, progress: 0, stability: 50 }); 
        return;
      }
    }

    if (stage === "Extinction" && newProgress >= 100) {
      newProgress = 100;
    }

    set({ progress: Math.min(100, newProgress), stability: newStability });
  },
}));
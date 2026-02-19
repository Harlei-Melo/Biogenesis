import { create } from 'zustand';

export type EvolutionStage = 'AminoAcids' | 'RNA' | 'Protocell' | 'Life';

interface GameState {
    // Parameters controlled by the user
    parameters: {
        temperature: number; // 0.0 to 1.0 (Cold -> Hot)
        energy: number;      // 0.0 to 1.0 (Calm -> Storm/Volcanic)
        turbulence: number;  // 0.0 to 1.0 (Stagnant -> Chaotic)
    };

    // Progress
    stage: EvolutionStage;
    progress: number; // 0 to 100% for the current stage
    stability: number; // 0 to 100% (Must be high to progress)

    setParameter: (param: 'temperature' | 'energy' | 'turbulence', value: number) => void;
    updateSimulation: (delta: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
    parameters: { temperature: 0.5, energy: 0.2, turbulence: 0.3 },
    stage: 'AminoAcids',
    progress: 0,
    stability: 100,

    setParameter: (param, value) =>
        set((state) => ({
            parameters: { ...state.parameters, [param]: value }
        })),

    updateSimulation: (delta) => {
        const { parameters, stage, progress, stability } = get();

        // Simulation Logic (Simplified "Goldilocks Zone")
        let targetTemp = 0.5;
        let targetEnergy = 0.5;

        // Different stages need different conditions
        if (stage === 'AminoAcids') {
            targetTemp = 0.8; // Needs heat
            targetEnergy = 0.8; // Needs lightning/volcano
        } else if (stage === 'RNA') {
            targetTemp = 0.5; // Needs cycling (avg medium)
            targetEnergy = 0.5;
        } else if (stage === 'Protocell') {
            targetTemp = 0.3; // Needs creating cooling/stability
            targetEnergy = 0.2;
        }

        // Calculate alignment with targets
        const tempDist = Math.abs(parameters.temperature - targetTemp);
        const energyDist = Math.abs(parameters.energy - targetEnergy);
        const conditionScore = 1.0 - ((tempDist + energyDist) / 2); // 1.0 is perfect

        // Update Stability
        // Turbulence hurts stability, usually
        const newStability = Math.min(100, Math.max(0,
            stability + (conditionScore > 0.8 ? 5 : -5) * delta - (parameters.turbulence * 2 * delta)
        ));

        // Update Progress (only if stable)
        let newProgress = progress;
        if (newStability > 50 && conditionScore > 0.7) {
            newProgress += delta * 5; // Grow 5% per second if conditions are good
        }

        // Check Stage Complete
        if (newProgress >= 100) {
            let nextStage: EvolutionStage = stage;
            if (stage === 'AminoAcids') nextStage = 'RNA';
            else if (stage === 'RNA') nextStage = 'Protocell';
            else if (stage === 'Protocell') nextStage = 'Life';

            if (nextStage !== stage) {
                set({ stage: nextStage, progress: 0, stability: 50 }); // Reset for next stage
                return;
            }
        }

        set({ progress: Math.min(100, newProgress), stability: newStability });
    }
}));

import { useGameStore } from '../store/gameStore';
import { AnimatedFishSwarm } from './AnimatedFish';

/**
 * LifeSpawner — Progressive fish population based on evolution stage.
 *
 * Models available (all confirmed animated):
 *   animated_low_poly_fish.glb     ~96 KB  — peixe primitivo low-poly
 *   clown_fish_low_poly_animated.glb ~192 KB — palhaço (melhor modelo: swim + idle + bite)
 *   fish_rainbow_animated.glb      ~2.8 MB  — peixe colorido arco-íris
 *   emperor_angelfish_update.glb   ~8.4 MB  — peixe anjo imperial (22 animações, usar count baixo)
 */
export function LifeSpawner() {
    const stage = useGameStore((state) => state.stage);

    const atLeast = (target: string) => {
        const order = ['AminoAcids', 'RNA', 'Protocell', 'Life'];
        return order.indexOf(stage) >= order.indexOf(target);
    };

    return (
        <group>
            {/* ── RNA: Primeiros seres — pequenos, monocromáticos, primitivos ─── */}
            {atLeast('RNA') && (
                <>
                    {/* Peixe low-poly primitivo — o mais antigo evolutivamente */}
                    <AnimatedFishSwarm
                        modelPath="/models/animated_low_poly_fish.glb"
                        count={12}
                        scale={0.35}
                        speed={2.5}
                        range={25}
                        modelRotation={[0, Math.PI / 2, 0]}
                    />
                </>
            )}

            {/* ── Protocell: Diversidade cresce — formas distintas aparecem ────── */}
            {atLeast('Protocell') && (
                <>
                    {/* Palhaço low-poly — swim + idle: animação perfeita */}
                    <AnimatedFishSwarm
                        modelPath="/models/clown_fish_low_poly_animated.glb"
                        count={10}
                        scale={0.25}
                        speed={3.0}
                        range={28}
                        modelRotation={[0, Math.PI, 0]}
                    />
                    {/* Peixe arco-íris — mais colorido, nível intermediário */}
                    <AnimatedFishSwarm
                        modelPath="/models/fish_rainbow_animated.glb"
                        count={8}
                        scale={0.4}
                        speed={2.2}
                        range={30}
                        modelRotation={[0, Math.PI / 2, 0]}
                    />
                </>
            )}

            {/* ── Life: Ecossistema completo — biodiversidade máxima ────────────── */}
            {stage === 'Life' && (
                <>
                    {/* Mais primitivos — o berço evolutivo ainda presente */}
                    <AnimatedFishSwarm
                        modelPath="/models/animated_low_poly_fish.glb"
                        count={18}
                        scale={0.35}
                        speed={3.2}
                        range={40}
                        modelRotation={[0, Math.PI / 2, 0]}
                    />
                    {/* Cardume de palhaços maior */}
                    <AnimatedFishSwarm
                        modelPath="/models/clown_fish_low_poly_animated.glb"
                        count={15}
                        scale={0.28}
                        speed={3.5}
                        range={38}
                        modelRotation={[0, Math.PI, 0]}
                    />
                    {/* Arco-íris — destaque visual do fundo do mar */}
                    <AnimatedFishSwarm
                        modelPath="/models/fish_rainbow_animated.glb"
                        count={10}
                        scale={0.45}
                        speed={2.8}
                        range={42}
                        modelRotation={[0, Math.PI / 2, 0]}
                    />
                    {/* Peixe anjo imperial — raro, peixe premium da fase final */}
                    <AnimatedFishSwarm
                        modelPath="/models/emperor_angelfish_update.glb"
                        count={2}
                        scale={0.8}
                        speed={1.8}
                        range={45}
                        modelRotation={[0, Math.PI, 0]}
                    />
                </>
            )}
        </group>
    );
}

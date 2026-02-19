import { useGameStore } from '../store/gameStore';
import { AnimatedFishSwarm } from './AnimatedFish';

/**
 * LifeSpawner — Progressive fish population based on evolution stage.
 *
 * Forward-axis correction is now automatic per-model via bounding box
 * analysis in AnimatedFish.tsx — no manual yawOffset/modelRotation needed.
 */
export function LifeSpawner() {
    const stage = useGameStore((state) => state.stage);

    const atLeast = (target: string) => {
        const order = ['AminoAcids', 'RNA', 'Protocell', 'Life'];
        return order.indexOf(stage) >= order.indexOf(target);
    };

    return (
        <group>
            {/* ── RNA: Primeiros seres — pequenos, primitivos ──────────────── */}
            {atLeast('RNA') && (
                <AnimatedFishSwarm
                    modelPath="/models/animated_low_poly_fish.glb"
                    count={12}
                    scale={0.35}
                    speed={2.5}
                    range={25}
                    yawOverride={0}
                />
            )}

            {/* ── Protocell: Diversidade cresce ────────────────────────────── */}
            {atLeast('Protocell') && (
                <>
                    <AnimatedFishSwarm
                        modelPath="/models/clown_fish_low_poly_animated.glb"
                        count={10}
                        scale={0.25}
                        speed={3.0}
                        range={28}
                    />
                    <AnimatedFishSwarm
                        modelPath="/models/fish_rainbow_animated.glb"
                        count={8}
                        scale={0.4}
                        speed={2.2}
                        range={30}
                    />
                </>
            )}

            {/* ── Life: Ecossistema completo ───────────────────────────────── */}
            {stage === 'Life' && (
                <>
                    <AnimatedFishSwarm
                        modelPath="/models/animated_low_poly_fish.glb"
                        count={18}
                        scale={0.35}
                        speed={3.2}
                        range={40}
                        yawOverride={0}
                    />
                    <AnimatedFishSwarm
                        modelPath="/models/clown_fish_low_poly_animated.glb"
                        count={15}
                        scale={0.28}
                        speed={3.5}
                        range={38}
                    />
                    <AnimatedFishSwarm
                        modelPath="/models/fish_rainbow_animated.glb"
                        count={10}
                        scale={0.45}
                        speed={2.8}
                        range={42}
                    />
                    <AnimatedFishSwarm
                        modelPath="/models/emperor_angelfish_update.glb"
                        count={2}
                        scale={0.8}
                        speed={1.8}
                        range={45}
                    />
                </>
            )}
        </group>
    );
}

import { useGameStore } from '../store/gameStore';
import { AnimatedFishSwarm } from './AnimatedFish';
import { OceanFlora } from './OceanFlora';
import { JellyfishSwarm } from './JellyfishSwarm';
import { useIsMobile } from '../hooks/useIsMobile';

/**
 * LifeSpawner — Progressive ecosystem based on evolution stage.
 *
 * On mobile, fish counts are halved to reduce GPU load and visual clutter.
 */
export function LifeSpawner() {
    const stage = useGameStore((state) => state.stage);
    const isMobile = useIsMobile();

    const atLeast = (target: string) => {
        const order = ['AminoAcids', 'RNA', 'Protocell', 'Life'];
        return order.indexOf(stage) >= order.indexOf(target);
    };

    // Mobile gets roughly half the fish/jellyfish
    const m = (desktop: number) => isMobile ? Math.max(2, Math.ceil(desktop * 0.5)) : desktop;

    return (
        <group>
            {/* ── Flora do fundo do mar (progressiva) ──────────────────────── */}
            <OceanFlora isMobile={isMobile} />

            {/* ── RNA: Primeiros seres — pequenos, primitivos ──────────────── */}
            {atLeast('RNA') && (
                <AnimatedFishSwarm
                    modelPath="/models/animated_low_poly_fish.glb"
                    count={m(12)}
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
                        count={m(10)}
                        scale={0.25}
                        speed={3.0}
                        range={28}
                    />
                    <AnimatedFishSwarm
                        modelPath="/models/fish_rainbow_animated.glb"
                        count={m(8)}
                        scale={0.4}
                        speed={2.2}
                        range={30}
                    />
                    {/* Primeiras águas-vivas */}
                    <JellyfishSwarm
                        modelPath="/models/jellyfish.glb"
                        count={m(3)}
                        scale={0.4}
                        speed={0.3}
                        range={22}
                        yMin={3}
                        yMax={10}
                    />
                </>
            )}

            {/* ── Life: Ecossistema completo ───────────────────────────────── */}
            {stage === 'Life' && (
                <>
                    <AnimatedFishSwarm
                        modelPath="/models/animated_low_poly_fish.glb"
                        count={m(18)}
                        scale={0.35}
                        speed={3.2}
                        range={40}
                        yawOverride={0}
                    />
                    <AnimatedFishSwarm
                        modelPath="/models/clown_fish_low_poly_animated.glb"
                        count={m(15)}
                        scale={0.28}
                        speed={3.5}
                        range={38}
                    />
                    <AnimatedFishSwarm
                        modelPath="/models/fish_rainbow_animated.glb"
                        count={m(10)}
                        scale={0.45}
                        speed={2.8}
                        range={42}
                    />
                    <AnimatedFishSwarm
                        modelPath="/models/emperor_angelfish_update.glb"
                        count={m(2)}
                        scale={0.8}
                        speed={1.8}
                        range={45}
                    />
                    {/* Mais águas-vivas */}
                    <JellyfishSwarm
                        modelPath="/models/jellyfish.glb"
                        count={m(5)}
                        scale={0.5}
                        speed={0.35}
                        range={30}
                        yMin={4}
                        yMax={14}
                    />
                </>
            )}
        </group>
    );
}

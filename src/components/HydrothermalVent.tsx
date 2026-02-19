import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';

interface HydrothermalVentProps {
    position: [number, number, number];
}

/**
 * Hydrothermal Vent – simplified version.
 * Just a dark basaltic rock column with a pulsing magma point-light.
 * The custom GLSL shader caused rendering issues and was removed.
 */
export function HydrothermalVent({ position }: HydrothermalVentProps) {
    const parameters = useGameStore((state) => state.parameters);
    const lightRef = useRef<any>(null);

    useFrame((state) => {
        if (lightRef.current) {
            // Pulse the glow with energy + subtle flicker
            const t = state.clock.elapsedTime;
            const flicker = Math.sin(t * 7.3) * 0.15 + Math.sin(t * 3.1) * 0.1;
            lightRef.current.intensity = (0.8 + parameters.energy * 1.5) + flicker;
        }
    });

    return (
        <group position={position}>
            {/* Dark basaltic rock stack */}
            <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.6, 1.1, 3.0, 8, 1]} />
                <meshStandardMaterial color="#1a1008" roughness={0.95} metalness={0.1} />
            </mesh>
            {/* Smaller cap */}
            <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.3, 0.6, 0.8, 8, 1]} />
                <meshStandardMaterial color="#120e08" roughness={0.98} metalness={0.05} />
            </mesh>
            {/* Magma glow – point light only, no geometry */}
            <pointLight
                ref={lightRef}
                position={[0, 2.8, 0]}
                color="#ff4800"
                intensity={1.5}
                distance={8}
                decay={2}
            />
        </group>
    );
}

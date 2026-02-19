import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HydrothermalVentProps {
    position: [number, number, number];
}

/**
 * HydrothermalVent — Procedural deep-sea "black smoker" chimney.
 *
 * Visual elements:
 *  • Irregular basaltic rock column (jittered vertices)
 *  • Magma fissures (emissive bands on the surface)
 *  • Pulsing magma glow (point light)
 *  • Rising smoke particles (Points system ascending)
 */
export function HydrothermalVent({ position }: HydrothermalVentProps) {
    const smokeRef = useRef<THREE.Points>(null!);
    const lightRef = useRef<THREE.PointLight>(null!);
    const glowRef = useRef<THREE.Mesh>(null!);

    // ── Irregular rock geometry ────────────────────────────────────────────
    const rockGeometry = useMemo(() => {
        const geo = new THREE.CylinderGeometry(0.5, 1.2, 3.5, 10, 6);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const normalizedY = (y + 1.75) / 3.5; // 0 at bottom, 1 at top
            // More jitter at the top (irregular mineral deposits)
            const jitter = (0.05 + normalizedY * 0.15) * (Math.random() * 2 - 1);
            pos.setX(i, pos.getX(i) + jitter);
            pos.setZ(i, pos.getZ(i) + jitter);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    }, []);

    // ── Smoke particle system ─────────────────────────────────────────────
    const particleCount = 40;
    const smokeData = useMemo(() => {
        const positions = new Float32Array(particleCount * 3);
        const speeds = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
            // Start near the top of the chimney
            positions[i * 3] = (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = 2.5 + Math.random() * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
            speeds[i] = 0.5 + Math.random() * 1.0;
        }
        return { positions, speeds };
    }, []);

    const smokeGeometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(
            smokeData.positions.slice(), 3,
        ));
        return geo;
    }, [smokeData]);

    // ── Animation loop ────────────────────────────────────────────────────
    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Animate smoke particles rising
        if (smokeRef.current) {
            const pos = smokeRef.current.geometry.attributes.position;
            for (let i = 0; i < particleCount; i++) {
                let y = pos.getY(i);
                y += smokeData.speeds[i] * 0.016; // ~60fps step
                // Reset to bottom when reaching top
                if (y > 8) {
                    y = 2.5 + Math.random() * 0.5;
                    pos.setX(i, (Math.random() - 0.5) * 0.5);
                    pos.setZ(i, (Math.random() - 0.5) * 0.5);
                }
                // Spread out as they rise
                const spread = (y - 2.5) * 0.04;
                pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * spread * 0.1);
                pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * spread * 0.1);
                pos.setY(i, y);
            }
            (pos as THREE.BufferAttribute).needsUpdate = true;
        }

        // Pulse the magma glow
        if (lightRef.current) {
            const flicker = Math.sin(t * 7.3) * 0.3 + Math.sin(t * 3.1) * 0.2;
            lightRef.current.intensity = 2.0 + flicker;
        }

        // Pulse the glow ring
        if (glowRef.current) {
            const mat = glowRef.current.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.4 + Math.sin(t * 4) * 0.15;
        }
    });

    return (
        <group position={position}>
            {/* Main rock chimney */}
            <mesh geometry={rockGeometry} position={[0, 1.75, 0]} castShadow receiveShadow>
                <meshStandardMaterial
                    color="#1a1008"
                    roughness={0.95}
                    metalness={0.15}
                    emissive="#331100"
                    emissiveIntensity={0.04}
                />
            </mesh>

            {/* Smaller cap / mineral deposit */}
            <mesh position={[0, 3.7, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.2, 0.5, 0.6, 8, 1]} />
                <meshStandardMaterial
                    color="#120805"
                    roughness={0.98}
                    metalness={0.1}
                    emissive="#662200"
                    emissiveIntensity={0.1}
                />
            </mesh>

            {/* Magma glow ring at the top */}
            <mesh ref={glowRef} position={[0, 3.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.1, 0.35, 16]} />
                <meshBasicMaterial
                    color="#cc4400"
                    transparent
                    opacity={0.35}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Magma point light */}
            <pointLight
                ref={lightRef}
                position={[0, 3.8, 0]}
                color="#cc3300"
                intensity={1.5}
                distance={8}
                decay={2}
            />

            {/* Rising smoke / mineral particles */}
            <points ref={smokeRef} geometry={smokeGeometry}>
                <pointsMaterial
                    color="#334455"
                    size={0.15}
                    transparent
                    opacity={0.35}
                    depthWrite={false}
                    sizeAttenuation
                />
            </points>
        </group >
    );
}

/**
 * JellyfishSwarm.tsx — Animated jellyfish floating above the ocean floor.
 *
 * Uses the same SkeletonUtils + AnimationMixer pattern as AnimatedFish,
 * but with different movement behavior:
 *  • Primarily VERTICAL drift (pulsing up/down)
 *  • Very slow horizontal wander
 *  • No banking — jellyfish are radially symmetric
 *  • Semi-transparent materials
 */

import { useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JellyfishProps {
    modelPath: string;
    scale: number;
    speed: number;
    range: number;
    initialPosition: THREE.Vector3;
}

export interface JellyfishSwarmProps {
    modelPath: string;
    count?: number;
    scale?: number;
    speed?: number;
    range?: number;
    yMin?: number;
    yMax?: number;
}

const SWIM_NAMES = ['Swim', 'swim', 'Action', 'idle', 'Idle', 'Take 001', 'ArmatureAction'];

// ─── Single Jellyfish ─────────────────────────────────────────────────────────

function Jellyfish({
    modelPath, scale, speed, range, initialPosition,
}: JellyfishProps) {
    const groupRef = useRef<THREE.Group>(null!);
    const { scene, animations } = useGLTF(modelPath);

    const clonedScene = useMemo(() => {
        const s = skeletonClone(scene) as THREE.Group;
        s.traverse((node: THREE.Object3D) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                const src = Array.isArray(mesh.material)
                    ? mesh.material[0] : mesh.material;
                const mat = (src as THREE.MeshStandardMaterial).clone();
                // Make jellyfish translucent and glowing
                mat.transparent = true;
                mat.opacity = 0.65;
                mat.emissive = new THREE.Color(0x112244);
                mat.emissiveIntensity = 0.4;
                mat.side = THREE.DoubleSide;
                mesh.material = mat;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
            }
        });
        return s;
    }, [scene]);

    const [mixer] = useMemo(
        () => [new THREE.AnimationMixer(undefined as unknown as THREE.Object3D)],
        [],
    );

    useLayoutEffect(() => {
        (mixer as THREE.AnimationMixer & { _root: THREE.Object3D })._root = clonedScene;
        if (animations.length === 0) return;

        const rawClip =
            animations.find(a => SWIM_NAMES.some(n => a.name.includes(n)))
            ?? animations[0];

        // Filter OUT scale tracks — they cause the grow/shrink pulsing
        const filteredTracks = rawClip.tracks.filter(
            track => !track.name.endsWith('.scale'),
        );
        const clip = new THREE.AnimationClip(
            rawClip.name, rawClip.duration, filteredTracks,
        );

        const action = mixer.clipAction(clip, clonedScene);
        action
            .reset()
            .setEffectiveTimeScale(0.5 + Math.random() * 0.3) // slow, dreamy
            .setEffectiveWeight(1)
            .setLoop(THREE.LoopRepeat, Infinity);
        action.time = Math.random() * clip.duration;
        action.play();

        return () => {
            action.stop();
            mixer.uncacheAction(clip, clonedScene);
            mixer.uncacheRoot(clonedScene);
        };
    }, [mixer, clonedScene, animations]);

    useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);

    // Drift state — jellyfish drift lazily, mostly vertically
    const phase = useRef(Math.random() * Math.PI * 2);
    const driftDir = useRef(
        new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            0.5 + Math.random() * 0.5,  // mostly upward initially
            (Math.random() - 0.5) * 0.3,
        ).normalize(),
    );
    const wanderTimer = useRef(Math.random() * 5);

    useFrame((_, rawDelta) => {
        const group = groupRef.current;
        if (!group) return;
        const delta = Math.min(rawDelta, 0.05);

        mixer.update(delta);

        // Wander: slow direction changes
        wanderTimer.current -= delta;
        if (wanderTimer.current <= 0) {
            wanderTimer.current = 5 + Math.random() * 8; // 5-13s between changes
            driftDir.current.set(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.8,  // strong vertical component
                (Math.random() - 0.5) * 0.4,
            ).normalize();
        }

        // Move — very slow
        group.position.addScaledVector(driftDir.current, speed * delta);

        // Pulsing vertical bob (the "jellyfish pump" feel)
        phase.current += delta;
        group.position.y += Math.sin(phase.current * 1.5) * 0.15 * delta;

        // Boundary: keep within range horizontally
        const hDist = Math.sqrt(
            group.position.x * group.position.x + group.position.z * group.position.z,
        );
        if (hDist > range) {
            const homeDir = new THREE.Vector3(-group.position.x, 0, -group.position.z).normalize();
            driftDir.current.lerp(homeDir, 0.3).normalize();
        }

        // Vertical bounds: keep between yMin=2 and yMax=12 (relative to parent)
        if (group.position.y > 12) {
            driftDir.current.y = -Math.abs(driftDir.current.y);
        } else if (group.position.y < 2) {
            driftDir.current.y = Math.abs(driftDir.current.y);
        }

        // Gentle rotation — jellyfish slowly spin
        group.rotation.y += delta * 0.15;
    });

    return (
        <group ref={groupRef} position={initialPosition}>
            <primitive object={clonedScene} scale={scale} />
        </group>
    );
}

// ─── Swarm ────────────────────────────────────────────────────────────────────

export function JellyfishSwarm({
    modelPath,
    count = 3,
    scale = 0.5,
    speed = 0.4,
    range = 20,
    yMin = 3,
    yMax = 10,
}: JellyfishSwarmProps) {
    const positions = useMemo(
        () => Array.from({ length: count }, () =>
            new THREE.Vector3(
                (Math.random() - 0.5) * range * 0.8,
                yMin + Math.random() * (yMax - yMin),
                (Math.random() - 0.5) * range * 0.8,
            ),
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [count, range, yMin, yMax],
    );

    return (
        <>
            {positions.map((pos, i) => (
                <Jellyfish
                    key={i}
                    modelPath={modelPath}
                    scale={scale * (0.7 + Math.random() * 0.6)}
                    speed={speed * (0.8 + Math.random() * 0.4)}
                    range={range}
                    initialPosition={pos}
                />
            ))}
        </>
    );
}

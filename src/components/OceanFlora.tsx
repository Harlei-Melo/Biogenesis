/**
 * OceanFlora.tsx — Static and animated decorations for the ocean floor.
 *
 * Places stromatolites, seaweed, sponges, corals, and kelp around the
 * seabed with progressive appearance tied to evolution stages.
 *
 * Static models: cloned via SkeletonUtils, placed with random position/
 * rotation/scale variation, no animation mixer.
 *
 * Animated models: same AnimationMixer pattern from AnimatedFish.tsx
 * (mixer created with undefined root, wired after mount).
 */

import { useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGameStore, type EvolutionStage } from '../store/gameStore';

// ─── Helper: seeded-random positions ──────────────────────────────────────────

function seededPositions(
    count: number,
    radiusMin: number,
    radiusMax: number,
    seed: number,
): THREE.Vector3[] {
    // Simple deterministic pseudo-random (positions are stable across re-renders)
    let s = seed;
    const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };

    return Array.from({ length: count }, () => {
        const angle = rand() * Math.PI * 2;
        const r = radiusMin + rand() * (radiusMax - radiusMin);
        const y = (rand() - 0.5) * 0.3; // slight vertical variation
        return new THREE.Vector3(
            Math.cos(angle) * r,
            y,
            Math.sin(angle) * r,
        );
    });
}

// ─── Static Decoration (no animation) ────────────────────────────────────────

interface StaticDecorationProps {
    modelPath: string;
    position: THREE.Vector3;
    scale: number;
    randomRotation?: boolean;
    scaleVariation?: number;  // 0-1, amount of random scale variation
}

function StaticDecoration({
    modelPath, position, scale, randomRotation = true, scaleVariation = 0.3,
}: StaticDecorationProps) {
    const { scene } = useGLTF(modelPath);

    const clonedScene = useMemo(() => {
        const s = skeletonClone(scene) as THREE.Group;
        s.traverse((node: THREE.Object3D) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                mesh.castShadow = false;
                mesh.receiveShadow = true;
            }
        });
        return s;
    }, [scene]);

    const yRotation = useMemo(
        () => randomRotation ? Math.random() * Math.PI * 2 : 0,
        [randomRotation],
    );
    const finalScale = useMemo(
        () => scale * (1 + (Math.random() - 0.5) * scaleVariation * 2),
        [scale, scaleVariation],
    );

    return (
        <primitive
            object={clonedScene}
            position={position}
            rotation={[0, yRotation, 0]}
            scale={finalScale}
        />
    );
}

// ─── Animated Decoration (plays first animation clip in place) ───────────────

interface AnimatedDecorationProps {
    modelPath: string;
    position: THREE.Vector3;
    scale: number;
    scaleVariation?: number;
}

function AnimatedDecoration({
    modelPath, position, scale, scaleVariation = 0.2,
}: AnimatedDecorationProps) {
    const { scene, animations } = useGLTF(modelPath);

    const clonedScene = useMemo(() => {
        const s = skeletonClone(scene) as THREE.Group;
        s.traverse((node: THREE.Object3D) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                mesh.castShadow = false;
                mesh.receiveShadow = true;
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

        const rawClip = animations[0];
        // Filter OUT scale tracks — prevents unwanted size pulsing
        const filteredTracks = rawClip.tracks.filter(
            track => !track.name.endsWith('.scale'),
        );
        const clip = new THREE.AnimationClip(
            rawClip.name, rawClip.duration, filteredTracks,
        );

        const action = mixer.clipAction(clip, clonedScene);
        action
            .reset()
            .setEffectiveTimeScale(0.6 + Math.random() * 0.4)
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

    useFrame((_, delta) => {
        mixer.update(Math.min(delta, 0.05));
    });

    const yRotation = useMemo(() => Math.random() * Math.PI * 2, []);
    const finalScale = useMemo(
        () => scale * (1 + (Math.random() - 0.5) * scaleVariation * 2),
        [scale, scaleVariation],
    );

    return (
        <primitive
            object={clonedScene}
            position={position}
            rotation={[0, yRotation, 0]}
            scale={finalScale}
        />
    );
}

// ─── Decoration Group (multiple instances of one model) ──────────────────────

interface DecorationGroupProps {
    modelPath: string;
    count: number;
    scale: number;
    radiusMin?: number;
    radiusMax?: number;
    seed: number;
    animated?: boolean;
    scaleVariation?: number;
}

function DecorationGroup({
    modelPath, count, scale,
    radiusMin = 8, radiusMax = 35,
    seed, animated = false,
    scaleVariation = 0.3,
}: DecorationGroupProps) {
    const positions = useMemo(
        () => seededPositions(count, radiusMin, radiusMax, seed),
        [count, radiusMin, radiusMax, seed],
    );

    const Component = animated ? AnimatedDecoration : StaticDecoration;

    return (
        <>
            {positions.map((pos, i) => (
                <Component
                    key={i}
                    modelPath={modelPath}
                    position={pos}
                    scale={scale}
                    scaleVariation={scaleVariation}
                />
            ))}
        </>
    );
}

// ─── Seaweed with Shader Wave (vertex animation for static models) ───────────

interface SeaweedPatchProps {
    modelPath: string;
    count: number;
    scale: number;
    radiusMin?: number;
    radiusMax?: number;
    seed: number;
}

function SeaweedPatch({
    modelPath, count, scale,
    radiusMin = 6, radiusMax = 30,
    seed,
}: SeaweedPatchProps) {
    const { scene } = useGLTF(modelPath);
    const groupRef = useRef<THREE.Group>(null!);

    const instances = useMemo(() => {
        const positions = seededPositions(count, radiusMin, radiusMax, seed);
        return positions.map((pos, i) => {
            const s = skeletonClone(scene) as THREE.Group;
            s.traverse((node: THREE.Object3D) => {
                if ((node as THREE.Mesh).isMesh) {
                    const mesh = node as THREE.Mesh;
                    mesh.castShadow = false;
                    mesh.receiveShadow = true;
                }
            });
            const sc = scale * (0.7 + Math.random() * 0.6);
            const rot = Math.random() * Math.PI * 2;
            return { scene: s, pos, scale: sc, rotation: rot, phase: Math.random() * Math.PI * 2, idx: i };
        });
    }, [scene, count, radiusMin, radiusMax, seed, scale]);

    // Gentle wave animation via vertex sway (rotate the root slightly)
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const group = groupRef.current;
        if (!group) return;

        group.children.forEach((child, i) => {
            const inst = instances[i];
            if (!inst) return;
            // Gentle sway: rotate ±5° around Z based on time + phase
            const sway = Math.sin(t * 0.8 + inst.phase) * 0.09;
            child.rotation.z = sway;
        });
    });

    return (
        <group ref={groupRef}>
            {instances.map((inst) => (
                <primitive
                    key={inst.idx}
                    object={inst.scene}
                    position={inst.pos}
                    rotation={[0, inst.rotation, 0]}
                    scale={inst.scale}
                />
            ))}
        </group>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function atLeast(current: EvolutionStage, target: EvolutionStage): boolean {
    const order: EvolutionStage[] = ['AminoAcids', 'RNA', 'Protocell', 'Life'];
    return order.indexOf(current) >= order.indexOf(target);
}

export function OceanFlora({ isMobile = false }: { isMobile?: boolean }) {
    const stage = useGameStore((s) => s.stage);

    // On mobile, halve decoration counts
    const m = (n: number) => isMobile ? Math.max(1, Math.ceil(n * 0.5)) : n;

    return (
        <group>
            {/* ── AminoAcids: Estromatólitos — tapetes bacterianos primitivos ── */}
            {atLeast(stage, 'AminoAcids') && (
                <>
                    <SeaweedPatch
                        modelPath="/models/seaweed.glb"
                        count={m(8)}
                        scale={0.02}
                        radiusMin={5}
                        radiusMax={20}
                        seed={42}
                    />
                    <SeaweedPatch
                        modelPath="/models/seaweed_2.glb"
                        count={m(6)}
                        scale={0.02}
                        radiusMin={8}
                        radiusMax={18}
                        seed={137}
                    />
                </>
            )}

            {/* ── RNA: Algas simples começam a aparecer ──────────────────────── */}
            {atLeast(stage, 'RNA') && (
                <>
                    <SeaweedPatch
                        modelPath="/models/seaweed.glb"
                        count={m(15)}
                        scale={0.02}
                        radiusMin={5}
                        radiusMax={28}
                        seed={111}
                    />
                    <SeaweedPatch
                        modelPath="/models/seaweed_2.glb"
                        count={m(10)}
                        scale={0.02}
                        radiusMin={6}
                        radiusMax={25}
                        seed={222}
                    />
                    <SeaweedPatch
                        modelPath="/models/seaweed_asset.glb"
                        count={m(8)}
                        scale={0.02}
                        radiusMin={8}
                        radiusMax={30}
                        seed={333}
                    />
                </>
            )}

            {/* ── Protocell: Esponjas e primeiros corais ──────────────────────── */}
            {atLeast(stage, 'Protocell') && (
                <>
                    {/* Alga neon — bioluminescência primitiva */}
                    <DecorationGroup
                        modelPath="/models/neon_seaweed_1.glb"
                        count={m(4)}
                        scale={0.05}
                        radiusMin={10}
                        radiusMax={28}
                        seed={666}
                    />

                    {/* Primeiro coral (animado) */}
                    <DecorationGroup
                        modelPath="/models/coral_verzuring_gezond.glb"
                        count={1}
                        scale={0.025}
                        radiusMin={10}
                        radiusMax={18}
                        seed={777}
                        animated
                    />
                </>
            )}

            {/* ── Life: Ecossistema completo — recifes, kelp, diversidade ─── */}
            {stage === 'Life' && (
                <>
                    {/* Recifes de coral completos */}
                    <DecorationGroup
                        modelPath="/models/coral_plastic_gezond.glb"
                        count={1}
                        scale={0.02}
                        radiusMin={12}
                        radiusMax={22}
                        seed={888}
                        animated
                    />
                    <DecorationGroup
                        modelPath="/models/coral_vervuiling_gezond.glb"
                        count={1}
                        scale={0.02}
                        radiusMin={15}
                        radiusMax={25}
                        seed={999}
                        animated
                    />
                    <DecorationGroup
                        modelPath="/models/coral_visnet_gezond_fish.glb"
                        count={1}
                        scale={0.025}
                        radiusMin={18}
                        radiusMax={28}
                        seed={1010}
                        animated
                    />

                    {/* Kelp gigante animado */}
                    <DecorationGroup
                        modelPath="/models/kelp_with_animation.glb"
                        count={m(3)}
                        scale={0.08}
                        radiusMin={12}
                        radiusMax={30}
                        seed={1111}
                        animated
                    />

                    {/* Mais algas para densificar */}
                    <SeaweedPatch
                        modelPath="/models/seaweed.glb"
                        count={m(12)}
                        scale={0.025}
                        radiusMin={15}
                        radiusMax={35}
                        seed={1212}
                    />
                </>
            )}
        </group>
    );
}

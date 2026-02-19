/**
 * AnimatedFish.tsx — Multi-instance animated fish for R3F
 *
 * Correct animation pattern (mirrored from drei's useAnimations source):
 *  1. AnimationMixer is created with `undefined` root (avoids premature binding).
 *  2. After mount, `useLayoutEffect` sets mixer._root = clonedScene so that
 *     clipAction() can resolve skeleton paths against the CLONED bones.
 *  3. clipAction(clip, clonedScene) is called explicitly — the same way drei
 *     uses `mixerRef.current.clipAction(clip, ref.current)`.
 *  4. mixer.update(delta) runs every frame in useFrame.
 *
 * Movement uses YXZ Euler for stable "dorsal-up" orientation:
 *  - Yaw  (Y): horizontal facing from XZ projection — no axis flip.
 *  - Pitch (X): gentle vertical tilt ≤ 18°.
 *  - Roll  (Z): banking into turns driven by yaw delta.
 *
 * Animation speed scales with movement speed so fast fish look energetic.
 */

import { useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FishProps {
    modelPath: string;
    scale: number;
    speed: number;
    range: number;
    modelRotation: [number, number, number];
    initialPosition: THREE.Vector3;
}

export interface AnimatedFishSwarmProps {
    modelPath: string;
    count?: number;
    scale?: number;
    speed?: number;
    range?: number;
    modelRotation?: [number, number, number];
}

// Preferred swim-animation names across common GLB conventions
const SWIM_NAMES = ['Swim', 'swim', 'Swimming', 'swimming', 'Armature|swim',
    'Armature|Swim', 'idle', 'Idle', 'Action', 'Move'];

// ─── Single Fish ──────────────────────────────────────────────────────────────

function AnimatedFish({
    modelPath, scale, speed, range, modelRotation, initialPosition,
}: FishProps) {
    const groupRef = useRef<THREE.Group>(null!);
    const { scene, animations } = useGLTF(modelPath);

    // ── Clone with SkeletonUtils: independent skeleton per instance ──────────
    const clonedScene = useMemo(() => {
        const s = skeletonClone(scene) as THREE.Group;
        s.traverse((node: THREE.Object3D) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                const mat = (src as THREE.MeshStandardMaterial).clone();
                // Subtle bioluminescence so fish show up in dark water
                mat.emissive = mat.emissive?.clone() ?? new THREE.Color(0, 0, 0);
                mat.emissive.setHex(0x001a2e);
                mat.emissiveIntensity = 0.22;
                mesh.material = mat;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
            }
        });
        return s;
    }, [scene]);

    // ── AnimationMixer — created with undefined root (drei pattern) ──────────
    // Root is wired up after mount via useLayoutEffect, matching how drei's
    // useAnimations hook works internally.
    const [mixer] = useMemo(() => [new THREE.AnimationMixer(undefined as unknown as THREE.Object3D)], []);

    useLayoutEffect(() => {
        // Point mixer at the cloned scene so skeleton bindings resolve correctly.
        // Cast bypasses the `protected` visibility of _root (same technique used
        // inside drei's own JS source, which has no TS visibility constraints).
        (mixer as THREE.AnimationMixer & { _root: THREE.Object3D })._root = clonedScene;

        if (animations.length === 0) return;

        const clip = animations.find(a => SWIM_NAMES.some(n => a.name.includes(n)))
            ?? animations[0];

        // Bind action explicitly to clonedScene (matches drei's clipAction call)
        const action = mixer.clipAction(clip, clonedScene);
        action
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .setLoop(THREE.LoopRepeat, Infinity)
            .play();

        return () => {
            // Cleanup: stop and uncache so GC can reclaim bone bindings
            action.stop();
            mixer.uncacheAction(clip, clonedScene);
            mixer.uncacheRoot(clonedScene);
        };
    }, [mixer, clonedScene, animations]);

    // Stop mixer on unmount
    useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);

    // ── Steering state ────────────────────────────────────────────────────────
    const velocity = useRef(
        new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 2,
        ).normalize().multiplyScalar(speed),
    );
    const targetDir = useRef(velocity.current.clone().normalize());
    const wanderTimer = useRef(Math.random() * 4);   // stagger across swarm
    const bankAngle = useRef(0);
    const prevYaw = useRef(0);

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;

        // ── Advance skeletal animation ──────────────────────────────────────
        // Scale animation playback speed with movement, so fast fish look
        // energetic and slow fish look lazy (AAA technique).
        const curSpeed = velocity.current.length();
        mixer.timeScale = THREE.MathUtils.clamp(curSpeed / speed, 0.5, 2.0);
        mixer.update(delta);

        // ── Wander: random new direction every 2–5 s ─────────────────────────
        wanderTimer.current -= delta;
        if (wanderTimer.current <= 0) {
            wanderTimer.current = 2 + Math.random() * 3;
            targetDir.current
                .set(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 0.25,
                    (Math.random() - 0.5) * 2,
                )
                .normalize();
        }

        // ── Boundary: steer toward origin if beyond range ─────────────────────
        const dist = group.position.length();
        if (dist > range) {
            const strength = Math.min((dist - range) / range, 1);
            const homeDir = group.position.clone().negate().normalize();
            targetDir.current.lerp(homeDir, strength * 0.85).normalize();
        }

        // ── Smooth steer ──────────────────────────────────────────────────────
        const curDir = velocity.current.clone().normalize();
        curDir.lerp(targetDir.current, Math.min(delta * 1.8, 1)).normalize();
        velocity.current.copy(curDir).multiplyScalar(speed);

        // ── Move ──────────────────────────────────────────────────────────────
        group.position.addScaledVector(velocity.current, delta);

        // ── Orient — YXZ Euler, dorsal always pointing up ─────────────────────
        // Never use lookAt(): it can flip the "up" axis arbitrarily.
        // YXZ order: Yaw first (horizontal), then Pitch (vertical tilt),
        // then Roll (banking). This guarantees +Y is always "up".
        const movDir = velocity.current.clone().normalize();
        const flatDir = new THREE.Vector3(movDir.x, 0, movDir.z);

        if (flatDir.lengthSq() > 0.0001) {
            flatDir.normalize();

            // Yaw: angle around Y, from +Z toward +X (atan2(x,z) convention)
            const yaw = Math.atan2(flatDir.x, flatDir.z);

            // Pitch: gentle vertical tilt (max ~18°)
            const pitch = Math.asin(THREE.MathUtils.clamp(movDir.y, -1, 1)) * 0.32;

            // Banking: proportional to yaw turn rate, wrapped at ±π
            let dYaw = yaw - prevYaw.current;
            if (dYaw > Math.PI) dYaw -= Math.PI * 2;
            if (dYaw < -Math.PI) dYaw += Math.PI * 2;
            prevYaw.current = yaw;

            const targetBank = THREE.MathUtils.clamp(-dYaw / delta * 0.12, -0.45, 0.45);
            bankAngle.current = THREE.MathUtils.lerp(bankAngle.current, targetBank, delta * 3);

            group.rotation.set(pitch, yaw, bankAngle.current, 'YXZ');
        }
    });

    return (
        <group ref={groupRef} position={initialPosition}>
            {/* modelRotation corrects the GLB's built-in axis alignment */}
            <primitive object={clonedScene} scale={scale} rotation={modelRotation} />
        </group>
    );
}

// ─── Swarm ────────────────────────────────────────────────────────────────────

export function AnimatedFishSwarm({
    modelPath,
    count = 8,
    scale = 0.3,
    speed = 2,
    range = 25,
    modelRotation = [0, 0, 0],
}: AnimatedFishSwarmProps) {
    const positions = useMemo(
        () => Array.from({ length: count }, () =>
            new THREE.Vector3(
                (Math.random() - 0.5) * range * 1.4,
                (Math.random() - 0.5) * range * 0.25,
                (Math.random() - 0.5) * range * 1.4,
            ),
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [count, range],
    );

    return (
        <>
            {positions.map((pos, i) => (
                <AnimatedFish
                    key={i}
                    modelPath={modelPath}
                    scale={scale}
                    speed={speed * (0.85 + Math.random() * 0.3)}
                    range={range}
                    modelRotation={modelRotation}
                    initialPosition={pos}
                />
            ))}
        </>
    );
}

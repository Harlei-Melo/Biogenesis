/**
 * AnimatedFish.tsx — Multi-instance animated fish for R3F
 *
 * Architecture
 * ────────────
 *  • Each instance clones the GLB via SkeletonUtils.clone() so bone
 *    hierarchies are independent (required for multi-instance animation).
 *  • AnimationMixer follows drei's useAnimations pattern: created with
 *    undefined root, wired after mount via useLayoutEffect.
 *  • Orientation uses YXZ Euler (yaw → pitch → roll) to guarantee
 *    dorsal always points +Y (never flipped).
 *  • `yawOffset` (radians) corrects the model's native facing axis
 *    WITHOUT a second rotation on <primitive>, avoiding the stacking
 *    bug that caused the "dragged sideways" artefact.
 *
 * Movement
 * ────────
 *  • Gentle wander: new target direction is a SMALL random deviation
 *    from the current heading (±30°), not a fully random vector.
 *  • Smooth exponential steering (lerp rate ~1.2/s).
 *  • Boundary force ramps gradually when fish exceeds range.
 *  • Animation playback speed scales with movement speed.
 *  • Subtle vertical bobbing adds a "breathing" swim rhythm.
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
    yawOffset: number;        // radians to add to yaw so model nose faces forward
    initialPosition: THREE.Vector3;
}

export interface AnimatedFishSwarmProps {
    modelPath: string;
    count?: number;
    scale?: number;
    speed?: number;
    range?: number;
    /**
     * Radians to add to the computed yaw so the GLB model's nose
     * aligns with the swimming direction.
     *
     * Most fish GLBs are authored facing +X → use  -Math.PI / 2
     * Models facing -Z (Blender default)     → use  Math.PI
     * Models facing +Z                       → use  0
     */
    yawOffset?: number;
}

// Preferred swim-animation names across common GLB conventions
const SWIM_NAMES = [
    'Swim', 'swim', 'Swimming', 'swimming',
    'Armature|swim', 'Armature|Swim',
    'idle', 'Idle', 'Action', 'Move',
];

// ─── Single Animated Fish ─────────────────────────────────────────────────────

function AnimatedFish({
    modelPath, scale, speed, range, yawOffset, initialPosition,
}: FishProps) {
    const groupRef = useRef<THREE.Group>(null!);
    const { scene, animations } = useGLTF(modelPath);

    // ── Clone with SkeletonUtils: independent skeleton per instance ──────────
    const clonedScene = useMemo(() => {
        const s = skeletonClone(scene) as THREE.Group;
        s.traverse((node: THREE.Object3D) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                const src = Array.isArray(mesh.material)
                    ? mesh.material[0]
                    : mesh.material;
                const mat = (src as THREE.MeshStandardMaterial).clone();
                // Subtle bioluminescence — keeps fish visible in deep ocean
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

    // ── AnimationMixer — drei pattern (root set after mount) ─────────────────
    const [mixer] = useMemo(
        () => [new THREE.AnimationMixer(undefined as unknown as THREE.Object3D)],
        [],
    );

    useLayoutEffect(() => {
        (mixer as THREE.AnimationMixer & { _root: THREE.Object3D })._root = clonedScene;

        if (animations.length === 0) return;

        const clip =
            animations.find(a => SWIM_NAMES.some(n => a.name.includes(n)))
            ?? animations[0];

        const action = mixer.clipAction(clip, clonedScene);
        // Randomise start time so fish in a swarm aren't perfectly in sync
        action
            .reset()
            .setEffectiveTimeScale(1)
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

    // ── Steering state ────────────────────────────────────────────────────────
    const velocity = useRef(
        new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 0.15,
            (Math.random() - 0.5) * 2,
        ).normalize().multiplyScalar(speed),
    );
    const wanderTimer = useRef(Math.random() * 3);
    const smoothYaw = useRef(0);
    const smoothPitch = useRef(0);
    const smoothBank = useRef(0);
    const prevYaw = useRef(0);
    const time = useRef(Math.random() * 100); // for bobbing phase

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;
        time.current += delta;

        // ── Advance animation ─────────────────────────────────────────────
        const curSpeed = velocity.current.length();
        mixer.timeScale = THREE.MathUtils.clamp(curSpeed / speed, 0.5, 1.8);
        mixer.update(delta);

        // ── Gentle wander ─────────────────────────────────────────────────
        // Instead of a fully random target, we deviate from our current
        // heading by a SMALL angle (±30° horizontal, ±8° vertical).
        // This produces gentle, organic curves rather than sharp turns.
        wanderTimer.current -= delta;
        if (wanderTimer.current <= 0) {
            wanderTimer.current = 3 + Math.random() * 4;     // 3–7 s between turns

            const curDir = velocity.current.clone().normalize();
            const wanderAngle = (Math.random() - 0.5) * Math.PI * 0.33; // ±30°
            const pitchDeviation = (Math.random() - 0.5) * 0.15;        // ±8°

            // Rotate current direction around Y by wanderAngle
            const cosA = Math.cos(wanderAngle);
            const sinA = Math.sin(wanderAngle);
            curDir.set(
                curDir.x * cosA + curDir.z * sinA,
                curDir.y + pitchDeviation,
                -curDir.x * sinA + curDir.z * cosA,
            ).normalize();

            velocity.current.copy(curDir).multiplyScalar(speed);
        }

        // ── Boundary: smoothly steer home if beyond range ─────────────────
        const dist = group.position.length();
        if (dist > range * 0.8) {
            const t = THREE.MathUtils.smoothstep(dist, range * 0.8, range * 1.3);
            const homeDir = group.position.clone().negate().normalize();
            const curDir = velocity.current.clone().normalize();
            curDir.lerp(homeDir, t * 0.6).normalize();
            velocity.current.copy(curDir).multiplyScalar(speed);
        }

        // ── Move ──────────────────────────────────────────────────────────
        group.position.addScaledVector(velocity.current, delta);

        // Subtle vertical bobbing — makes the fish feel alive even
        // when swimming straight (sine wave ~0.3 Hz, amplitude ±0.08)
        group.position.y += Math.sin(time.current * 1.9) * 0.08 * delta;

        // ── Orient — YXZ Euler with yawOffset ────────────────────────────
        const movDir = velocity.current.clone().normalize();
        const flatLen = Math.sqrt(movDir.x * movDir.x + movDir.z * movDir.z);

        if (flatLen > 0.001) {
            // Raw yaw from velocity (atan2(x,z) → 0 = facing +Z)
            const rawYaw = Math.atan2(movDir.x, movDir.z);
            // Add the model's forward-axis correction
            const targetYaw = rawYaw + yawOffset;

            // Gentle pitch from vertical component (max ±15°)
            const targetPitch = -Math.asin(THREE.MathUtils.clamp(movDir.y, -1, 1)) * 0.26;

            // Banking from yaw change rate
            let dYaw = targetYaw - prevYaw.current;
            if (dYaw > Math.PI) dYaw -= Math.PI * 2;
            if (dYaw < -Math.PI) dYaw += Math.PI * 2;
            prevYaw.current = targetYaw;
            const targetBank = THREE.MathUtils.clamp(
                -dYaw / Math.max(delta, 0.001) * 0.08,
                -0.35, 0.35,
            );

            // Smooth interpolation for ALL axes — prevents jerky snapping
            const rotLerp = 1 - Math.exp(-4 * delta); // exponential ease
            smoothYaw.current += (targetYaw - smoothYaw.current) * rotLerp;
            smoothPitch.current += (targetPitch - smoothPitch.current) * rotLerp;
            smoothBank.current += (targetBank - smoothBank.current) * rotLerp;

            group.rotation.set(
                smoothPitch.current,
                smoothYaw.current,
                smoothBank.current,
                'YXZ',
            );
        }
    });

    return (
        <group ref={groupRef} position={initialPosition}>
            <primitive object={clonedScene} scale={scale} />
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
    yawOffset = 0,
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
                    speed={speed * (0.9 + Math.random() * 0.2)}
                    range={range}
                    yawOffset={yawOffset}
                    initialPosition={pos}
                />
            ))}
        </>
    );
}

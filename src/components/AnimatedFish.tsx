/**
 * AnimatedFish.tsx — Multi-instance animated fish for R3F
 *
 * Architecture
 * ────────────
 *  • Each instance clones the GLB via SkeletonUtils.clone() for
 *    independent bone hierarchies.
 *  • AnimationMixer uses drei's useAnimations pattern.
 *  • AUTO-DETECTS model forward axis from bounding box at load time:
 *    the longest BB axis is assumed to be head-to-tail (Z in all our
 *    current models). A correction quaternion is computed once and
 *    applied to the primitive's rotation so the model's nose aligns
 *    with local +Z.  The steering yaw (atan2(x,z)) then needs no
 *    manual offset — it Just Works™ for any model.
 *  • Orientation via YXZ Euler (yaw → pitch → roll), dorsal always up.
 *  • Gentle wander (±30° deviations), exponential smoothing on all
 *    rotation axes, smoothstep boundary, animation speed coupling.
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
    yawOverride?: number;
    initialPosition: THREE.Vector3;
}

export interface AnimatedFishSwarmProps {
    modelPath: string;
    count?: number;
    scale?: number;
    speed?: number;
    range?: number;
    /** Optional: override auto-detected yaw correction (radians). */
    yawOverride?: number;
}

// Swim / idle animation names found across common GLB conventions
const SWIM_NAMES = [
    'Swim', 'swim', 'Swimming', 'swimming',
    'Armature|swim', 'Armature|Swim',
    'idle', 'Idle', 'Action', 'Move',
];

// Helper: compute the Euler-Y rotation needed to align the model's
// longest horizontal axis with local +Z (our steering "forward").
function computeModelYawCorrection(root: THREE.Object3D): number {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Fish are elongated: longest axis = head-to-tail.
    // We only care about horizontal axes (X and Z); ignore Y (dorsal height).
    const horizontal = [
        { axis: 'x' as const, len: size.x, center: center.x },
        { axis: 'z' as const, len: size.z, center: center.z },
    ];
    horizontal.sort((a, b) => b.len - a.len);
    const longest = horizontal[0];

    // Determine which direction along that axis is "forward" (nose).
    // Convention: the nose is toward the NEGATIVE end of the center offset
    // (most Sketchfab fish have center slightly behind the nose).
    // If center is near zero, assume standard convention.

    if (longest.axis === 'z') {
        // Model already mostly Z-aligned.
        // If center.z < 0 → nose at -Z → need 180° rotation to face +Z.
        // If center.z ≥ 0 → nose at +Z → no rotation needed.
        // Heuristic: also check bounding box asymmetry
        if (center.z <= 0) return Math.PI;   // face -Z → rotate to +Z
        return 0;
    }
    // Model is X-aligned
    if (center.x <= 0) return Math.PI / 2;   // face -X → rotate to +Z
    return -Math.PI / 2;                      // face +X → rotate to +Z
}

// ─── Single Animated Fish ─────────────────────────────────────────────────────

function AnimatedFish({
    modelPath, scale, speed, range, yawOverride, initialPosition,
}: FishProps) {
    const groupRef = useRef<THREE.Group>(null!);
    const { scene, animations } = useGLTF(modelPath);

    // ── Clone + auto-detect forward correction ──────────────────────────────
    const { clonedScene, yawCorrection } = useMemo(() => {
        const s = skeletonClone(scene) as THREE.Group;
        const yaw = yawOverride !== undefined ? yawOverride : computeModelYawCorrection(s);

        s.traverse((node: THREE.Object3D) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                const src = Array.isArray(mesh.material)
                    ? mesh.material[0] : mesh.material;
                const mat = (src as THREE.MeshStandardMaterial).clone();
                mat.emissive = mat.emissive?.clone() ?? new THREE.Color(0, 0, 0);
                mat.emissive.setHex(0x001a2e);
                mat.emissiveIntensity = 0.22;
                mesh.material = mat;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
            }
        });
        return { clonedScene: s, yawCorrection: yaw };
    }, [scene]);

    // ── AnimationMixer — drei pattern ─────────────────────────────────────
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
        action
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .setLoop(THREE.LoopRepeat, Infinity);
        action.time = Math.random() * clip.duration;  // desync within swarm
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
    const smoothYaw = useRef<number | null>(null);  // initialised on first frame
    const smoothPitch = useRef(0);
    const smoothBank = useRef(0);
    const prevYaw = useRef<number | null>(null);
    const time = useRef(Math.random() * 100);

    useFrame((_, rawDelta) => {
        const group = groupRef.current;
        if (!group) return;

        // Clamp delta so very long frames don't fling fish across the map
        const delta = Math.min(rawDelta, 0.05);
        time.current += delta;

        // ── Advance animation ─────────────────────────────────────────────
        const curSpeed = velocity.current.length();
        mixer.timeScale = THREE.MathUtils.clamp(curSpeed / speed, 0.5, 1.8);
        mixer.update(delta);

        // ── Gentle wander ─────────────────────────────────────────────────
        wanderTimer.current -= delta;
        if (wanderTimer.current <= 0) {
            wanderTimer.current = 3 + Math.random() * 4;

            const curDir = velocity.current.clone().normalize();
            const angle = (Math.random() - 0.5) * Math.PI * 0.33;  // ±30°
            const vPitch = (Math.random() - 0.5) * 0.12;            // ±7°
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            curDir.set(
                curDir.x * cosA + curDir.z * sinA,
                curDir.y + vPitch,
                -curDir.x * sinA + curDir.z * cosA,
            ).normalize();
            velocity.current.copy(curDir).multiplyScalar(speed);
        }

        // ── Boundary ──────────────────────────────────────────────────────
        const dist = group.position.length();
        if (dist > range * 0.75) {
            const t = THREE.MathUtils.smoothstep(dist, range * 0.75, range * 1.2);
            const homeDir = group.position.clone().negate().normalize();
            const dir = velocity.current.clone().normalize();
            dir.lerp(homeDir, t * 0.5).normalize();
            velocity.current.copy(dir).multiplyScalar(speed);
        }

        // ── Move ──────────────────────────────────────────────────────────
        group.position.addScaledVector(velocity.current, delta);
        // Subtle idle bobbing
        group.position.y += Math.sin(time.current * 1.9) * 0.06 * delta;

        // ── Orientation — YXZ Euler ───────────────────────────────────────
        const movDir = velocity.current.clone().normalize();
        const fX = movDir.x;
        const fZ = movDir.z;
        const flatLen = Math.sqrt(fX * fX + fZ * fZ);

        if (flatLen > 0.001) {
            // Yaw: movement direction + model forward-axis correction
            const targetYaw = Math.atan2(fX, fZ) + yawCorrection;

            // Initialise on first frame (avoids spin-in from yaw=0)
            if (smoothYaw.current === null) {
                smoothYaw.current = targetYaw;
                prevYaw.current = targetYaw;
            }

            // Pitch: gentle vertical tilt (max ±15°)
            const targetPitch = -Math.asin(
                THREE.MathUtils.clamp(movDir.y, -1, 1),
            ) * 0.26;

            // Banking from angular velocity of yaw
            let dYaw = targetYaw - prevYaw.current!;
            if (dYaw > Math.PI) dYaw -= Math.PI * 2;
            if (dYaw < -Math.PI) dYaw += Math.PI * 2;
            prevYaw.current = targetYaw;

            const targetBank = THREE.MathUtils.clamp(
                -dYaw / Math.max(delta, 0.001) * 0.06, -0.3, 0.3,
            );

            // Exponential smooth on ALL axes — wrap-safe for yaw
            const rotLerp = 1 - Math.exp(-3.5 * delta);
            let yawDiff = targetYaw - smoothYaw.current;
            if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
            smoothYaw.current += yawDiff * rotLerp;
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
    yawOverride,
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
                    yawOverride={yawOverride}
                    initialPosition={pos}
                />
            ))}
        </>
    );
}

import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useGameStore } from "../store/gameStore";

function cloneWithMaterials(scene: THREE.Group): THREE.Group {
  const cloned = skeletonClone(scene) as THREE.Group;
  const origMats: THREE.Material[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      origMats.push((child as THREE.Mesh).material as THREE.Material);
    }
  });

  let idx = 0;
  cloned.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && idx < origMats.length) {
      (child as THREE.Mesh).material = origMats[idx];
      idx++;
    }
  });
  return cloned;
}

function DinoWalker({
  modelPath,
  animSearch,
  startX,
  startZ,
  speed,
  wanderRadius,
  dinoScale,
  active,
}: {
  modelPath: string;
  animSearch: string;
  startX: number;
  startZ: number;
  speed: number;
  wanderRadius: number;
  dinoScale: number;
  active: boolean;
}) {
  const gltf = useGLTF(modelPath);
  const scene = useMemo(() => cloneWithMaterials(gltf.scene), [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, scene);
  const ref = useRef<THREE.Group>(null!);

  const pos = useRef(new THREE.Vector3(startX, 0, startZ));
  const target = useRef(
    new THREE.Vector3(
      startX + (Math.random() - 0.5) * wanderRadius,
      0,
      startZ + (Math.random() - 0.5) * wanderRadius,
    ),
  );

  const currentScale = useRef(0.0001);

  useEffect(() => {
    if (!actions || names.length === 0) return;
    const findName =
      names.find((n) => n.toLowerCase().includes(animSearch)) ||
      names.find((n) => n.toLowerCase().includes("walk")) ||
      names[0];
    const action = actions[findName || names[0]];
    if (action) {
      action.reset().play();
      action.setEffectiveTimeScale(0.7 + Math.random() * 0.3);
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
  }, [actions, names, animSearch]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (active) {
      currentScale.current = THREE.MathUtils.lerp(
        currentScale.current,
        dinoScale,
        delta * 1.5,
      );
    }
    ref.current.scale.set(
      currentScale.current,
      currentScale.current,
      currentScale.current,
    );

    if (!active) return;

    const dir = new THREE.Vector3().subVectors(target.current, pos.current);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 2.0) {
      const angle = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * wanderRadius;
      target.current.set(
        startX + Math.cos(angle) * r,
        0,
        startZ + Math.sin(angle) * r,
      );
    }

    dir.normalize();
    pos.current.addScaledVector(dir, speed * delta);
    pos.current.y = 0;
    ref.current.position.copy(pos.current);

    const targetRot = Math.atan2(dir.x, dir.z);
    let diff = targetRot - ref.current.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    ref.current.rotation.y += diff * delta * 1.5;
  });

  return <primitive object={scene} ref={ref} />;
}

export function LandFauna() {
  const stage = useGameStore((state) => state.stage);
  const progress = useGameStore((state) => state.progress);
  const isAlive = stage === "Pangea";

  const evoT = useMemo(() => {
    if (stage === "Pangea") return progress / 100;
    if (stage === "Extinction") return 1.0;
    return 0;
  }, [stage, progress]);

  // Pteranodonte fica no céu desde o começo
  const gltfPtero = useGLTF("/models/pteranodon_reuploaded_and_retextured.glb");
  const pteroScene = useMemo(
    () => cloneWithMaterials(gltfPtero.scene),
    [gltfPtero.scene],
  );
  const { actions: pteroActions, names: pteroNames } = useAnimations(
    gltfPtero.animations,
    pteroScene,
  );
  const pteroRef = useRef<THREE.Group>(null!);
  const pteroAngle = useRef(0);
  const pteroClone = useMemo(
    () => cloneWithMaterials(gltfPtero.scene),
    [gltfPtero.scene],
  );
  const pteroClone2 = useMemo(
    () => cloneWithMaterials(gltfPtero.scene),
    [gltfPtero.scene],
  );

  useEffect(() => {
    if (!pteroActions || pteroNames.length === 0) return;
    const action = pteroActions[pteroNames[0]];
    if (action) {
      action.reset().play();
      action.setEffectiveTimeScale(1.5);
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
  }, [pteroActions, pteroNames]);

  useFrame((_, delta) => {
    if (!pteroRef.current) return;
    if (isAlive) {
      pteroAngle.current += delta * 0.25;
      const radius = 25;
      pteroRef.current.position.set(
        Math.cos(pteroAngle.current) * radius,
        25,
        Math.sin(pteroAngle.current) * radius,
      );
      pteroRef.current.rotation.y = -pteroAngle.current + Math.PI;
      pteroRef.current.rotation.z = Math.PI / 10;
    } else {
      pteroRef.current.position.y += delta * 15;
    }
  });

  // Gatilho exato da resposta
  const showDinos = evoT >= 0.7;

  return (
    <group>
      {/* 🦅 Pteranodontes - Escalas corrigidas para ~6m de envergadura (0.008) */}
      <primitive object={pteroScene} ref={pteroRef} scale={0.008} />
      <primitive
        object={pteroClone}
        position={[15, 28, -25]}
        scale={0.007}
        rotation={[0, 1.2, 0.2]}
      />
      <primitive
        object={pteroClone2}
        position={[-15, 30, 15]}
        scale={0.009}
        rotation={[0, -0.5, -0.1]}
      />

      {/* 🦕 ESTEGOSSAUROS - Escalas corrigidas para ~3m (0.55) */}
      {showDinos && (
        <>
          <DinoWalker
            modelPath="/models/dino_hunter_deadly_shores_stegosaurus.glb"
            animSearch="walk"
            startX={3}
            startZ={5}
            speed={1.0}
            wanderRadius={5}
            dinoScale={0.55}
            active={isAlive}
          />
          <DinoWalker
            modelPath="/models/dino_hunter_deadly_shores_stegosaurus.glb"
            animSearch="walk"
            startX={-4}
            startZ={2}
            speed={1.1}
            wanderRadius={5}
            dinoScale={0.5}
            active={isAlive}
          />
          <DinoWalker
            modelPath="/models/dino_hunter_deadly_shores_stegosaurus.glb"
            animSearch="walk"
            startX={0}
            startZ={7}
            speed={1.4}
            wanderRadius={6}
            dinoScale={0.35}
            active={isAlive}
          />
        </>
      )}

      {/* 🦕 PALUXYSAURUS - Escalas corrigidas para Colossais ~13m (0.015) */}
      {showDinos && (
        <>
          <DinoWalker
            modelPath="/models/paluxysaurus.glb"
            animSearch="take"
            startX={-8}
            startZ={-5}
            speed={0.8}
            wanderRadius={8}
            dinoScale={0.015}
            active={isAlive}
          />
          <DinoWalker
            modelPath="/models/paluxysaurus.glb"
            animSearch="take"
            startX={6}
            startZ={-6}
            speed={0.7}
            wanderRadius={8}
            dinoScale={0.012}
            active={isAlive}
          />
        </>
      )}

      {/* 🦖 T-REX - Escalas corrigidas para ~4.5m (0.009) */}
      {showDinos && (
        <>
          <DinoWalker
            modelPath="/models/t-rex.glb"
            animSearch="walk slow"
            startX={-2}
            startZ={-8}
            speed={1.5}
            wanderRadius={12}
            dinoScale={0.009}
            active={isAlive}
          />
          <DinoWalker
            modelPath="/models/t-rex.glb"
            animSearch="walk slow"
            startX={8}
            startZ={3}
            speed={1.3}
            wanderRadius={15}
            dinoScale={0.008}
            active={isAlive}
          />
        </>
      )}
    </group>
  );
}

useGLTF.preload("/models/pteranodon_reuploaded_and_retextured.glb");
useGLTF.preload("/models/dino_hunter_deadly_shores_stegosaurus.glb");
useGLTF.preload("/models/paluxysaurus.glb");
useGLTF.preload("/models/t-rex.glb");

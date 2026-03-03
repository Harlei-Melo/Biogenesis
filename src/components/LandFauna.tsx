import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame, useGraph } from "@react-three/fiber";
import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useGameStore } from "../store/gameStore";

function TRexWalker({
  startX,
  startZ,
  speed,
  wanderRadius,
  dinoScale,
  active,
}: {
  startX: number;
  startZ: number;
  speed: number;
  wanderRadius: number;
  dinoScale: number;
  active: boolean;
}) {
  const { scene, materials, animations } = useGLTF("/models/t-rex.glb");
  const clonedScene = useMemo(() => skeletonClone(scene), [scene]);
  const { nodes } = useGraph(clonedScene) as any;

  const group = useRef<THREE.Group>(null!);
  const { actions, names } = useAnimations(animations, group);

  const pos = useRef(new THREE.Vector3(startX, 0, startZ));
  const target = useRef(new THREE.Vector3(startX, 0, startZ));

  const currentScale = useRef(0.0001);

  useEffect(() => {
    if (!actions || names.length === 0) return;

    const walkAnimName =
      names.find((n) => n.toLowerCase().includes("walk")) || names[0];
    const action = actions[walkAnimName];

    if (action) {
      action.reset().play();
      action.setEffectiveTimeScale(0.8 + Math.random() * 0.4);
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
  }, [actions, names]);

  useFrame((_, delta) => {
    if (!group.current) return;

    if (active) {
      currentScale.current = THREE.MathUtils.lerp(
        currentScale.current,
        dinoScale,
        delta * 1.5,
      );
    }
    group.current.scale.setScalar(currentScale.current);

    if (!active) return;

    const dirToTarget = new THREE.Vector3().subVectors(
      target.current,
      pos.current,
    );
    dirToTarget.y = 0;
    const dist = dirToTarget.length();

    // IA: Cone Frontal e Safe Zone
    if (dist < 3.0) {
      let valid = false;
      let newX = 0,
        newZ = 0;

      for (let i = 0; i < 5; i++) {
        const angle =
          group.current.rotation.y + (Math.random() - 0.5) * Math.PI;
        const r = 5 + Math.random() * wanderRadius;

        newX = pos.current.x + Math.sin(angle) * r;
        newZ = pos.current.z + Math.cos(angle) * r;

        const distToCenter = Math.sqrt(newX * newX + newZ * newZ);
        if (distToCenter > 18.0) {
          valid = true;
          break;
        }
      }

      if (!valid) {
        const angleOut = Math.atan2(pos.current.z, pos.current.x);
        newX = Math.cos(angleOut) * 25.0;
        newZ = Math.sin(angleOut) * 25.0;
      }

      target.current.set(newX, 0, newZ);
    }

    // Inércia de rotação
    const targetRot = Math.atan2(dirToTarget.x, dirToTarget.z);
    let diff = targetRot - group.current.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    group.current.rotation.y += diff * delta * 0.6;

    // Movimentação Frontal
    const currentHeading = group.current.rotation.y;
    const forwardX = Math.sin(currentHeading);
    const forwardZ = Math.cos(currentHeading);

    pos.current.x += forwardX * speed * delta;
    pos.current.z += forwardZ * speed * delta;

    group.current.position.copy(pos.current);
  });

  return (
    <group ref={group} dispose={null}>
      <group name="Sketchfab_Scene">
        <group name="Sketchfab_model" rotation={[-Math.PI / 2, 0, 0]}>
          <group
            name="b812db92ca674797ac39fc7055901c91fbx"
            rotation={[Math.PI / 2, 0, 0]}
            scale={0.01}
          >
            <group name="Object_2">
              <group name="RootNode">
                <group name="Object_4">
                  <primitive object={nodes._rootJoint} />
                  <skinnedMesh
                    name="Object_6"
                    geometry={nodes.Object_6.geometry}
                    material={materials.All0Mat00}
                    skeleton={nodes.Object_6.skeleton}
                    castShadow
                    receiveShadow
                  />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
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

  const showDinos = evoT >= 0.7;

  return (
    <group>
      {showDinos && (
        <>
          <TRexWalker
            startX={-25}
            startZ={-25}
            speed={2.5}
            wanderRadius={15}
            dinoScale={1.5}
            active={isAlive}
          />
          <TRexWalker
            startX={30}
            startZ={10}
            speed={2.0}
            wanderRadius={18}
            dinoScale={1.2}
            active={isAlive}
          />
          <TRexWalker
            startX={-15}
            startZ={30}
            speed={2.2}
            wanderRadius={14}
            dinoScale={1.4}
            active={isAlive}
          />
        </>
      )}
    </group>
  );
}

useGLTF.preload("/models/t-rex.glb");

// src/components/LandFlora.tsx
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../store/gameStore";

export function LandFlora() {
  const stage = useGameStore((state) => state.stage);
  const progress = useGameStore((state) => state.progress);

  const evoT = useMemo(() => {
    if (stage === "Pangea") return progress / 100;
    if (stage === "Extinction") return 1.0;
    return 0;
  }, [stage, progress]);

  const plantGrowthRef = useRef(0);

  const gltfFern = useGLTF("/models/fern_grass_02.glb");
  const gltfSpruce = useGLTF("/models/spruce.glb");

  const FERN_COUNT = 150;
  const TREE_COUNT = 20;
  const VINE_COUNT = 30;

  const fernRef = useRef<THREE.InstancedMesh>(null!);
  const treeRef = useRef<THREE.InstancedMesh>(null!);
  const vineRef = useRef<THREE.InstancedMesh>(null!);

  function extractFirst(scene: THREE.Group) {
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.Material | null = null;
    scene.traverse((child) => {
      if (!geo && (child as THREE.Mesh).isMesh) {
        geo = (child as THREE.Mesh).geometry;
        mat = (child as THREE.Mesh).material as THREE.Material;
      }
    });
    return { geo, mat };
  }

  const fern = extractFirst(gltfFern.scene);
  const tree = extractFirst(gltfSpruce.scene);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const generateMatrices = (
    count: number,
    radiusMin: number,
    radiusMax: number,
    scaleBase: number,
    scaleVar: number,
    avoidCamera: boolean,
  ) => {
    const mats = [];
    for (let i = 0; i < count; i++) {
      let r = radiusMin + Math.random() * (radiusMax - radiusMin);
      if (avoidCamera && r > 10 && r < 14)
        r =
          Math.random() > 0.5 ? 15 + Math.random() * 10 : 4 + Math.random() * 5;
      const th = Math.random() * Math.PI * 2;
      dummy.position.set(Math.cos(th) * r, 0, Math.sin(th) * r);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      mats.push({
        mat: dummy.matrix.clone(),
        scale: scaleBase + Math.random() * scaleVar,
        pos: dummy.position.clone(),
      });
    }
    return mats;
  };

  const fernData = useMemo(
    () => generateMatrices(FERN_COUNT, 3, 40, 0.015, 0.01, false),
    [],
  );
  const treeData = useMemo(
    () => generateMatrices(TREE_COUNT, 6, 50, 0.014, 0.008, true),
    [],
  );
  const vineData = useMemo(
    () => generateMatrices(VINE_COUNT, 4, 35, 1.5, 1.0, true),
    [],
  );

  const vineGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.05, 0.2, 4, 5, 8);
    geo.translate(0, 2, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const twist = Math.sin(y * 2.0) * 0.3;
      pos.setX(i, pos.getX(i) + twist);
      pos.setZ(i, pos.getZ(i) + Math.cos(y * 2.0) * 0.3);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((_, delta) => {
    const targetGrowth = evoT >= 0.3 ? 1.0 : 0.0;
    plantGrowthRef.current = THREE.MathUtils.lerp(
      plantGrowthRef.current,
      targetGrowth,
      delta * 1.5,
    );
    const growthT = plantGrowthRef.current;
    const hasWater = growthT > 0.01;

    const updateInstanced = (ref: any, data: any[]) => {
      if (ref.current) {
        ref.current.visible = hasWater;
        if (hasWater) {
          for (let i = 0; i < data.length; i++) {
            dummy.position.copy(data[i].pos);
            const delay = Math.min(1, data[i].pos.length() / 40);
            const localGrowth = Math.max(
              0,
              Math.min(1, (growthT - delay * 0.5) * 2.0),
            );
            const bounce = Math.sin(localGrowth * Math.PI) * 0.15;
            const currentScale = Math.max(0.001, localGrowth + bounce);
            dummy.scale.setScalar(data[i].scale * currentScale);
            dummy.updateMatrix();
            ref.current.setMatrixAt(i, dummy.matrix);
          }
          ref.current.instanceMatrix.needsUpdate = true;
        }
      }
    };

    updateInstanced(fernRef, fernData);
    updateInstanced(treeRef, treeData);
    updateInstanced(vineRef, vineData);
  });

  return (
    <group>
      {fern.geo && fern.mat && (
        <instancedMesh
          ref={fernRef}
          args={[fern.geo, fern.mat, FERN_COUNT]}
          receiveShadow
        />
      )}
      {tree.geo && tree.mat && (
        <instancedMesh
          ref={treeRef}
          args={[tree.geo, tree.mat, TREE_COUNT]}
          castShadow
          receiveShadow
        />
      )}
      <instancedMesh
        ref={vineRef}
        args={[vineGeo, undefined, VINE_COUNT]}
        castShadow
      >
        <meshStandardMaterial
          color="#2a3b1a"
          emissive="#11220a"
          emissiveIntensity={0.5}
          roughness={0.8}
          metalness={0.1}
        />
      </instancedMesh>
    </group>
  );
}

useGLTF.preload("/models/fern_grass_02.glb");
useGLTF.preload("/models/spruce.glb");

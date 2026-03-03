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
  const PROTO_COUNT = 8;
  const LEPI_COUNT = 8;

  const fernRef = useRef<THREE.InstancedMesh>(null!);
  const treeRef = useRef<THREE.InstancedMesh>(null!);
  const protoRef = useRef<THREE.InstancedMesh>(null!);
  const lepiTrunkRef = useRef<THREE.InstancedMesh>(null!);
  const lepiCrownRef = useRef<THREE.InstancedMesh>(null!);

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
      if (avoidCamera && r > 10 && r < 14) {
        r =
          Math.random() > 0.5 ? 15 + Math.random() * 10 : 4 + Math.random() * 5;
      }
      const th = Math.random() * Math.PI * 2;
      mats.push({
        scale: scaleBase + Math.random() * scaleVar,
        pos: new THREE.Vector3(Math.cos(th) * r, 0, Math.sin(th) * r),
        rotY: Math.random() * Math.PI * 2,
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
  const protoData = useMemo(
    () => generateMatrices(PROTO_COUNT, 8, 45, 1.2, 0.6, true),
    [],
  );
  const lepiData = useMemo(
    () => generateMatrices(LEPI_COUNT, 10, 48, 1.0, 0.5, true),
    [],
  );

  const protoGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.15, 0.8, 12, 8, 16);
    geo.translate(0, 6, 0);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      let x = pos.getX(i);
      let z = pos.getZ(i);
      x += Math.sin(y * 0.3) * 0.8;
      z += Math.cos(y * 0.2) * 0.5;
      const angle = Math.atan2(z, x);
      const ridge = Math.sin(angle * 6) * 0.08 * (1.0 - y / 12);
      x += Math.cos(angle) * ridge;
      z += Math.sin(angle) * ridge;
      pos.setX(i, x);
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // ==========================================
  // 🌴 GEOMETRIA PROCEDURAL AVANÇADA: LEPIDODENDRON (CORRIGIDO)
  // ==========================================
  const lepiGeos = useMemo(() => {
    // 1. TRONCO (Longo e levemente torto - Inalterado)
    const trunk = new THREE.CylinderGeometry(0.1, 0.5, 14, 6, 12);
    trunk.translate(0, 7, 0);
    const trunkPos = trunk.attributes.position;
    for (let i = 0; i < trunkPos.count; i++) {
      const y = trunkPos.getY(i);
      trunkPos.setX(i, trunkPos.getX(i) + Math.sin(y * 1.5) * 0.1);
      trunkPos.setZ(i, trunkPos.getZ(i) + Math.cos(y * 1.2) * 0.1);
    }
    trunk.computeVertexNormals();

    // 2. COROA DE FOLHAS ALTAMENTE POLIGONAL E ESCULPIDA (Fim dos quadrados!)
    // Criamos uma "fita" longa com 20 segmentos verticais para dobrar macio.
    const leafBase = new THREE.PlaneGeometry(1, 10, 2, 20);
    leafBase.translate(0, 5, 0); // Pivô na base para rotação correta
    const leafPos = leafBase.attributes.position;

    for (let i = 0; i < leafPos.count; i++) {
      const y = leafPos.getY(i); // Vai de 0 a 10
      let x = leafPos.getX(i); // Vai de -0.5 a 0.5
      let z = leafPos.getZ(i); // É 0

      // Fator de altura normalizado (0.0 na base, 1.0 na ponta)
      const tY = y / 10.0;

      // AFUNILAMENTO (Taper): A folha afunila graciosamente na ponta
      const taper = 1.0 - pow(tY, 3.0);
      x *= taper;

      // ESCULTURA EM "V": Cria um vinco no meio da folha para realismo orgânico
      z += abs(x) * 0.6 * (1.0 - pow(tY, 2.0));

      // FÍSICA DE DOBRA (Samambaia): A folha despenca para fora do tronco
      // Usamos pow(tY, 1.8) para que a base fique firme e a ponta desabe
      const droopAmt = pow(tY, 1.8) * 4.5;
      // Empurramos o Z local pra "trás" (conforme a folha cresce)
      z -= droopAmt;
      // Compensamos o Y para manter o comprimento da folha (Arco Físico)
      leafPos.setY(i, y - droopAmt * 0.2);

      leafPos.setX(i, x);
      leafPos.setZ(i, z);
    }
    leafBase.computeVertexNormals();

    // DENSIDADE DA COPA: De 6 retângulos para 20 folhas bem desenhadas
    const LEAF_COUNT = 20;
    const crown = new THREE.BufferGeometry();
    const posArr: number[] = [];
    const uvArr: number[] = [];
    const normArr: number[] = [];

    for (let i = 0; i < LEAF_COUNT; i++) {
      const clone = leafBase.clone();

      // Cada folha é levemente inclinada para cima na base e espalhada em círculo
      clone.rotateX(Math.PI / 6); // Inclinação base
      clone.rotateY(((Math.PI * 2) / LEAF_COUNT) * i); // Espalhamento circular

      posArr.push(...(clone.attributes.position.array as any));
      uvArr.push(...(clone.attributes.uv.array as any));
      normArr.push(...(clone.attributes.normal.array as any));
    }
    crown.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
    crown.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
    crown.setAttribute("normal", new THREE.Float32BufferAttribute(normArr, 3));

    // Posiciona a copa densa e bem desenhada no topo do tronco (Y = 13.5)
    crown.translate(0, 13.5, 0);

    return { trunk, crown };
  }, []);

  // Helper matemático de potência para GLSL-style
  function pow(a: number, b: number) {
    return Math.pow(a, b);
  }
  // Helper matemático de absoluto
  function abs(a: number) {
    return Math.abs(a);
  }

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const targetGrowth = evoT >= 0.3 ? 1.0 : 0.0;

    plantGrowthRef.current = THREE.MathUtils.lerp(
      plantGrowthRef.current,
      targetGrowth,
      delta * 1.5,
    );
    const growthT = plantGrowthRef.current;
    const hasWater = growthT > 0.01;

    const updateInstanced = (
      ref: any,
      data: any[],
      swaySpeed: number,
      swayAmount: number,
    ) => {
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
            const windX = Math.sin(time * swaySpeed + i) * swayAmount;
            const windZ = Math.cos(time * (swaySpeed * 0.8) + i) * swayAmount;
            dummy.rotation.set(windX, data[i].rotY, windZ);
            dummy.updateMatrix();
            ref.current.setMatrixAt(i, dummy.matrix);
          }
          ref.current.instanceMatrix.needsUpdate = true;
        }
      }
    };

    updateInstanced(fernRef, fernData, 2.0, 0.1);
    updateInstanced(treeRef, treeData, 1.0, 0.03);
    updateInstanced(protoRef, protoData, 0.5, 0.02);
    updateInstanced(lepiTrunkRef, lepiData, 0.8, 0.04);
    updateInstanced(lepiCrownRef, lepiData, 0.8, 0.04);
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
        ref={protoRef}
        args={[protoGeo, undefined, PROTO_COUNT]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#382e25" roughness={0.9} metalness={0.0} />
      </instancedMesh>

      <instancedMesh
        ref={lepiTrunkRef}
        args={[lepiGeos.trunk, undefined, LEPI_COUNT]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2e3828" roughness={1.0} />
      </instancedMesh>

      <instancedMesh
        ref={lepiCrownRef}
        args={[lepiGeos.crown, undefined, LEPI_COUNT]}
        castShadow
      >
        <meshStandardMaterial
          color="#2a5a15" // Verde folha
          roughness={0.6} // Brilho suave nas folhas subdivididas
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}

useGLTF.preload("/models/fern_grass_02.glb");
useGLTF.preload("/models/spruce.glb");

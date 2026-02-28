import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../store/gameStore";

const INSTANCE_COUNT = 100000;
const FIELD_SIZE = 150;

export function ProceduralGrass() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const stage = useGameStore((s) => s.stage);
  const progress = useGameStore((s) => s.progress);

  const grassGeo = useMemo(() => {
    const baseGeo = new THREE.PlaneGeometry(0.08, 0.85, 1, 5).toNonIndexed();
    baseGeo.translate(0, 0.425, 0);

    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];

    for (let i = 0; i < 3; i++) {
      const clone = baseGeo.clone();
      clone.rotateY((Math.PI / 3) * i);
      pos.push(...Array.from(clone.attributes.position.array));
      uvs.push(...Array.from(clone.attributes.uv.array));

      for (let j = 0; j < clone.attributes.normal.count; j++) {
        normals.push(0, 1, 0);
      }
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));

    return geo;
  }, []);

  const matrices = useMemo(() => {
    const matArray = new Float32Array(INSTANCE_COUNT * 16);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const r = Math.sqrt(Math.random()) * (FIELD_SIZE / 2);
      const th = Math.random() * Math.PI * 2;
      const x = Math.cos(th) * r;
      const z = Math.sin(th) * r;

      const noise = Math.sin(x * 0.1) * Math.cos(z * 0.1);
      const clumping = THREE.MathUtils.smoothstep(noise, -0.5, 1.0) * 0.7 + 0.3;

      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.setScalar((0.5 + Math.random() * 0.8) * clumping);

      dummy.updateMatrix();
      dummy.matrix.toArray(matArray, i * 16);
    }
    return matArray;
  }, []);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    mat.onBeforeCompile = (shader: any) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uProgress = { value: 0 };

      shader.vertexShader = `
        uniform float uTime;
        uniform float uProgress;
        varying float vHeight;
        varying vec3 vWorldPos;
        ${shader.vertexShader}
      `.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
        vHeight = uv.y;
        vWorldPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float instRandom = fract(sin(dot(vWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
        
        // 1. ESCALA UNIFORME (O Fim do Esmagamento)
        // Usamos o MESMO valor para X, Y e Z. Assim, a fase seca é apenas uma miniatura perfeita da Fase 2.
        float bladeScale = mix(0.4, 1.0, uProgress); 

        // 2. AFUNILAMENTO (Taper)
        float taper = 1.0 - pow(vHeight, 3.0);
        
        // Aplica escalas de base
        transformed.x *= taper * bladeScale;
        transformed.z *= taper * bladeScale;
        transformed.y *= bladeScale;

        // 3. FÍSICA DE VENTO PENDULAR (Mantida 100% igual à Fase 2)
        float windTime = uTime * 1.5; 
        float wave = sin(windTime + (vWorldPos.x + vWorldPos.z) * 0.15 + instRandom);
        float sway = wave * 0.4;
        float bendFactor = vHeight * vHeight * vHeight;
        
        vec2 windDir = normalize(vec2(1.0, 0.5));
        transformed.x += windDir.x * sway * bendFactor * bladeScale; 
        transformed.z += windDir.y * sway * bendFactor * bladeScale;
        transformed.y -= abs(sway) * bendFactor * 0.3 * bladeScale;
        
        // 4. QUEDA NATURAL CORRIGIDA (Fase Seca)
        // Diminuímos a força que puxava ela para o chão para manter o aspecto de grama de pé
        vec2 droopDir = normalize(vec2(instRandom - 0.5, fract(instRandom * 10.0) - 0.5));
        
        // Só tomba levemente para o lado (0.15 em vez de 0.3)
        float droopAmount = (1.0 - uProgress) * 0.15 * bendFactor * bladeScale;
        
        transformed.x += droopDir.x * droopAmount;
        transformed.z += droopDir.y * droopAmount;
        
        // Reduz a penalidade de altura para não "amassar" contra o solo
        transformed.y -= droopAmount * 0.1;
        `,
      );

      shader.fragmentShader = `
        uniform float uProgress;
        varying float vHeight;
        varying vec3 vWorldPos;
        ${shader.fragmentShader}
      `.replace(
        `#include <map_fragment>`,
        `#include <map_fragment>
        
        float macroNoise = sin(vWorldPos.x * 0.05) * cos(vWorldPos.z * 0.05);
        
        // Cores Secas
        vec3 dryTip = vec3(0.65, 0.55, 0.3); 
        vec3 dryRoot = vec3(0.35, 0.25, 0.15); 

        // Cores Férteis
        vec3 lushTip = mix(vec3(1.0, 0.4, 0.4), vec3(0.9, 0.5, 0.6), smoothstep(-1.0, 1.0, macroNoise));
        vec3 lushRoot = vec3(0.05, 0.05, 0.3); 

        vec3 tipColor = mix(dryTip, lushTip, smoothstep(0.2, 0.8, uProgress));
        vec3 rootColor = mix(dryRoot, lushRoot, smoothstep(0.2, 0.8, uProgress));

        vec3 finalColor = mix(rootColor, tipColor, pow(vHeight, 0.8));

        float translucency = pow(vHeight, 2.0) * 0.3;
        finalColor += tipColor * translucency;

        diffuseColor.rgb = finalColor;
        `,
      );
      mat.userData.shader = shader;
    };

    mat.customProgramCacheKey = () => "grass_natural_wind_v5";
    return mat;
  }, []);

  useFrame((state) => {
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = state.clock.elapsedTime;
      const evo =
        stage === "Pangea" ? progress / 100 : stage === "Extinction" ? 1.0 : 0;
      const targetGrowth = evo >= 0.25 ? 1.0 : 0.0;

      material.userData.shader.uniforms.uProgress.value = THREE.MathUtils.lerp(
        material.userData.shader.uniforms.uProgress.value,
        targetGrowth,
        0.02,
      );
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[grassGeo, material, INSTANCE_COUNT]}
      receiveShadow
      frustumCulled={false}
    >
      <instancedBufferAttribute
        attach="instanceMatrix"
        args={[matrices, 16]}
        count={INSTANCE_COUNT}
        array={matrices}
        itemSize={16}
      />
    </instancedMesh>
  );
}

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../store/gameStore";

const BLADE_COUNT = 70000; // Otimizado para o novo tamanho
const FIELD_SIZE = 120;

export function GrassField() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const stage = useGameStore((s) => s.stage);
  const progress = useGameStore((s) => s.progress);

  // 1. GEOMETRIA EM ESTRELA (AGORA MAIOR E MAIS VISÍVEL)
  const bladeGeometry = useMemo(() => {
    // Aumentamos a largura para 0.15 e altura para 1.8 (antes era 0.04 e 0.45)
    const baseGeo = new THREE.PlaneGeometry(0.15, 1.8, 1, 5);
    baseGeo.translate(0, 0.9, 0); // Sobe metade da altura para a base ficar no chão

    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
    const uvs: number[] = [];

    // Cruza 3 planos para formar o tufo
    for (let i = 0; i < 3; i++) {
      const clone = baseGeo.clone();
      clone.rotateY((Math.PI / 3) * i);
      pos.push(...(clone.attributes.position.array as any));
      uvs.push(...(clone.attributes.uv.array as any));
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    return geo;
  }, []);

  // 2. DISTRIBUIÇÃO COM TUFOS (Clumping)
  const attributeData = useMemo(() => {
    const dummy = new THREE.Object3D();
    const matrices = new Float32Array(BLADE_COUNT * 16);

    for (let i = 0; i < BLADE_COUNT; i++) {
      const r = Math.sqrt(Math.random()) * FIELD_SIZE;
      const th = Math.random() * Math.PI * 2;
      const x = Math.cos(th) * r;
      const z = Math.sin(th) * r;

      // Cria zonas com grama alta e zonas mais ralas
      const noise = Math.sin(x * 0.15) * Math.cos(z * 0.15);
      const clumping = THREE.MathUtils.smoothstep(noise, -0.5, 1.0) * 0.6 + 0.4;

      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.setScalar((0.5 + Math.random() * 0.8) * clumping);
      dummy.updateMatrix();
      dummy.matrix.toArray(matrices, i * 16);
    }
    return matrices;
  }, []);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#1a330a",
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    mat.onBeforeCompile = (shader: any) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uProgress = { value: 0 };

      shader.vertexShader = `
                uniform float uTime;
                uniform float uProgress;
                varying float vHeight;
                ${shader.vertexShader}
            `.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
                vHeight = uv.y;
                
                // AFUNILAMENTO (Ponta fina, base larga)
                float taper = 1.0 - pow(vHeight, 1.5);
                transformed.x *= taper;
                transformed.z *= taper;

                // VENTO MAIS FORTE
                float wave = sin(uTime * 1.5 + instanceMatrix[3][0] * 0.2 + instanceMatrix[3][2] * 0.2) * 0.3;
                transformed.x += wave * vHeight * vHeight;
                
                // CRESCIMENTO
                transformed.y *= uProgress;
                `,
      );

      shader.fragmentShader = `
                varying float vHeight;
                ${shader.fragmentShader}
            `.replace(
        `#include <color_fragment>`,
        `#include <color_fragment>
                // GRADIENTE VIVO LUSION
                vec3 rootColor = vec3(0.02, 0.05, 0.01); // Escuro na raiz
                vec3 tipColor = vec3(0.3, 0.65, 0.15);   // Verde vibrante na ponta
                
                vec3 base = mix(rootColor, tipColor, vHeight);

                // TRANSLUCIDEZ (Faz a ponta brilhar contra a luz)
                float translucency = pow(vHeight, 2.0) * 0.5;
                base += vec3(0.4, 0.7, 0.2) * translucency;

                diffuseColor.rgb = base;
                `,
      );
      mat.userData.shader = shader;
    };

    // Garante que o Three.js recompile o shader customizado
    mat.customProgramCacheKey = () => "grass_shader_v1";

    return mat;
  }, []);

  useFrame((state) => {
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = state.clock.elapsedTime;

      // O progresso sobe logo após o primeiro enigma da Pangeia (30%)
      const evo =
        stage === "Pangea" ? progress / 100 : stage === "Extinction" ? 1.0 : 0;
      const targetGrowth = evo >= 0.25 ? 1.0 : 0.01; // 0.01 para não bugar a matriz

      material.userData.shader.uniforms.uProgress.value = THREE.MathUtils.lerp(
        material.userData.shader.uniforms.uProgress.value,
        targetGrowth,
        0.03,
      );
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[bladeGeometry, material, BLADE_COUNT]}
      receiveShadow
    >
      <instancedBufferAttribute
        attach="instanceMatrix"
        args={[attributeData, 16]}
        count={BLADE_COUNT}
        array={attributeData}
        itemSize={16}
      />
    </instancedMesh>
  );
}

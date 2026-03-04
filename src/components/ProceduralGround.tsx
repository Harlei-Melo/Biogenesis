import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../store/gameStore";

export function ProceduralGround({ fogColor }: { fogColor: THREE.Color }) {
  const stage = useGameStore((s) => s.stage);
  const progress = useGameStore((s) => s.progress);

  const groundMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#4a3525",
      roughness: 0.9,
    });

    mat.onBeforeCompile = (shader: any) => {
      shader.uniforms.uSkyColor = { value: new THREE.Color() };
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uProgress = { value: 0 };
      // 🔴 NOVO: Uniforme que controla o nível de congelamento
      shader.uniforms.uIceProgress = { value: 0 };

      mat.userData.shader = shader;

      // 1. VERTEX SHADER
      shader.vertexShader = `
        varying vec2 vLocalPos;
        varying vec3 vViewTangent;
        varying vec3 vViewBitangent;
        varying vec3 vViewNormal;
        ${shader.vertexShader}
      `.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
         vLocalPos = position.xy;
         
         // Transforma os eixos locais do chão (Plane) para a visão da Câmera
         vViewTangent = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
         vViewBitangent = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
         vViewNormal = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
        `,
      );

      // 2. FRAGMENT SHADER
      shader.fragmentShader = `
        uniform vec3 uSkyColor;
        uniform float uTime;
        uniform float uProgress;
        uniform float uIceProgress; // 🔴 INJETADO AQUI
        
        varying vec2 vLocalPos;
        varying vec3 vViewTangent;
        varying vec3 vViewBitangent;
        varying vec3 vViewNormal;
        
        // HASH SEGURO
        float hash(vec2 p) {
            vec3 p3  = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
        }
        
        float noise(vec2 x) {
            vec2 i = floor(x);
            vec2 f = fract(x);
            
            vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
            
            float a = hash(i + vec2(0.0, 0.0));
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        const mat2 m2 = mat2(0.80, -0.60, 0.60, 0.80);

        float fbm(vec2 p) {
            float f = 0.0;
            float amp = 0.5;
            for(int i = 0; i < 5; i++) {
                f += amp * noise(p);
                p = m2 * p * 2.0; 
                amp *= 0.5;
            }
            return f;
        }

        // Relevo da Terra
        float terrainHeight(vec2 uv) {
            uv *= 0.25; 
            float h = fbm(uv) * 0.8;    // Dunas
            h += fbm(uv * 4.0) * 0.2;   // Pedrinhas
            return h;
        }

        ${shader.fragmentShader}
      `;

      // 3. NORMAL MAPPING
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <normal_fragment_begin>`,
        `#include <normal_fragment_begin>
         
         float eps = 0.01;
         float h0 = terrainHeight(vLocalPos);
         float hX = terrainHeight(vLocalPos + vec2(eps, 0.0));
         float hY = terrainHeight(vLocalPos + vec2(0.0, eps));

         float dX = (hX - h0) * 100.0;
         float dY = (hY - h0) * 100.0;

         // O gelo deixa o relevo levemente mais suave (preenche buracos)
         float currentBump = mix(1.5, 0.8, uIceProgress); 
         vec3 localBump = normalize(vec3(-dX * currentBump, -dY * currentBump, 1.0));
         
         normal = normalize(
             vViewTangent * localBump.x +
             vViewBitangent * localBump.y +
             vViewNormal * localBump.z
         );
        `,
      );

      // 4. ROUGHNESS: Gelo é mais liso que areia
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <roughnessmap_fragment>`,
        `#include <roughnessmap_fragment>
         float rHeight = terrainHeight(vLocalPos);
         float baseRoughness = mix(0.5, 1.0, rHeight);
         // 🔴 O Gelo reflete a luz de forma mais suave e brilhante
         roughnessFactor = mix(baseRoughness, 0.35, uIceProgress);
        `,
      );

      // 5. ESTRATIFICAÇÃO DE CORES DA TERRA + NEVE
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <color_fragment>`,
        `#include <color_fragment>
         
         float alt = terrainHeight(vLocalPos);

         // Fase 1: Árida
         vec3 dryEarth = vec3(0.18, 0.12, 0.08);
         vec3 dryClay  = vec3(0.35, 0.25, 0.15);
         vec3 dryDust  = vec3(0.48, 0.38, 0.24);

         vec3 colorDry = mix(dryEarth, dryClay, smoothstep(0.2, 0.4, alt));
         colorDry      = mix(colorDry, dryDust, smoothstep(0.4, 0.7, alt));

         // Fase 2: Fértil
         vec3 lushMud  = vec3(0.05, 0.08, 0.02);
         vec3 lushMoss = vec3(0.15, 0.22, 0.08);
         vec3 lushRock = vec3(0.22, 0.26, 0.14);

         vec3 colorLush = mix(lushMud, lushMoss, smoothstep(0.2, 0.4, alt));
         colorLush      = mix(colorLush, lushRock, smoothstep(0.4, 0.7, alt));

         // 🔴 Fase 3: Era do Gelo
         vec3 iceDeep   = vec3(0.40, 0.50, 0.60); // Gelo sujo/escuro nos vales
         vec3 iceFrost  = vec3(0.75, 0.80, 0.85); // Geada
         vec3 snowPeak  = vec3(0.95, 0.95, 1.00); // Neve pura nos topos

         vec3 colorIce = mix(iceDeep, iceFrost, smoothstep(0.2, 0.4, alt));
         colorIce      = mix(colorIce, snowPeak, smoothstep(0.4, 0.7, alt));

         // Mistura Pangeia
         vec3 finalTerrain = mix(colorDry, colorLush, smoothstep(0.2, 0.8, uProgress));
         
         // 🔴 Mistura Era do Gelo por cima de tudo
         finalTerrain = mix(finalTerrain, colorIce, uIceProgress);

         // Cavity Map: Profundidade visual
         float cavity = mix(0.3, 1.0, smoothstep(0.1, 0.5, alt));
         // A neve preenche as sombras, tornando as fendas menos escuras
         cavity = mix(cavity, 0.8, uIceProgress);

         diffuseColor.rgb = finalTerrain * cavity;
        `,
      );

      // 6. FOG
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <fog_fragment>`,
        `#include <fog_fragment>
         float dist = length(vLocalPos);
         float edgeFade = smoothstep(80.0, 180.0, dist);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, uSkyColor, edgeFade);
        `,
      );
    };

    mat.customProgramCacheKey = () => "ground_inigo_quilez_v4_ice";

    return mat;
  }, []);

  useFrame((state) => {
    // Progresso da vida (Sopa -> Pangeia)
    const evo =
      stage === "Pangea" ? progress / 100 : stage === "Extinction" ? 1.0 : 0;
    const targetProgress = evo >= 0.25 || stage === "IceAge" ? 1.0 : 0.0;

    // 🔴 Controle do Gelo! Se a fase for IceAge, o chão congela.
    const targetIce = stage === "IceAge" ? 1.0 : 0.0;

    if (groundMaterial.userData.shader) {
      groundMaterial.userData.shader.uniforms.uTime.value =
        state.clock.elapsedTime;
      groundMaterial.userData.shader.uniforms.uSkyColor.value.copy(fogColor);

      // Interpolação do mato
      groundMaterial.userData.shader.uniforms.uProgress.value =
        THREE.MathUtils.lerp(
          groundMaterial.userData.shader.uniforms.uProgress.value,
          targetProgress,
          0.02,
        );

      // Interpolação da neve (Esfria devagar)
      groundMaterial.userData.shader.uniforms.uIceProgress.value =
        THREE.MathUtils.lerp(
          groundMaterial.userData.shader.uniforms.uIceProgress.value,
          targetIce,
          0.015,
        );
    }
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.05, 0]}
      receiveShadow
    >
      <planeGeometry args={[1000, 1000, 1, 1]} />
      <primitive object={groundMaterial} attach="material" />
    </mesh>
  );
}

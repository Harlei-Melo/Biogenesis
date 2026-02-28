import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../store/gameStore";

export function ProceduralGround({ fogColor }: { fogColor: THREE.Color }) {
  const groundMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const stage = useGameStore((s) => s.stage);
  const progress = useGameStore((s) => s.progress);

  const t = useMemo(() => {
    if (["AminoAcids", "RNA", "Protocell", "Life"].includes(stage)) return 0;
    const stages = ["Pangea", "Extinction"];
    const idx = stages.indexOf(stage);
    if (idx === -1) return 1;
    return (idx + Math.min(progress, 100) / 100) / stages.length;
  }, [stage, progress]);

  // Fallback escuro neutro
  const groundTint = useMemo(() => new THREE.Color("#1a1a2e"), []);

  useFrame((state) => {
    const evo =
      stage === "Pangea" ? progress / 100 : stage === "Extinction" ? 1.0 : 0;
    const targetProgress = evo >= 0.25 ? 1.0 : 0.0;

    if (groundMatRef.current && groundMatRef.current.userData.shader) {
      groundMatRef.current.userData.shader.uniforms.uTime.value =
        state.clock.elapsedTime;
      groundMatRef.current.userData.shader.uniforms.uSkyColor.value.set(
        fogColor,
      );

      if (
        groundMatRef.current.userData.shader.uniforms.uProgress === undefined
      ) {
        groundMatRef.current.userData.shader.uniforms.uProgress = { value: 0 };
      }
      groundMatRef.current.userData.shader.uniforms.uProgress.value =
        THREE.MathUtils.lerp(
          groundMatRef.current.userData.shader.uniforms.uProgress.value,
          targetProgress,
          0.02,
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
      <meshStandardMaterial
        ref={groundMatRef}
        color={groundTint}
        roughness={0.9}
        onUpdate={(self) => {
          if (
            self instanceof THREE.MeshStandardMaterial &&
            !self.onBeforeCompile
          ) {
            self.onBeforeCompile = (shader: any) => {
              shader.uniforms.uSkyColor = { value: new THREE.Color(fogColor) };
              shader.uniforms.uTime = { value: 0 };
              shader.uniforms.uProgress = { value: 0 };
              self.userData.shader = shader;

              shader.vertexShader =
                `varying vec2 vLocalPos;\n${shader.vertexShader}`.replace(
                  `#include <begin_vertex>`,
                  `#include <begin_vertex>\nvLocalPos = position.xy;\n`,
                );

              shader.fragmentShader = `
                uniform vec3 uSkyColor;
                uniform float uTime;
                uniform float uProgress;
                varying vec2 vLocalPos;
                
                float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
                float noise(vec2 p) {
                  vec2 i = floor(p); vec2 f = fract(p);
                  f = f*f*(3.0-2.0*f);
                  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
                }

                ${shader.fragmentShader}
              `
                .replace(
                  `#include <map_fragment>`,
                  `#include <map_fragment>
                 float n = noise(vLocalPos * 0.1);
                 
                 // --- CORREÇÃO: Chão de Deserto Árido (Marrons e beges arenosos) ---
                 vec3 dryDark = vec3(0.35, 0.25, 0.15); 
                 vec3 dryLight = vec3(0.50, 0.40, 0.25); 
                 vec3 groundDry = mix(dryDark, dryLight, n);

                 // --- Fase Fértil (Base Azul escura do Shadertoy) ---
                 vec3 lushDark = vec3(0.05, 0.05, 0.15); 
                 vec3 lushLight = vec3(0.10, 0.10, 0.30);
                 vec3 groundLush = mix(lushDark, lushLight, n);
                 
                 diffuseColor.rgb = mix(groundDry, groundLush, smoothstep(0.2, 0.8, uProgress)); 
                `,
                )
                .replace(
                  `#include <fog_fragment>`,
                  `#include <fog_fragment>
                 float dist = length(vLocalPos);
                 float edgeFade = smoothstep(80.0, 180.0, dist);
                 gl_FragColor.rgb = mix(gl_FragColor.rgb, uSkyColor, edgeFade);
                `,
                );
            };
          }
        }}
      />
    </mesh>
  );
}

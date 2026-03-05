import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import {
  crustHeader,
  crustMapLogic,
  crustEmissiveLogic,
  crustRoughnessLogic,
} from "../shaders/hadean/crust";

// MANTEMOS O SEU SHADER DE ESTRELAS 3D (Otimizado)
const immersiveStarsShader = {
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vPosition; 
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    #define NUM_LAYERS 4.0
    #define Velocity 0.01
    #define StarGlow 0.025
    uniform float uTime;
    varying vec3 vPosition; 

    float Hash31(vec3 p){
        p = fract(p * vec3(123.34, 456.21, 789.12));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y * p.z);
    }

    vec3 rotate3D(vec3 p, float a) {
        float s = sin(a), c = cos(a);
        mat3 m = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
        return m * p;
    }

    float Star(vec3 p, float flare){
        float d = length(p);
        float m = 0.005 / max(d, 0.0001);  
        float rays = max(0.0, 0.5 - abs(p.x * p.y * 4000.0)); 
        m += (rays * flare) * 2.0;
        m *= smoothstep(0.5, 0.02, d);
        return m;
    }

    vec3 StarLayer(vec3 p){
        vec3 col = vec3(0.0);
        vec3 gv = fract(p) - 0.5;
        vec3 id = floor(p);
        for(int z = -1; z <= 1; z++){
          for(int y = -1; y <= 1; y++){
            for(int x = -1; x <= 1; x++){
                vec3 offs = vec3(float(x), float(y), float(z));
                float n = Hash31(id + offs);
                float size = fract(n * 345.32);
                float visibility = smoothstep(0.85, 1.0, size);
                if (visibility <= 0.0) continue;
                vec3 pos = gv - offs - (vec3(n, fract(n*34.0), fract(n*123.0)) - 0.5);
                float star = Star(pos, visibility * 0.8);
                vec3 baseBlue = vec3(0.1, 0.4, 1.0);
                vec3 basePurple = vec3(0.7, 0.1, 1.0);
                vec3 color = mix(baseBlue, basePurple, smoothstep(0.8, 0.95, n));
                color = mix(color, vec3(1.0), star * 0.5);
                star *= sin(uTime * 1.5 + n * 6.28) * 0.5 + 0.5;
                col += star * visibility * color;
            }
          }
        }
        return col;
    }

    void main() {
        vec3 p = normalize(vPosition);
        float t = uTime * Velocity; 
        vec3 col = vec3(0.0);  
        for(float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYERS){
            float depth = fract(i + t);
            float scale = mix(80.0, 20.0, depth); 
            float fade = depth * smoothstep(1.0, 0.8, depth);
            vec3 layerPos = rotate3D(p, i * 123.45) * scale + i * 453.2;
            col += StarLayer(layerPos) * fade;
        }   
        gl_FragColor = vec4(col * 2.0, 1.0);
    }
  `,
};

function HadeanStars() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  useFrame((state) => {
    if (materialRef.current)
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh scale={[150, 150, 150]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        args={[immersiveStarsShader]}
        side={THREE.BackSide}
        depthWrite={false}
        transparent={true}
      />
    </mesh>
  );
}

interface PlanetaProps {
  evolucao: number;
}

export function PlanetaHadeano({ evolucao }: PlanetaProps) {
  const superficieRef = useRef<THREE.Mesh>(null!);
  const nuvensRef1 = useRef<THREE.Mesh>(null!);
  const nuvensRef2 = useRef<THREE.Mesh>(null!);
  const atmosferaRef = useRef<THREE.Mesh>(null!);

  const [lavaDiff, lavaNor, lavaRough, lavaDisp, lavaEmit, nuvensMap] =
    useTexture([
      "/textures/Lava002_4K-JPG/volcanic_diff.jpg",
      "/textures/Lava002_4K-JPG/volcanic_nor.jpg",
      "/textures/Lava002_4K-JPG/volcanic_rough.jpg",
      "/textures/Lava002_4K-JPG/volcanic_disp.jpg",
      "/textures/Lava002_4K-JPG/volcanic_emissive.jpg",
      "/textures/clouds.jpg",
    ]);

  [lavaDiff, lavaNor, lavaRough, lavaDisp, lavaEmit].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
  });

  const onBeforeCompile = (shader: any) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uEvolution = { value: 0 };
    superficieRef.current.userData.shader = shader;
    shader.fragmentShader = crustHeader + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      crustMapLogic,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      crustEmissiveLogic,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      crustRoughnessLogic,
    );
  };

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (superficieRef.current?.userData.shader) {
      const shader = superficieRef.current.userData.shader;
      shader.uniforms.uTime.value = t;
      const currentEvo = shader.uniforms.uEvolution.value;
      shader.uniforms.uEvolution.value = THREE.MathUtils.lerp(
        currentEvo,
        evolucao,
        delta * 1.5,
      );
    }

    const currentVisuEvo =
      superficieRef.current?.userData.shader?.uniforms.uEvolution.value || 0;

    if (superficieRef.current) {
      superficieRef.current.rotation.y = t * 0.01;
      const mat = superficieRef.current.material as THREE.MeshStandardMaterial;

      // 🔴 CORREÇÃO 1: SUPERFÍCIE - Rugosidade e Metalidade para reflexos limpos

      // Matamos a intensidade do brilho da lava para não gerar amarelo debaixo do azul
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        1.5,
        0.0,
        currentVisuEvo * 1.2,
      );
      mat.emissive.lerpColors(
        new THREE.Color("#ff3300"),
        new THREE.Color("#000000"),
        currentVisuEvo,
      );

      // A MÁGICA: Baixamos a rugosidade para criar um reflexo ("hit") agudo do sol
      mat.roughness = THREE.MathUtils.lerp(0.9, 0.05, currentVisuEvo);

      // Aumentamos a metalidade para o sol refletir branco/azul em vez de tingir o material
      mat.metalness = THREE.MathUtils.lerp(0.1, 0.8, currentVisuEvo);

      // Cor base muito escura (quase preta) para o azul da atmosfera ser o protagonista
      mat.color.lerpColors(
        new THREE.Color("#ffffff"),
        new THREE.Color("#050a15"),
        currentVisuEvo,
      );
    }

    if (nuvensRef1.current) {
      nuvensRef1.current.rotation.y = t * 0.02;
      const corHadeana = new THREE.Color("#884400");
      const corTerra = new THREE.Color("#ffffff");
      // @ts-ignore
      nuvensRef1.current.material.color.lerpColors(
        corHadeana,
        corTerra,
        currentVisuEvo,
      );
      // @ts-ignore
      nuvensRef1.current.material.opacity = 0.4 + currentVisuEvo * 0.4;
    }

    if (nuvensRef2.current) {
      nuvensRef2.current.rotation.y = t * 0.025 + 2;
      const corHadeana = new THREE.Color("#ffaa44");
      const corTerra = new THREE.Color("#ffffff");
      // @ts-ignore
      nuvensRef2.current.material.color.lerpColors(
        corHadeana,
        corTerra,
        currentVisuEvo,
      );
    }

    // 🔴 CORREÇÃO 2: ATMOSFERA - Bloqueio total do verde
    if (atmosferaRef.current) {
      const corHadeana = new THREE.Color("#ff3300");
      const corTerra = new THREE.Color("#0077ff"); // Azul vibrante
      // @ts-ignore
      atmosferaRef.current.material.color.lerpColors(
        corHadeana,
        corTerra,
        currentVisuEvo,
      );

      // Opacidade alta age como um "escudo" para tampar a cor amarela da lava
      // @ts-ignore
      atmosferaRef.current.material.opacity = 0.1 + currentVisuEvo * 0.6;
    }
  });

  return (
    <>
      <HadeanStars />
      <group scale={2.5}>
        <mesh ref={superficieRef}>
          <sphereGeometry args={[1, 256, 256]} />
          <meshStandardMaterial
            map={lavaDiff}
            normalMap={lavaNor}
            roughnessMap={lavaRough}
            displacementMap={lavaDisp}
            displacementScale={0.12}
            emissiveMap={lavaEmit}
            emissive="#ff3300"
            metalness={0.1}
            roughness={0.9}
            onBeforeCompile={onBeforeCompile}
          />
        </mesh>

        <mesh ref={nuvensRef1} scale={[1.04, 1.04, 1.04]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial
            map={nuvensMap}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={nuvensRef2} scale={[1.08, 1.08, 1.08]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial
            map={nuvensMap}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={atmosferaRef} scale={[1.15, 1.15, 1.15]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            transparent
            opacity={0.1}
            side={THREE.BackSide}
            // 🔴 NormalBlending bloqueia fisicamente a cor debaixo, evitando o verde
            blending={THREE.NormalBlending}
          />
        </mesh>
      </group>
    </>
  );
}

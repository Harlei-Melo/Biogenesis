import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import { crustHeader, crustMapLogic, crustEmissiveLogic, crustRoughnessLogic } from "../shaders/hadean/crust";

interface PlanetaProps {
  evolucao: number; // Recebe de 0.0 (Inferno) a 1.0 (Oceano)
}

export function PlanetaHadeano({ evolucao }: PlanetaProps) {
  const superficieRef = useRef<THREE.Mesh>(null!);
  const nuvensRef1 = useRef<THREE.Mesh>(null!);
  const nuvensRef2 = useRef<THREE.Mesh>(null!);
  const atmosferaRef = useRef<THREE.Mesh>(null!);

  const [lavaDiff, lavaNor, lavaRough, lavaDisp, lavaEmit, nuvensMap] = useTexture([
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
    shader.uniforms.uEvolution = { value: 0 }; // Inicia no Hadeano

    superficieRef.current.userData.shader = shader;

    shader.fragmentShader = crustHeader + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', crustMapLogic);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', crustEmissiveLogic);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', crustRoughnessLogic);
  };

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (superficieRef.current?.userData.shader) {
      const shader = superficieRef.current.userData.shader;
      shader.uniforms.uTime.value = t;
      
      // --- LIGAÇÃO COM O JOGO ---
      // Pegamos o valor atual do shader e movemos suavemente em direção ao valor da prop 'evolucao'
      // O fator 'delta * 1.0' define a velocidade da transição visual (suavidade)
      const currentEvo = shader.uniforms.uEvolution.value;
      shader.uniforms.uEvolution.value = THREE.MathUtils.lerp(currentEvo, evolucao, delta * 1.5);
    }

    if (superficieRef.current) superficieRef.current.rotation.y = t * 0.01;
    
    // Pegamos o valor REAL do shader (já suavizado) para aplicar nas nuvens e atmosfera
    const currentVisuEvo = superficieRef.current?.userData.shader?.uniforms.uEvolution.value || 0;
    
    // Nuvens: Mudam de cor conforme esfria
    if (nuvensRef1.current) {
      nuvensRef1.current.rotation.y = t * 0.02;
      const corHadeana = new THREE.Color("#552200");
      const corTerra = new THREE.Color("#ffffff");
      // @ts-ignore
      nuvensRef1.current.material.color.lerpColors(corHadeana, corTerra, currentVisuEvo);
      // @ts-ignore
      nuvensRef1.current.material.opacity = 0.6 + (currentVisuEvo * 0.2); 
    }

    if (nuvensRef2.current) {
      nuvensRef2.current.rotation.y = t * 0.025 + 2;
      const corHadeana = new THREE.Color("#ff6600");
      const corTerra = new THREE.Color("#ffffff");
      // @ts-ignore
      nuvensRef2.current.material.color.lerpColors(corHadeana, corTerra, currentVisuEvo);
    }
    
    // Atmosfera: De Laranja Tóxico para Azul Oxigênio
    if (atmosferaRef.current) {
       const corHadeana = new THREE.Color("#ff2200");
       const corTerra = new THREE.Color("#0066ff");
       // @ts-ignore
       atmosferaRef.current.material.color.lerpColors(corHadeana, corTerra, currentVisuEvo);
    }
  });

  return (
    <group scale={2.5}>
      <mesh ref={superficieRef}>
        <sphereGeometry args={[1, 256, 256]} />
        <meshStandardMaterial
          map={lavaDiff} normalMap={lavaNor} roughnessMap={lavaRough}
          displacementMap={lavaDisp} displacementScale={0.12} 
          emissiveMap={lavaEmit} emissive="#000000"
          metalness={0.2} roughness={0.9}
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>

      <mesh ref={nuvensRef1} scale={[1.04, 1.04, 1.04]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial map={nuvensMap} transparent opacity={0.6} color="#552200" blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      
      <mesh ref={nuvensRef2} scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial map={nuvensMap} transparent opacity={0.3} color="#ff6600" blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      
      <mesh ref={atmosferaRef} scale={[1.15, 1.15, 1.15]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.1} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
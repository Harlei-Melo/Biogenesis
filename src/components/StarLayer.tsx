import { useRef, useMemo } from "react";
import { useFrame, extend } from "@react-three/fiber";
import { useTexture, Points, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

// --- SHADER PERSONALIZADO (Mantido igual, pois é perfeito) ---
const StarGlowMaterial = shaderMaterial(
  {
    // Uniforms
  },
  // Vertex Shader
  `
    attribute float size;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z); 
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    varying vec3 vColor;
    void main() {
      float dist = distance(gl_PointCoord, vec2(0.5));
      if (dist > 0.5) discard;
      float strength = 1.0 - (dist * 2.0);
      strength = pow(strength, 3.0);
      gl_FragColor = vec4(vColor, strength);
    }
  `,
);

extend({ StarGlowMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      starGlowMaterial: any;
    }
  }
}

export function StarLayer() {
  const bgRef = useRef<THREE.Mesh>(null!);
  const starsRef = useRef<THREE.Points>(null!);

  const bgTexture = useTexture("/textures/stars/milky_way.jpg");

  // --- AQUI ESTÁ A MUDANÇA: PALETA FRIA ---
  const [positions, colors, sizes] = useMemo(() => {
    const count = 4000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const colorOptions = [
      new THREE.Color("#aaddff").multiplyScalar(2), // Azul Claro (Ciano elétrico)
      new THREE.Color("#4466ff").multiplyScalar(2), // Azul Profundo
      new THREE.Color("#ffffff").multiplyScalar(1.5), // Branco Puro (Gelado)
      new THREE.Color("#ccddff").multiplyScalar(1.5), // Branco Azulado
      new THREE.Color("#8800ff").multiplyScalar(2), // Violeta (Raro, mas lindo no espaço)
    ];

    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 120;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Escolhe apenas cores FRIAS
      const color =
        colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Variamos o tamanho para dar profundidade
      sizes[i] = 0.5 + Math.random() * 2.5;
    }
    return [positions, colors, sizes];
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (bgRef.current) bgRef.current.rotation.y = t * 0.0015;
    if (starsRef.current) starsRef.current.rotation.y = t * 0.004;
  });

  return (
    <group>
      {/* CAMADA 1: BACKGROUND (Tintura Azulada para combinar) */}
      <mesh ref={bgRef}>
        <sphereGeometry args={[450, 64, 64]} />
        <meshBasicMaterial
          map={bgTexture}
          side={THREE.BackSide}
          transparent
          opacity={0.4}
          color="#aaaaff" // Tinge a Via Láctea levemente de azul
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* CAMADA 2: ESTRELAS FRIAS */}
      <Points
        ref={starsRef}
        positions={positions}
        colors={colors}
        sizes={sizes}
      >
        {/* @ts-ignore */}
        <starGlowMaterial
          transparent
          vertexColors
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

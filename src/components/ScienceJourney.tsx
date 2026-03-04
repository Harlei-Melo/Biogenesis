import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function latLongToVector3(lat: number, lon: number, radius: number = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// 🔴 SHADER "SILK NEON": Fio de seda com pulsação orgânica
const silkShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color("#00ffff") },
    uProgress: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uColor;
    varying vec2 vUv;
    
    void main() {
      // 1. MÁSCARA DE NASCIMENTO: A linha 'cresce' suavemente até o destino
      float visibility = smoothstep(uProgress + 0.05, uProgress, vUv.x);
      if (vUv.x > uProgress) discard;

      // 2. EFEITO SEDA (FADE CAUDA -> PONTA)
      // A linha começa mais fraca na origem (vUv.x = 0) e ganha corpo na ponta
      float tailFade = smoothstep(0.0, 0.8, vUv.x);

      // 3. PULSAÇÃO DE ENERGIA (Aumentando e diminuindo a cor)
      // Criamos uma onda senoidal que corre pelo fio
      float wave = sin(vUv.x * 10.0 - uTime * 4.0);
      float pulse = (wave * 0.5 + 0.5); // Normaliza entre 0 e 1

      // 4. BRILHO NEON (INTENSIDADE)
      // Base constante + Pulso brilhante para o Bloom
      float intensity = 0.5 + (pulse * 2.5);
      
      // Cor final: Mistura a cor base com o brilho da pulsação
      vec3 finalColor = uColor * intensity;
      
      // Opacidade: Seda fina (alpha baixo nas bordas e maior onde brilha)
      float alpha = (0.2 + (pulse * 0.6)) * tailFade;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

interface ArcProps {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  color?: string;
}

export function JourneyArc({
  startLat,
  startLon,
  endLat,
  endLon,
  color = "#00ffff",
}: ArcProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const progressRef = useRef(0);

  const tubeGeometry = useMemo(() => {
    const start = latLongToVector3(startLat, startLon);
    const end = latLongToVector3(endLat, endLon);
    const distance = start.distanceTo(end);
    const midPoint = start.clone().add(end).multiplyScalar(0.5);

    // Arco arredondado e elegante
    const controlPoint = midPoint
      .normalize()
      .multiplyScalar(1 + distance * 0.4);
    const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);

    // 🔴 ESPESSURA DE SEDA: Muito fina (0.002) e bem arredondada (8 faces)
    return new THREE.TubeGeometry(curve, 128, 0.002, 8, false);
  }, [startLat, startLon, endLat, endLon]);

  const material = useMemo(() => {
    const mat = silkShaderMaterial.clone();
    mat.uniforms.uColor.value = new THREE.Color(color);
    return mat;
  }, [color]);

  useEffect(() => {
    progressRef.current = 0;
    if (materialRef.current) materialRef.current.uniforms.uProgress.value = 0;
  }, [startLat, startLon]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Crescimento mais orgânico
      if (progressRef.current < 1) {
        progressRef.current += delta * 0.7;
        materialRef.current.uniforms.uProgress.value = Math.min(
          progressRef.current,
          1,
        );
      }
    }
  });

  return (
    <mesh
      geometry={tubeGeometry}
      material={material}
      ref={(mesh) => {
        if (mesh) materialRef.current = mesh.material as THREE.ShaderMaterial;
      }}
    />
  );
}

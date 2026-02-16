import { useRef, useMemo, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Função para o Halo (mantida igual)
function createSunHaloTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0, size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.2, "rgba(255, 200, 0, 0.8)");
    gradient.addColorStop(0.5, "rgba(255, 100, 0, 0.3)");
    gradient.addColorStop(1, "rgba(255, 50, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

// USAMOS forwardRef PARA O EFEITO DE GODRAYS ENCONTRAR O SOL
export const Sun = forwardRef<THREE.Mesh>((_props, ref) => {
  const haloRef = useRef<THREE.Mesh>(null!);
  const sunSurface = useTexture("/textures/sun/sun_surface.jpg");
  const haloTexture = useMemo(() => createSunHaloTexture(), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // @ts-ignore
    if (ref?.current) ref.current.rotation.y = t * 0.02;
    if (haloRef.current) {
      const pulse = 18 + Math.sin(t * 1.2) * 0.3;
      haloRef.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group position={[15, 10, -20]}>
      {/* A esfera principal recebe o REF que vem de fora */}
      <mesh ref={ref} scale={[3, 3, 3]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={sunSurface}
          emissiveMap={sunSurface}
          emissive={new THREE.Color(1, 1, 1)}
          emissiveIntensity={4} // Aumentei para 4 para cegar o GodRay
          toneMapped={false}
        />
      </mesh>

      <Billboard>
        <mesh ref={haloRef}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={haloTexture}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </Billboard>

      <pointLight intensity={500} distance={300} color="#ffcc00" decay={1.5} />
    </group>
  );
});
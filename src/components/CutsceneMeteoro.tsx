import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars, useVideoTexture, Cloud } from "@react-three/drei";
import * as THREE from "three";

export function CutsceneMeteoro() {
  const { scene } = useThree();
  const shakeIntensity = useRef(0);
  const progressRef = useRef(0);
  const flashRef = useRef<THREE.Mesh>(null!);

  // Paleta de Cores da Atmosfera
  const spaceColor = useMemo(() => new THREE.Color("#000000"), []);
  const entryColor = useMemo(() => new THREE.Color("#1a0500"), []);
  const stormColor = useMemo(() => new THREE.Color("#0a0f1a"), []);

  useEffect(() => {
    const oldFog = scene.fog;
    scene.fog = new THREE.FogExp2("#0a0f1a", 0.002);
    scene.background = spaceColor;
    return () => {
      scene.fog = oldFog;
    };
  }, [scene, spaceColor]);

  const meteoroTexture = useVideoTexture("/videos/meteoro.mp4", {
    loop: true,
    muted: true,
    start: true,
    playsInline: true, // 🔴 SALVA-VIDAS DE CELULAR: Permite tocar no fundo
    crossOrigin: "Anonymous", // 🔴 Evita bloqueios de segurança do navegador
  });

  useFrame((state, delta) => {
    // 🔴 1. CONTROLE DE TEMPO AQUI! (Mudei de 0.08 para 0.04)
    // Isso faz a animação demorar o dobro do tempo (~25 segundos)
    progressRef.current += delta * 0.04;
    const currentAtmos = Math.min(progressRef.current, 1.0);

    // TERREMOTO CINEMÁTICO
    shakeIntensity.current = THREE.MathUtils.lerp(
      shakeIntensity.current,
      currentAtmos * 3.0,
      delta,
    );
    const shakeX = (Math.random() - 0.5) * shakeIntensity.current;
    const shakeY = (Math.random() - 0.5) * shakeIntensity.current;

    // COREOGRAFIA DE CÂMERA (Aceleração, Drift e Tombamento)
    const speedCurve = Math.pow(currentAtmos, 2.5);
    const driftX = Math.sin(currentAtmos * Math.PI) * 8.0;
    const driftY = Math.cos(currentAtmos * Math.PI * 0.7) * 4.0 - 4.0;

    state.camera.position.set(
      shakeX + driftX,
      shakeY + driftY,
      45 - speedCurve * 40,
    );

    const rollAngle = Math.sin(currentAtmos * Math.PI * 2) * 0.25;
    state.camera.up.set(Math.sin(rollAngle), Math.cos(rollAngle), 0);
    state.camera.lookAt(0, 0, 0);

    // A MÁGICA DO CÉU
    if (currentAtmos < 0.4) {
      scene.background = spaceColor
        .clone()
        .lerp(entryColor, currentAtmos / 0.4);
    } else if (currentAtmos < 0.8) {
      scene.background = entryColor
        .clone()
        .lerp(stormColor, (currentAtmos - 0.4) / 0.4);
    }

    // A VENDA BRANCA
    if (flashRef.current) {
      flashRef.current.position.copy(state.camera.position);
      flashRef.current.quaternion.copy(state.camera.quaternion);
      flashRef.current.translateZ(-0.5);

      if (currentAtmos > 0.7) {
        const flash = (currentAtmos - 0.7) * 3.33;
        const material = flashRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = Math.min(flash, 1.0);
      } else {
        (flashRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }

    if (currentAtmos >= 0.99) {
      meteoroTexture.dispose();
    }
  });

  return (
    <group>
      {/* 🔴 2. LUZES ADICIONADAS PARA AS NUVENS 🔴 */}
      {/* Luz ambiente para as nuvens não ficarem no breu total */}
      <ambientLight intensity={1.5} color="#667788" />
      {/* Uma luz fortíssima e laranja vindo da posição do meteoro! */}
      <pointLight
        position={[0, 0, -5]}
        intensity={200}
        color="#ff5500"
        distance={60}
      />

      {/* CAMADA 1: O FUNDO */}
      <Stars
        radius={120}
        depth={50}
        count={3000}
        factor={2}
        saturation={1}
        fade
        speed={1}
      />
      <Stars
        radius={80}
        depth={20}
        count={1000}
        factor={4}
        saturation={0}
        fade
        speed={4}
      />

      {/* CAMADA 2: O METEORO */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[32, 18]} />
        <meshBasicMaterial
          map={meteoroTexture}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>

      {/* CAMADA 3: AS NUVENS (Agora iluminadas pelo meteoro) */}
      <group>
        <Cloud
          position={[-12, 8, 10]}
          speed={0.2}
          opacity={0.6}
          scale={[2, 2, 2]}
        />
        <Cloud
          position={[14, -6, 15]}
          speed={0.2}
          opacity={0.6}
          scale={[2, 2, 2]}
        />
        <Cloud
          position={[-15, -10, 25]}
          speed={0.3}
          opacity={0.8}
          scale={[3, 3, 3]}
        />
        <Cloud
          position={[12, 12, 28]}
          speed={0.3}
          opacity={0.8}
          scale={[3, 3, 3]}
        />
        <Cloud
          position={[-10, 0, 38]}
          speed={0.5}
          opacity={1}
          scale={[4, 4, 4]}
          color="#ffb099"
        />
        <Cloud
          position={[10, 5, 40]}
          speed={0.5}
          opacity={1}
          scale={[4, 4, 4]}
          color="#99aaff"
        />
      </group>

      {/* CAMADA 4: O CLARÃO */}
      <mesh ref={flashRef} renderOrder={9999}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent={true}
          opacity={0}
          depthTest={false}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

import { Sparkles, Html, PerspectiveCamera, Caustics, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { HydrothermalVent } from './HydrothermalVent';
import { useGameStore } from '../store/gameStore';
import { LifeParameters } from './LifeParameters';
import { LifeSpawner } from './LifeSpawner';
import { useFrame } from '@react-three/fiber';
// import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
// import { BlendFunction } from 'postprocessing';

export function FaseOceano() {
  const updateSimulation = useGameStore((state) => state.updateSimulation);
  const parameters = useGameStore((state) => state.parameters);

  // Loop de Simulação
  useFrame((state, delta) => {
    updateSimulation(delta);

    // Movimento da câmera (Rotação cinematográfica lenta)
    const t = state.clock.getElapsedTime();
    state.camera.position.x = Math.sin(t * 0.05) * 15;
    state.camera.position.z = Math.cos(t * 0.05) * 15;
    state.camera.lookAt(0, 0, 0);
  });

  // Calcular visuais com base nos parâmetros
  // Cores do oceano profundo - Estilo Subnautica (Azul Petróleo / Teal)
  const bgDark = "#001e28"; // Mais esverdeado/teal

  // Carregando Texturas do fundo do mar
  const [sandColor, sandNormal, sandRoughness] = useTexture([
    '/textures/Ground054_2K-JPG/sand.jpg',
    '/textures/Ground054_2K-JPG/sand_normal.jpg',
    '/textures/Ground054_2K-JPG/Ground054_2K-JPG_Roughness.jpg' // Usando o roughness do pack
  ]);

  // Configuração de repetição da textura para não ficar esticada
  sandColor.wrapS = sandColor.wrapT = THREE.RepeatWrapping;
  sandColor.repeat.set(8, 8);

  sandNormal.wrapS = sandNormal.wrapT = THREE.RepeatWrapping;
  sandNormal.repeat.set(8, 8);

  sandRoughness.wrapS = sandRoughness.wrapT = THREE.RepeatWrapping;
  sandRoughness.repeat.set(8, 8);

  return (
    <>
      <PerspectiveCamera makeDefault position={[10, 5, 10]} fov={50}>
        {/* Headlight: Luz que segue a câmera para iluminar o que o jogador vê */}
        <pointLight intensity={5} distance={20} decay={2} color="#aaddff" position={[0, 0, 0]} />
      </PerspectiveCamera>

      <Html fullscreen zIndexRange={[100, 0]}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <LifeParameters />
        </div>
      </Html>

      {/* Ambiente - Névoa azulada/teal para profundidade */}
      <color attach="background" args={[bgDark]} />
      <fog attach="fog" args={[bgDark, 10, 50]} />

      {/* Luz para preencher as sombras (Resolve peixes pretos) */}
      <hemisphereLight intensity={0.5} color="#0088bb" groundColor="#001133" />

      {/* Luz do Sol (God Rays) - Ajustada para menos artefatos */}
      <spotLight
        position={[0, 50, 0]} // Sol a pino para evitar sombras longas bugadas
        angle={0.6}
        penumbra={0.5}
        intensity={20}
        color="#aaddff"
        castShadow
        shadow-bias={-0.001} // Ajuste de bias para remover "striping"
        shadow-mapSize={[2048, 2048]} // Melhora resolução da sombra
      />

      <Environment preset="night" background={false} />

      {/* Fundo do Mar com Textura Realista */}
      <group position={[0, -6, 0]}>
        <Caustics
          color="#aaffff"
          lightSource={[0, 50, 0]}
          intensity={0.15} // Bem suave
          worldRadius={30}
          ior={1.1}
          backside={false}
          causticsOnly={false}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 100, 256, 256]} />
            <meshStandardMaterial
              map={sandColor}
              normalMap={sandNormal}
              roughnessMap={sandRoughness}
              roughness={1}
              envMapIntensity={0.5}
              color="#aaaaaa" // Tintura leve para ajustar o brilho
            />
          </mesh>
        </Caustics>
      </group>

      {/* Luz de Preenchimento (Fill Light) */}
      <pointLight position={[-10, 0, -10]} intensity={2} color="#003344" />

      {/* Luz vulcânica (vem de baixo) - Mais sutil */}
      <pointLight
        position={[0, -5, 0]}
        intensity={5 + parameters.temperature * 5}
        color="#ff4400"
        distance={20}
        decay={2}
      />

      {/* Partículas de "Água" (Bolhas) */}
      <Sparkles
        count={500}
        scale={40}
        size={6}
        speed={0.4}
        opacity={0.3}
        color="#aaffff"
      />

      {/* Eco-sistema Central (Vents) */}
      <group position={[0, -6, 0]}>
        <HydrothermalVent position={[0, 0, 0]} />
        <HydrothermalVent position={[-4, 0, 3]} />
        <HydrothermalVent position={[3, 0.5, -3]} />
        <HydrothermalVent position={[5, -1, 4]} />
        <HydrothermalVent position={[-3, 1, -5]} />

        {/* Spawner de Vida */}
        <LifeSpawner />
      </group>
    </>
  )
}

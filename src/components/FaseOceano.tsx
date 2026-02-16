import { OrbitControls, Sparkles } from '@react-three/drei'

export function FaseOceano() {
  return (
    <>
      {/* Neblina (Fog) para dar sensação de água turva */}
      <fog attach="fog" args={['#001133', 0, 20]} />

      <ambientLight intensity={0.5} color="#0044ff" />
      <pointLight position={[0, 10, 0]} intensity={20} color="#00ffff" />

      {/* Partículas flutuando (Plâncton/Nutrientes) */}
      <Sparkles count={1000} scale={15} size={4} speed={0.2} opacity={0.8} color="#00ff88" />

      {/* Chão do Oceano (Placeholder) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#000022" roughness={1} />
      </mesh>
      
      <OrbitControls enableZoom={true} />
    </>
  )
}
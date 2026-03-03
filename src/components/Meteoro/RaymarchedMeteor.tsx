import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./MeteorShaders";

export function RaymarchedMeteor({ progressAtmos }: { progressAtmos: number }) {
  const { size, camera } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const shaderArgs = useMemo(() => {
    return {
      uniforms: {
        iTime: { value: 0 },
        uCameraPos: { value: new THREE.Vector3() },
        uInverseViewProj: { value: new THREE.Matrix4() },
        uAtmosphere: { value: 0 },
      },
      vertexShader,
      fragmentShader,
    };
  }, []);

  useFrame((state) => {
    if (!materialRef.current) return;
    const mat = materialRef.current;

    mat.uniforms.iTime.value = state.clock.elapsedTime;
    mat.uniforms.uAtmosphere.value = progressAtmos;
    mat.uniforms.uCameraPos.value.copy(camera.position);

    // Mágica para o Raymarching acompanhar a Câmera e o Tremor
    const viewProj = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    mat.uniforms.uInverseViewProj.value.copy(viewProj).invert();
  });

  return (
    <mesh>
      {/* Cobre a tela inteira, mas o Raymarcher simula a profundidade 3D lá dentro */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        args={[shaderArgs]}
        depthWrite={false}
        depthTest={false}
        fog={false}
      />
    </mesh>
  );
}

import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const LOADING_MESSAGES = [
  "Carregando, paciência...",
  "Sintetizando os blocos de construção da Abiogênese...",
  "Enquanto espera, pense na sua vida...",
  "Demora mesmo... É pesado pra caralho.",
  "Calculando a gravidade de Einstein...",
  "Quase lá. Prometo.",
];

// 🔴 O SHADER DO ORB
const orbShader = {
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      // 🔴 A MÁGICA ACONTECE AQUI!
      // Ignoramos a 'projectionMatrix' e a 'modelViewMatrix'.
      // Isso cola o shader DIRETAMENTE na lente da câmera (Clip Space 2D).
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    void main() {
      vec2 InUV = vUv * 2.0 - 1.0;
      float Brightness = sin(uTime) * 0.2;
      float AspectRatio = uResolution.x / uResolution.y;

      vec3 InnerColor = vec3(0.50, 0.50, 0.50);
      vec3 OuterColor = vec3(0.05, 0.05, 0.90);
      vec3 WaveColor  = vec3(0.70, 0.70, 1.00);

      vec2 outerPos = -0.5 + vUv;
      outerPos.x *= AspectRatio;

      vec2 innerPos = InUV * (2.0 - Brightness);
      innerPos.x *= AspectRatio;

      float innerWidth = length(outerPos);
      float circleRadius = 0.24 + Brightness * 0.1;
      float invCircleRadius = 1.0 / circleRadius;
      float circleFade = pow(length(2.0 * outerPos), 0.5);
      float invCircleFade = 1.0 - circleFade;
      
      float circleIntensity = pow(invCircleFade * max(1.1 - circleFade, 0.0), 2.0) * 60.0;
      float circleWidth = dot(innerPos, innerPos);
      
      float safeWidth = max(circleWidth, 0.001);
      float circleGlow = ((1.0 - sqrt(max(1.0 - circleWidth, 0.0))) / safeWidth) + Brightness * 0.5;
      float outerGlow = min(max(1.0 - innerWidth * (1.0 - Brightness), 0.0), 1.0);
      float waveIntensity = 0.0;

      if (innerWidth < circleRadius) {
        circleIntensity *= pow(innerWidth * invCircleRadius, 24.0);
        vec2 waveUV = InUV;
        for (float i = 0.0; i < 3.0; i++) {
          waveUV.y += 0.4 * (0.20 * cos((waveUV.x * 2.0) + (i / 7.0) + (uTime * 1.5)));
          float waveWidth = abs(1.0 / (200.0 * waveUV.y));
          waveIntensity += waveWidth;
        }
      }

      vec3 outColor = outerGlow * OuterColor;
      outColor += circleIntensity * InnerColor * 2.0;
      outColor += circleGlow * InnerColor * (0.6 + Brightness * 1.2);
      outColor += WaveColor * waveIntensity;

      outColor = clamp(outColor, 0.0, 1.0);
      outColor *= min(uTime / 2.0, 1.0);

      gl_FragColor = vec4(outColor, 1.0);
    }
  `,
};

export function GlobalLoader() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uResolution.value.set(
        size.width,
        size.height,
      );
    }
  });

  return (
    <group>
      <mesh>
        {/* 🔴 Tamanho exato de 2x2. No Clip Space, a tela vai de -1 a +1. 
            Ou seja, um plano de 2x2 preenche o monitor inteiro perfeitamente! */}
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={materialRef}
          args={[orbShader]}
          transparent={false}
          depthTest={false} // Garante que ignore elementos 3D na frente dele
          depthWrite={false} // Garante que não bugue sombras e luzes
        />
      </mesh>

      <Html
        center
        style={{
          pointerEvents: "none",
          width: "100vw",
          textAlign: "center",
          zIndex: 9999,
        }}
      >
        <p
          style={{
            fontFamily: "sans-serif",
            color: "#88aadd",
            fontSize: "1rem",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginTop: "200px",
            textShadow: "0px 0px 10px rgba(0,255,255,0.5)",
            animation: "fadeInOut 3s infinite",
          }}
        >
          {LOADING_MESSAGES[msgIndex]}
        </p>

        <style>{`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(10px); }
            20% { opacity: 1; transform: translateY(0); }
            80% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
          }
        `}</style>
      </Html>
    </group>
  );
}

import { simplexNoise } from "../utils/noise";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";

export const VentMaterial = shaderMaterial(
    {
        uTime: 0,
        uColor: new THREE.Color(0.1, 0.1, 0.1), // Base rock color
        uEmissive: new THREE.Color(1.0, 0.2, 0.0), // Magma color
        uEnergy: 0.5, // Controls glow intensity
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    varying float vDisplacement;
    uniform float uTime;
    
    ${simplexNoise}

    void main() {
      vUv = uv;
      
      // Noise for displacement (Rock shape)
      float noise = snoise(position * 2.0 + uTime * 0.1);
      
      // More detail
      float detail = snoise(position * 5.0 - uTime * 0.05) * 0.2;
      
      vDisplacement = noise + detail;
      
      // Displace vertices along normal
      vec3 newPosition = position + normal * (vDisplacement * 0.2);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
    // Fragment Shader
    `
    varying vec2 vUv;
    varying float vDisplacement;
    uniform float uTime;
    uniform float uEnergy;
    uniform vec3 uColor;
    uniform vec3 uEmissive;
    
    ${simplexNoise}

    void main() {
      // Rock texture (dark, rough)
      vec3 rockColor = uColor * (0.8 + vDisplacement * 0.4);
      
      // Magma veins (Glowing cracks)
      // Use displacement to determine deep cracks vs surface
      // High displacement = Surface (Cold), Low displacement = Crack (Hot)
      
      float crack = smoothstep(0.1, -0.2, vDisplacement); // 1.0 where deep
      
      // Pulse effect based on uEnergy
      float pulse = (sin(uTime * 3.0) * 0.5 + 0.5) * uEnergy;
      
      vec3 glow = uEmissive * (crack + pulse * crack) * 3.0; // Glow intensity
      
      // Final mix
      vec3 finalColor = rockColor + glow;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ VentMaterial });

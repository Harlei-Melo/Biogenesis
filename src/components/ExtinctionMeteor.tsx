import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

export function ExtinctionMeteor() {
    const stage = useGameStore((state) => state.stage);
    const progress = useGameStore((state) => state.progress);

    const gltfMeteor = useGLTF('/models/met01_meteor.glb');
    const meteorRef = useRef<THREE.Group>(null!);
    const lightRef = useRef<THREE.PointLight>(null!);

    // Posição de partida (visível no céu ao longe) e alvo (chão)
    const meteorStart = new THREE.Vector3(-30, 80, -30);
    const meteorTarget = new THREE.Vector3(0, -2, 0);

    useFrame((_, delta) => {
        if (!meteorRef.current) return;

        // Gira sempre
        meteorRef.current.rotation.x += delta * 2.0;
        meteorRef.current.rotation.z += delta * 1.5;

        if (stage === 'Extinction') {
            const t = Math.min(progress / 100, 1);
            // Ease In Cubic — começa devagar, acelera violentamente
            const easeT = t * t * t;

            meteorRef.current.position.lerpVectors(meteorStart, meteorTarget, easeT);

            // met01_meteor bbox: W=37.5 H=42 D=57.9. Scale base 0.08 = ~3.4m.
            // Cresce até 0.32 no impacto = ~13m de diâmetro
            const s = 0.08 + (easeT * 0.24);
            meteorRef.current.scale.set(s, s, s);
            meteorRef.current.visible = true;

            // A luz vermelha cataclísmica acompanha
            if (lightRef.current) {
                lightRef.current.position.copy(meteorRef.current.position);
                lightRef.current.intensity = easeT * 100;
            }
        } else {
            // Esconde durante Pangea — não deve ser visível antes da extinção
            meteorRef.current.position.copy(meteorStart);
            meteorRef.current.visible = false;
            if (lightRef.current) lightRef.current.intensity = 0;
        }
    });

    return (
        <group>
            <primitive
                object={gltfMeteor.scene}
                ref={meteorRef}
                scale={[0.08, 0.08, 0.08]}
                castShadow
            />
            {/* Luz vermelha de fogo que acompanha a queda */}
            <pointLight
                ref={lightRef}
                color="#ff2200"
                intensity={0}
                distance={200}
                decay={1}
            />
        </group>
    );
}

useGLTF.preload('/models/met01_meteor.glb');

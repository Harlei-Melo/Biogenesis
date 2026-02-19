import { Object3DNode } from '@react-three/fiber'
import { VentMaterial } from './shaders/ocean/vent'

declare module '@react-three/fiber' {
    interface ThreeElements {
        ventMaterial: Object3DNode<typeof VentMaterial, typeof VentMaterial> & {
            uColor?: THREE.Color
            uEmissive?: THREE.Color
            uTime?: number
            uEnergy?: number
        }
    }
}

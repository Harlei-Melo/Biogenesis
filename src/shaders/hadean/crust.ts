import { simplexNoise } from "../utils/noise";
import { biomeLogic } from "../earth/biomes";

// 1. HEADER
export const crustHeader = `
  uniform float uTime;
  uniform float uEvolution; // 0.0 = Hadeano (Fogo), 1.0 = Terra (Vida)
  ${simplexNoise}
  ${biomeLogic} // Importa a lógica dos biomas
`;

// 2. MAP LOGIC (Onde a mágica da transição acontece)
export const crustMapLogic = `
  #include <map_fragment>
  
  // --- GERAÇÃO DO TERRENO ---
  // Hadeano: Caótico, fragmentado (Noise Alta Frequência)
  float tectonicHadean = fbm(vMapUv * 3.0 + uTime * 0.01); 

  // Terra/Pangea: Supercontinente (Noise Baixa Frequência dominant)
  // Usamos noise de BEM baixa frequência (0.6) para criar 1 ou 2 grandes massas (Supercontinente)
  // E somamos um pouco de detalhe (3.0) para não ficar liso demais nas bordas
  float tectonicPangea = snoise(vMapUv * 0.6) * 0.8 + fbm(vMapUv * 3.0) * 0.2; 
  
  // Mistura os dois mundos baseado na evolução
  // No começo (0.0), é o caos. No fim (1.0), é a ordem (Pangea).
  float tectonic = mix(tectonicHadean, tectonicPangea, smoothstep(0.2, 0.8, uEvolution));
  
  // Altura final
  // Hadeano: 0.5 é o limite. Terra: precisamos de valores negativos para o mar.
  // Ajuste fino: -0.45 para garantir que tenhamos bastante oceano ao redor da Pangeia
  float heightMap = smoothstep(0.4, 0.6, tectonic) - 0.45; // Vai de -0.45 (Mar Profundo) a 0.55 (Terra)

  // --- LÓGICA DE CHEIAS E VAZANTES (OCEANO vs MAGMA) ---
  // O nível do mar "sobe" conforme a água condensa (uEvolution > 0.5)
  // Mas no Hadeano, o "mar" é magma.
  
  // --- FASE 1: VISUAL DO MAGMA (Hadeano) ---
  vec2 flowUV = vMapUv * 3.5; 
  vec2 q = vec2(fbm(flowUV + uTime * 0.03), fbm(flowUV + vec2(5.2, 1.3) - uTime * 0.03));
  vec2 r = vec2(fbm(flowUV + 4.0 * q - uTime * 0.03), fbm(flowUV + 4.0 * q + uTime * 0.03));
  float fluid = fbm(flowUV + 3.0 * r);

  vec3 cooledLava = vec3(0.05, 0.0, 0.05); // Rocha escura quase preta
  vec3 hotLava = vec3(0.8, 0.1, 0.0);
  vec3 superHot = vec3(1.0, 0.6, 0.1);
  
  vec3 magmaVisual = mix(cooledLava, hotLava, smoothstep(0.2, 0.8, fluid));
  magmaVisual = mix(magmaVisual, superHot, smoothstep(0.8, 1.0, fluid)); 

  // --- FASE 2: VISUAL DA TERRA (Pangea + Oceano) ---
  vec3 earthColor = getBiomeColor(heightMap * 2.0, vMapUv); 

  // --- LÓGICA DE TRANSIÇÃO (CRUCIAL) ---
  // 1. O Magma esfria e vira rocha (cooledLava)
  // 2. A água começa a cobrir as partes baixas (height < 0)
  
  // Se height < 0 (Lowlands):
  // Hadeano: É Magma. 
  // Transição: Magma esfria -> Rocha -> Água Azul.
  
  float isLowland = 1.0 - smoothstep(0.0, 0.05, heightMap); // 1 se for 'mar', 0 se for terra
  
  // Cor do "Mar" (pode ser magma ou água)
  vec3 oceanColor = mix(vec3(0.0, 0.05, 0.2), vec3(0.0, 0.35, 0.6), smoothstep(-0.5, 0.0, heightMap));
  
  // Mistura Magma -> Oceano nas partes baixas
  // Até 0.4 de evolução, é puramente magma. De 0.4 a 0.7, esfria para rocha. De 0.7 a 1.0, vira água.
  float magmaToWater = smoothstep(0.5, 0.9, uEvolution);
  vec3 lowlandColor = mix(magmaVisual, oceanColor, magmaToWater);
  
  // Cor final das partes Altas (Continentes)
  // Sempre rocha no começo, depois vira bioma (verde/marrom)
  vec3 highlandColor = mix(magmaVisual * 0.5, earthColor, uEvolution); // Magma escuro vira terra
  
  // Mistura final baseado na altura
  diffuseColor.rgb = mix(highlandColor, lowlandColor, isLowland);

  // Ajuste sutil: Se for muito Hadeano, deixa tudo com um brilho avermelhado
  diffuseColor.rgb += vec3(0.1, 0.02, 0.0) * (1.0 - uEvolution) * fluid;
`;

// 3. EMISSIVE LOGIC (A luz deve apagar na Terra Moderna)
export const crustEmissiveLogic = `
  #include <emissivemap_fragment>
  
  // Recálculo do fluido para o brilho Hadeano
  vec2 flowUVEmit = vMapUv * 3.5;
  vec2 qEmit = vec2(fbm(flowUVEmit + uTime * 0.03), fbm(flowUVEmit - uTime * 0.03));
  vec2 rEmit = vec2(fbm(flowUVEmit + 4.0 * qEmit - uTime * 0.03), fbm(flowUVEmit + 4.0 * qEmit + uTime * 0.03));
  float fluidEmit = fbm(flowUVEmit + 3.0 * rEmit);

  // Usamos a mesma lógica de altura do mapa principal para saber onde é "mar de lava"
  float tectonicEmitHadean = fbm(vMapUv * 3.0 + uTime * 0.01);
  float tectonicEmitPangea = fbm(vMapUv * 1.0 + vec2(1.2, 3.4));
  float tectonicEmit = mix(tectonicEmitHadean, tectonicEmitPangea, smoothstep(0.2, 0.8, uEvolution));
  
  // Máscara de onde é "chão firme" (não emite luz) vs "lava/mar" (emite luz no começo)
  float crustMaskEmit = smoothstep(0.45, 0.55, tectonicEmit);
  float lavaArea = 1.0 - crustMaskEmit; // 1 onde é baixo (lava), 0 onde é alto (crosta)
  
  float heatMap = smoothstep(0.4, 0.9, fluidEmit);
  
  vec3 lavaGlow = vec3(0.8, 0.1, 0.0);
  vec3 coreGlow = vec3(1.0, 0.5, 0.1);
  vec3 finalGlow = mix(lavaGlow, coreGlow, heatMap);

  // Intensidade Hadeana: Brilha apenas onde é "lavaArea"
  vec3 hadeanEmission = finalGlow * lavaArea * (heatMap * heatMap) * 4.0;

  // Transição: A emissão deve morrer quando a água chega
  // uEvolution 0.0 -> 0.6: Brilha. 0.6 -> 0.8: Esfria. 0.8 -> 1.0: Apagado (Água)
  float emissionFade = 1.0 - smoothstep(0.4, 0.8, uEvolution); 
  
  totalEmissiveRadiance = hadeanEmission * emissionFade;
`;

// 4. ROUGHNESS LOGIC (Novo! Água brilha, terra não)
// Precisamos injetar isso no fragment shader também para controlar o reflexo
export const crustRoughnessLogic = `
  #include <roughnessmap_fragment>
  
  // Recalcula tectônica para saber onde é mar
  float tectonicRoughHadean = fbm(vMapUv * 3.0 + uTime * 0.01);
  float tectonicRoughPangea = fbm(vMapUv * 1.0 + vec2(1.2, 3.4));
  float tectonicRough = mix(tectonicRoughHadean, tectonicRoughPangea, smoothstep(0.2, 0.8, uEvolution));

  float isOcean = 1.0 - smoothstep(0.45, 0.55, tectonicRough);

  // Hadeano: Lava é parcialmente brilhante, Rocha é fosca
  float hadeanRough = mix(0.9, 0.4, isOcean); // Se for baixo (lava), brilha um pouco
  
  // Terra: Oceano é muito liso (0.1), Terra é áspera (0.9)
  float earthRough = mix(0.9, 0.1, isOcean); // Se for oceano, roughness cai
  
  roughnessFactor = mix(hadeanRough, earthRough, uEvolution);
`;
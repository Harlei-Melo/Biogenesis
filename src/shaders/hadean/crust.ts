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
  
  // --- GERAÇÃO DO TERRENO (Compartilhado entre as eras) ---
  // Mantemos o mesmo noise para que os continentes da Terra sejam as placas antigas
  float tectonic = fbm(vMapUv * 0.5 + uTime * 0.002); 
  
  // Recalibramos a altura para a Terra
  // Hadeano: 0.5 é o limite. Terra: precisamos de valores negativos para o mar.
  float heightMap = smoothstep(0.4, 0.6, tectonic) - 0.5; // Vai de -0.5 (Mar) a 0.5 (Terra)

  // --- FASE 1: LÓGICA HADEANA (O que já tínhamos) ---
  vec2 flowUV = vMapUv * 3.5; 
  vec2 q = vec2(fbm(flowUV + uTime * 0.03), fbm(flowUV + vec2(5.2, 1.3) - uTime * 0.03));
  vec2 r = vec2(fbm(flowUV + 4.0 * q - uTime * 0.03), fbm(flowUV + 4.0 * q + uTime * 0.03));
  float fluid = fbm(flowUV + 3.0 * r);

  vec3 cooledLava = vec3(0.05, 0.0, 0.0);
  vec3 hotLava = vec3(0.8, 0.1, 0.0);
  vec3 superHot = vec3(1.0, 0.6, 0.1);
  
  vec3 magmaVisual = mix(cooledLava, hotLava, smoothstep(0.2, 0.8, fluid));
  magmaVisual = mix(magmaVisual, superHot, smoothstep(0.8, 1.0, fluid)); 
  vec3 rockVisual = diffuseColor.rgb * 0.15; 
  float crustMask = smoothstep(0.45, 0.55, tectonic);
  vec3 hadeanColor = mix(magmaVisual, rockVisual, crustMask);

  // --- FASE 2: LÓGICA TERRA MODERNA (Nova) ---
  // Usamos o 'heightMap' calculado a partir das placas tectônicas
  vec3 earthColor = getBiomeColor(heightMap * 2.0, vMapUv); // Multiplica altura para contraste

  // --- TRANSIÇÃO ---
  // Mistura o Inferno com o Paraíso baseado no slider uEvolution
  diffuseColor.rgb = mix(hadeanColor, earthColor, uEvolution);
`;

// 3. EMISSIVE LOGIC (A luz deve apagar na Terra Moderna)
export const crustEmissiveLogic = `
  #include <emissivemap_fragment>
  
  // Recálculo do fluido para o brilho Hadeano
  vec2 flowUVEmit = vMapUv * 3.5;
  vec2 qEmit = vec2(fbm(flowUVEmit + uTime * 0.03), fbm(flowUVEmit - uTime * 0.03));
  vec2 rEmit = vec2(fbm(flowUVEmit + 4.0 * qEmit - uTime * 0.03), fbm(flowUVEmit + 4.0 * qEmit + uTime * 0.03));
  float fluidEmit = fbm(flowUVEmit + 3.0 * rEmit);

  float tectonicEmit = fbm(vMapUv * 0.5 + uTime * 0.002);
  float crustMaskEmit = smoothstep(0.45, 0.55, tectonicEmit);
  float glowArea = 1.0 - crustMaskEmit;
  float heatMap = smoothstep(0.4, 0.9, fluidEmit);
  
  vec3 lavaGlow = vec3(0.8, 0.1, 0.0);
  vec3 coreGlow = vec3(1.0, 0.5, 0.1);
  vec3 finalGlow = mix(lavaGlow, coreGlow, heatMap);

  // Intensidade Hadeana
  vec3 hadeanEmission = finalGlow * glowArea * (heatMap * heatMap) * 4.0;

  // Intensidade Terra (Zero emissão natural, exceto talvez cidades à noite no futuro)
  vec3 earthEmission = vec3(0.0);

  // Transição: A emissão deve morrer mais rápido que a cor muda (esfria antes de virar grama)
  float emissionFade = clamp(1.0 - uEvolution * 2.0, 0.0, 1.0); // Apaga nos primeiros 50%
  
  totalEmissiveRadiance = hadeanEmission * emissionFade;
`;

// 4. ROUGHNESS LOGIC (Novo! Água brilha, terra não)
// Precisamos injetar isso no fragment shader também para controlar o reflexo
export const crustRoughnessLogic = `
  #include <roughnessmap_fragment>
  
  // Recalcula tectônica para saber onde é mar
  float tectonicRough = fbm(vMapUv * 0.5 + uTime * 0.002); 
  float isOcean = 1.0 - smoothstep(0.45, 0.55, tectonicRough);

  // Hadeano: Tudo é meio áspero (0.8), exceto a lava fluida (0.4)
  float hadeanRough = 0.8;
  
  // Terra: Oceano é liso (0.1), Terra é áspera (0.9)
  float earthRough = mix(0.9, 0.2, isOcean); // Se for oceano, roughness cai
  
  roughnessFactor = mix(hadeanRough, earthRough, uEvolution);
`;
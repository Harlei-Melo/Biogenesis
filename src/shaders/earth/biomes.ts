// Lógica Procedural para criar uma Terra realista sem texturas
export const biomeLogic = `
  // Paleta de Cores da Terra
  vec3 colorDeepOcean = vec3(0.0, 0.05, 0.2);
  vec3 colorShallowOcean = vec3(0.0, 0.35, 0.6);
  vec3 colorBeach = vec3(0.76, 0.70, 0.50); // Areia
  vec3 colorForest = vec3(0.05, 0.25, 0.05); // Verde Escuro
  vec3 colorGrass = vec3(0.2, 0.5, 0.1);     // Verde Claro
  vec3 colorRock = vec3(0.3, 0.25, 0.2);     // Marrom Montanha
  vec3 colorSnow = vec3(0.95, 0.95, 1.0);    // Branco Neve

  // Função para determinar a cor baseada na altura e posição
  vec3 getBiomeColor(float height, vec2 uv) {
      
      // 1. ÁGUA (Onde antes era Lava Profunda)
      if (height < 0.0) {
          // Gradiente de profundidade
          return mix(colorShallowOcean, colorDeepOcean, smoothstep(-0.1, -0.3, height));
      }
      
      // 2. TERRA FIRME (Onde antes era Crosta)
      
      // Latitude (Polos são frios)
      // uv.y vai de 0 (Polo Sul) a 1 (Polo Norte). O Equador é 0.5.
      float distToEquator = abs(uv.y - 0.5) * 2.0; // 0 no equador, 1 nos polos
      float temperature = 1.0 - distToEquator; // Quente no equador, frio nos polos
      
      // Adiciona um pouco de ruído na temperatura para não ficar uma linha reta
      temperature += (snoise(uv * 10.0) * 0.1);

      vec3 landColor = colorGrass;

      // Lógica de Altitute
      if (height < 0.05) {
          landColor = colorBeach; // Praias nas bordas
      } else if (height < 0.3) {
          landColor = mix(colorForest, colorGrass, temperature); // Florestas
      } else if (height < 0.6) {
          landColor = colorRock; // Montanhas expostas
      } else {
          landColor = colorSnow; // Picos nevados
      }

      // Lógica de Neve nos Polos (independente da altura)
      if (temperature < 0.2) {
          landColor = mix(landColor, colorSnow, smoothstep(0.3, 0.0, temperature));
      }

      return landColor;
  }
`;
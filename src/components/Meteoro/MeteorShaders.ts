export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = `
  uniform float iTime;
  uniform vec3 uCameraPos;
  uniform mat4 uInverseViewProj;
  uniform float uAtmosphere;
  varying vec2 vUv;

  // 🔴 MODO CINEMÁTICO: RTX 4070 UNLOCKED 🔴
  #define MAX_STEPS 120       
  #define SURF_DIST 0.02     
  #define STEP_SIZE 0.25      

  #define PI 3.14159265359

  // ---------------------------------------------------------
  // FUNÇÕES MATEMÁTICAS E ROTAÇÃO 3D
  // ---------------------------------------------------------
  mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
  }

  // ---------------------------------------------------------
  // NOISE DE ALTA FIDELIDADE (Simplex 3D Pesado)
  // ---------------------------------------------------------
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  // FBM de 4 oitavas para detalhes extremos na fumaça e rocha
  float fbm(vec3 p) {
      float f = 0.0; float amp = 0.5;
      for(int i=0; i<4; i++) { f += amp * snoise(p); p *= 2.0; amp *= 0.5; }
      return f;
  }
  
  float fbm_abs(vec3 p) {
      float f = 0.0; float amp = 0.5;
      for(int i=0; i<4; i++) { f += amp * abs(snoise(p)); p *= 2.0; amp *= 0.5; }
      return f;
  }

  // Escala de temperatura Blackbody (Realista)
  vec3 blackbody(float heat) {
      vec3 darkSmoke = vec3(0.01, 0.01, 0.01);
      vec3 darkRed = vec3(0.5, 0.02, 0.0);
      vec3 fireOrange = vec3(1.0, 0.4, 0.0);
      vec3 coreYellow = vec3(1.0, 0.9, 0.3);
      vec3 whiteHot = vec3(1.0, 1.0, 1.0);

      vec3 c = mix(darkSmoke, darkRed, smoothstep(0.0, 0.3, heat));
      c = mix(c, fireOrange, smoothstep(0.3, 0.6, heat));
      c = mix(c, coreYellow, smoothstep(0.6, 0.9, heat));
      c = mix(c, whiteHot, smoothstep(0.9, 1.0, heat));
      return c;
  }

  vec3 rockCenter = vec3(0.0, 0.0, -5.0);

  // ---------------------------------------------------------
  // MÓDULO DA ROCHA DUAL (Com Rotação)
  // ---------------------------------------------------------
  float getRockDist(vec3 p, out vec3 localPos) {
      localPos = p - rockCenter;
      
      // 🔴 ROTAÇÃO DINÂMICA DA PEDRA 🔴
      // O asteroide capota no próprio eixo enquanto cai!
      localPos.xy *= rot(iTime * 1.5);
      localPos.xz *= rot(iTime * 0.8);
      
      float d = length(localPos) - 2.5; 
      // Deformação da rocha acompanhando o giro
      d += fbm(localPos * 1.5) * 1.2; 
      return d;
  }

  vec3 getNormal(vec3 p, out vec3 localPos) {
      vec2 e = vec2(0.02, 0.0); 
      vec3 dummy;
      vec3 n = getRockDist(p, dummy) - vec3(
          getRockDist(p-e.xyy, dummy), 
          getRockDist(p-e.yxy, dummy), 
          getRockDist(p-e.yyx, dummy)
      );
      return normalize(n);
  }

  void main() {
      vec4 target = uInverseViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
      vec3 rd = normalize(target.xyz / target.w - uCameraPos);
      vec3 ro = uCameraPos;

      vec4 col = vec4(0.0); 
      
      // Otimização base mantida para focar o poder no núcleo
      vec3 oc = ro - (rockCenter + vec3(0.0, 0.0, 12.0));
      float b = dot(oc, rd);
      float c_sph = dot(oc, oc) - 32.0*32.0;
      float h = b*b - c_sph;
      
      if (h >= 0.0) {
          float t = -b - sqrt(h);
          if(t < 0.0) t = 0.0;
          
          t += fract(sin(dot(rd.xy, vec2(12.9898,78.233))) * 43758.5453) * STEP_SIZE;

          for(int i = 0; i < MAX_STEPS; i++) {
              vec3 p = ro + rd * t;
              vec3 localRotatedPos;

              // ======= A ROCHA COM FÍSICA =======
              float dRock = getRockDist(p, localRotatedPos);
              if (dRock < SURF_DIST) {
                  vec3 n = getNormal(p, localRotatedPos);
                  vec3 lightDir = normalize(vec3(-1.0, 1.0, -2.0));
                  float diff = max(0.0, dot(n, lightDir));

                  // O magma acompanha a rotação da pedra
                  float cracks = fbm_abs(localRotatedPos * 1.5 + vec3(0.0, 0.0, iTime));
                  vec3 magma = blackbody(cracks * 1.2);
                  vec3 rockCol = mix(vec3(0.02) * diff, magma, smoothstep(0.4, 0.7, cracks));
                  
                  // Mach Cone Frontal (Sempre aponta pra frente, independente da rotação)
                  float bowShock = smoothstep(-4.0, -7.0, (p.z - rockCenter.z));
                  rockCol += vec3(1.0, 0.8, 0.5) * bowShock * diff * 1.5;

                  vec4 rColor = vec4(rockCol, 1.0);
                  rColor.rgb *= rColor.a;
                  col += rColor * (1.0 - col.a);
                  break; 
              }

              // ======= VOLUMETRIA DE ALTA DEFINIÇÃO =======
              vec3 localP = p - rockCenter; 
              float radius = length(localP.xy);
              float tailPos = localP.z; 

              if (tailPos > -4.0 && tailPos < 35.0) {
                  // Formato dinâmico do jato
                  float cone = smoothstep(5.0 + tailPos * 0.4, 0.0, radius); 
                  float fade = smoothstep(35.0, 5.0, tailPos); 
                  float envelope = cone * fade;

                  if (envelope > 0.01) {
                      // Turbulência de 4 Oitavas rasgando a fumaça
                      vec3 flow = localP * vec3(0.4, 0.4, 0.15) - vec3(0.0, 0.0, iTime * 18.0);
                      float turb = fbm_abs(flow);
                      
                      // Densidade volumétrica com veios grossos
                      float density = smoothstep(0.1, 0.8, envelope - turb * 0.7) * 1.5;

                      if (density > 0.0) {
                          // O calor morre conforme vai pra trás ou para as bordas (radius)
                          float heat = (density * 2.0) - (tailPos * 0.06) - (radius * 0.2); 
                          
                          vec3 fireCol = blackbody(clamp(heat, 0.0, 1.0));
                          
                          // Self-Shadowing Fake: A fumaça fica mais preta nas bordas grossas
                          float alpha = density * 0.12; 
                          
                          vec4 pCol = vec4(fireCol, alpha); 
                          pCol.rgb *= pCol.a;
                          col += pCol * (1.0 - col.a);
                      }
                  }
              }

              if (col.a > 0.99) break; 
              t += STEP_SIZE;
          }
      }

      vec3 bg = vec3(0.01, 0.01, 0.02);
      col.rgb += bg * (1.0 - col.a);

      vec3 atmosColor = vec3(0.4, 0.7, 1.0);
      col.rgb = mix(col.rgb, col.rgb + atmosColor, uAtmosphere * 0.5);
      col.rgb = mix(col.rgb, vec3(1.0), smoothstep(0.7, 1.0, uAtmosphere));

      gl_FragColor = vec4(col.rgb, 1.0);
  }
`;

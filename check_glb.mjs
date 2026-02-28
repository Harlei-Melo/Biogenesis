/**
 * check_glb.mjs — Inspeciona TODOS os GLBs da pasta models
 * e imprime suas dimensões reais (bounding box).
 * * Uso: node check_glb.mjs
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Minimal GLB parser — extrai o JSON chunk e calcula bounding box das posições dos meshes
function parseGLB(buffer) {
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );

  // GLB Header: magic(4) + version(4) + length(4)
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546c67) throw new Error("Not a GLB file");

  // Chunk 0: JSON
  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  if (jsonChunkType !== 0x4e4f534a) throw new Error("First chunk is not JSON");

  const jsonBytes = buffer.slice(20, 20 + jsonChunkLength);
  const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));

  // Binary chunk
  const binOffset = 20 + jsonChunkLength;
  let binData = null;
  if (binOffset < buffer.length) {
    const binChunkLength = view.getUint32(binOffset, true);
    binData = buffer.slice(binOffset + 8, binOffset + 8 + binChunkLength);
  }

  // Find all POSITION accessors and compute overall bounding box
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  let meshCount = 0;
  let animCount = (gltf.animations || []).length;
  let animNames = (gltf.animations || []).map((a) => a.name || "unnamed");

  if (gltf.meshes && gltf.accessors && gltf.bufferViews && binData) {
    for (const mesh of gltf.meshes) {
      for (const prim of mesh.primitives) {
        meshCount++;
        const posIdx = prim.attributes?.POSITION;
        if (posIdx === undefined) continue;

        const accessor = gltf.accessors[posIdx];

        // Use accessor min/max if available (fastest)
        if (accessor.min && accessor.max) {
          minX = Math.min(minX, accessor.min[0]);
          minY = Math.min(minY, accessor.min[1]);
          minZ = Math.min(minZ, accessor.min[2]);
          maxX = Math.max(maxX, accessor.max[0]);
          maxY = Math.max(maxY, accessor.max[1]);
          maxZ = Math.max(maxZ, accessor.max[2]);
        }
      }
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const depth = maxZ - minZ;

  return {
    meshCount,
    animCount,
    animNames,
    bbox: {
      min: [minX.toFixed(2), minY.toFixed(2), minZ.toFixed(2)],
      max: [maxX.toFixed(2), maxY.toFixed(2), maxZ.toFixed(2)],
      width: width.toFixed(2),
      height: height.toFixed(2),
      depth: depth.toFixed(2),
    },
  };
}

const modelsDir = join(process.cwd(), "public", "models");

// Lê todos os arquivos .glb da pasta
const files = readdirSync(modelsDir).filter((f) => f.endsWith(".glb"));

console.log("=== GLB BOUNDING BOX INSPECTOR ===\n");
console.log(
  "Model".padEnd(50),
  "W(x)".padEnd(10),
  "H(y)".padEnd(10),
  "D(z)".padEnd(10),
  "Meshes",
  "Anims",
  "AnimNames",
);
console.log("-".repeat(130));

// Iteramos dinamicamente sobre todos os arquivos encontrados
for (const name of files) {
  const filePath = join(modelsDir, name);
  try {
    const buf = readFileSync(filePath);
    const info = parseGLB(buf);
    console.log(
      name.padEnd(50),
      info.bbox.width.padEnd(10),
      info.bbox.height.padEnd(10),
      info.bbox.depth.padEnd(10),
      String(info.meshCount).padEnd(7),
      String(info.animCount).padEnd(6),
      info.animNames.join(", "),
    );
  } catch (e) {
    console.log(name.padEnd(50), `ERROR: ${e.message}`);
  }
}

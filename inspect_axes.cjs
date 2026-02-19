/**
 * inspect_axes.cjs — Determine the forward axis of each GLB model.
 *
 * Parses the GLB binary, reads mesh accessor data from the BIN chunk,
 * computes the bounding box, and reports which axis is longest (the
 * head-to-tail axis for fish models).
 */
const fs = require('fs');
const modelsDir = 'c:/Projetos/Web/Abiogenese/public/models';
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb'));

files.forEach(file => {
    const buf = fs.readFileSync(modelsDir + '/' + file);

    // ── Parse GLB header ─────────────────────────────────────────────────
    const jsonChunkLen = buf.readUInt32LE(12);
    const jsonChunkType = buf.readUInt32LE(16);
    if (jsonChunkType !== 0x4E4F534A) { console.log(file + ': bad JSON chunk'); return; }

    let gltf;
    try { gltf = JSON.parse(buf.slice(20, 20 + jsonChunkLen).toString('utf8')); }
    catch (e) { console.log(file + ': parse error'); return; }

    // ── Locate BIN chunk ─────────────────────────────────────────────────
    const binChunkOffset = 20 + jsonChunkLen;
    const binChunkLen = buf.readUInt32LE(binChunkOffset);
    const binChunkType = buf.readUInt32LE(binChunkOffset + 4);
    if (binChunkType !== 0x004E4942) { console.log(file + ': bad BIN chunk'); return; }
    const binStart = binChunkOffset + 8;

    // ── Gather POSITION accessor min/max from GLTF JSON ─────────────────
    // Most exporters write min/max on the accessor, which avoids parsing
    // the entire vertex buffer.
    const accessors = gltf.accessors || [];
    const meshes = gltf.meshes || [];

    let globalMin = [Infinity, Infinity, Infinity];
    let globalMax = [-Infinity, -Infinity, -Infinity];
    let foundPosition = false;

    meshes.forEach(mesh => {
        (mesh.primitives || []).forEach(prim => {
            const posIdx = prim.attributes && prim.attributes.POSITION;
            if (posIdx === undefined) return;
            const acc = accessors[posIdx];
            if (!acc || !acc.min || !acc.max) return;
            foundPosition = true;
            for (let i = 0; i < 3; i++) {
                if (acc.min[i] < globalMin[i]) globalMin[i] = acc.min[i];
                if (acc.max[i] > globalMax[i]) globalMax[i] = acc.max[i];
            }
        });
    });

    if (!foundPosition) {
        // Fallback: read raw vertex data from the first POSITION accessor
        meshes.forEach(mesh => {
            (mesh.primitives || []).forEach(prim => {
                const posIdx = prim.attributes && prim.attributes.POSITION;
                if (posIdx === undefined || foundPosition) return;
                const acc = accessors[posIdx];
                if (!acc) return;
                const bv = (gltf.bufferViews || [])[acc.bufferView];
                if (!bv) return;

                const offset = binStart + (bv.byteOffset || 0) + (acc.byteOffset || 0);
                const stride = bv.byteStride || 12; // 3 floats * 4 bytes
                const count = acc.count || 0;

                for (let v = 0; v < count; v++) {
                    const base = offset + v * stride;
                    const x = buf.readFloatLE(base);
                    const y = buf.readFloatLE(base + 4);
                    const z = buf.readFloatLE(base + 8);
                    if (x < globalMin[0]) globalMin[0] = x;
                    if (y < globalMin[1]) globalMin[1] = y;
                    if (z < globalMin[2]) globalMin[2] = z;
                    if (x > globalMax[0]) globalMax[0] = x;
                    if (y > globalMax[1]) globalMax[1] = y;
                    if (z > globalMax[2]) globalMax[2] = z;
                }
                foundPosition = true;
            });
        });
    }

    if (!foundPosition) { console.log(file + ': no POSITION data'); return; }

    const size = [
        globalMax[0] - globalMin[0],
        globalMax[1] - globalMin[1],
        globalMax[2] - globalMin[2],
    ];
    const center = [
        (globalMin[0] + globalMax[0]) / 2,
        (globalMin[1] + globalMax[1]) / 2,
        (globalMin[2] + globalMax[2]) / 2,
    ];

    const longestIdx = size.indexOf(Math.max(...size));
    const axes = ['X', 'Y', 'Z'];
    const longestAxis = axes[longestIdx];

    // For fish, "forward" is typically toward +longest when center > 0, or -longest
    const forwardSign = center[longestIdx] >= 0 ? '+' : '-';

    // Check if any nodes have rotation/translation that might alter orientation
    const rootNodes = (gltf.scenes && gltf.scenes[0] && gltf.scenes[0].nodes) || [];
    const rootTransforms = rootNodes.map(ni => {
        const n = (gltf.nodes || [])[ni];
        return {
            name: n.name || ('node_' + ni),
            rotation: n.rotation || [0, 0, 0, 1],
            translation: n.translation || [0, 0, 0],
            scale: n.scale || [1, 1, 1],
        };
    });

    console.log('=== ' + file + ' ===');
    console.log('  BBox min:    [' + globalMin.map(v => v.toFixed(3)).join(', ') + ']');
    console.log('  BBox max:    [' + globalMax.map(v => v.toFixed(3)).join(', ') + ']');
    console.log('  Size (XYZ):  [' + size.map(v => v.toFixed(3)).join(', ') + ']');
    console.log('  Center:      [' + center.map(v => v.toFixed(3)).join(', ') + ']');
    console.log('  Longest axis: ' + forwardSign + longestAxis + ' (size=' + size[longestIdx].toFixed(3) + ')');
    console.log('  Root nodes:');
    rootTransforms.forEach(t => {
        console.log('    ' + t.name + '  rot:' + JSON.stringify(t.rotation) + '  pos:' + JSON.stringify(t.translation));
    });
    console.log('');
});

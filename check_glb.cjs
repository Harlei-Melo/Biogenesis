const fs = require('fs');
const modelsDir = 'c:/Projetos/Web/Abiogenese/public/models';

// Run sequentially with clear separators
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb'));

files.forEach(function (file) {
    const fullPath = modelsDir + '/' + file;
    const buf = fs.readFileSync(fullPath);

    const jsonChunkLen = buf.readUInt32LE(12);
    const jsonChunkType = buf.readUInt32LE(16);
    if (jsonChunkType !== 0x4E4F534A) { console.log(file + ': bad chunk'); return; }

    let gltf;
    try { gltf = JSON.parse(buf.slice(20, 20 + jsonChunkLen).toString('utf8')); }
    catch (e) { console.log(file + ': parse error'); return; }

    const anims = gltf.animations || [];
    const meshes = (gltf.meshes || []).length;
    const skins = (gltf.skins || []).length;
    const mats = (gltf.materials || []).length;
    const nodes = (gltf.nodes || []).length;
    const sizeKB = Math.round(buf.length / 1024);

    var lines = [];
    lines.push('=== ' + file + ' (' + sizeKB + ' KB) ===');
    lines.push('  Meshes:' + meshes + '  Skins:' + skins + '  Materials:' + mats + '  Nodes:' + nodes);
    if (anims.length === 0) {
        lines.push('  !! NO ANIMATIONS !!');
    } else {
        anims.forEach(function (a, i) {
            var dur = null;
            try { var acc = gltf.accessors[a.samplers[0].input]; if (acc && acc.max) dur = acc.max[0]; } catch (e) { }
            var durStr = dur !== null ? (' | dur:' + dur.toFixed(2) + 's') : '';
            lines.push('  anim[' + i + '] "' + (a.name || 'unnamed') + '" ch:' + a.channels.length + durStr);
        });
    }
    console.log(lines.join('\n'));
    console.log('');
});

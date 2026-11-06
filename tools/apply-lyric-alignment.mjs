// Apply a reviewed offline alignment. Does not embed any lyric text.
// node tools/apply-lyric-alignment.mjs [.cache/ctc-final-review.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = JSON.parse(fs.readFileSync(path.resolve(root, process.argv[2] || '.cache/ctc-final-review.json'), 'utf8'));
// CTC emits after the initial consonant. Stable phrases and mid-channel attacks
// show about 0.30–0.35s latency; this is a model correction, not an audio offset.
const emissionDelay = 0.32;
// These five attacks were also inspected against the actual audio envelope.
const reviewed = { 18: { 2: [211.43, 212.34, 216.52, 217.04, 218.18] } };
const output = {};
for (const [index, line] of Object.entries(input.lines)) {
  const charStarts = line.parts.map((part, j) => reviewed[index]?.[j] || part.map(char => +(char[0] - emissionDelay).toFixed(3)));
  const partEnds = line.parts.map((part, j) => {
    const last = charStarts[j].at(-1);
    const end = Math.max(line.legacyEnds[j], last + 0.5);
    // A long pause inside a phrase was sometimes misidentified as a boundary.
    // The next phrase's actual first character is the upper bound for this end.
    return +(j + 1 < charStarts.length ? Math.min(end, charStarts[j + 1][0] - 0.08) : end).toFixed(3);
  });
  if (partEnds.some((end, j) => end <= charStarts[j].at(-1))) throw new Error(`Invalid phrase end: ${index}`);
  output[index] = { charStarts, partEnds };
}
if (Object.keys(output).length !== 18) throw new Error('Expected all 18 lyric lines; review before replacing timing');
const source = '// 绝对秒数的逐字起唱与分段结尾。由本机音频 CTC 对齐，补偿发射延迟，重点长音经波形核对。\n'
  + '// 歌词文字仍只读取 assets/lyrics.lrc；这是模型估算与波形校准，未声称逐字人工试听验收。\n'
  + 'MV.LYRIC_TIMING = ' + JSON.stringify(output, null, 2) + ';\n';
fs.writeFileSync(path.join(root, 'js/lyric-timing.js'), source);
console.log(`Applied ${Object.keys(output).length} lines / ${Object.values(output).reduce((n, line) => n + line.charStarts.flat().length, 0)} character starts.`);

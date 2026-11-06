// 检查工程文件里有没有夹带歌词原文：凡是与 assets/lyrics.lrc 里歌词连续重合 3 个字以上的地方都列出来（只报位置，不打印歌词）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lrc = fs.readFileSync(path.join(root, 'assets/lyrics.lrc'), 'utf8').split(/\r?\n/)
  .map(l => /^\[\d+:\d+(?:\.\d+)?\](.*)$/.exec(l)).filter(Boolean).map(m => m[1].trim())
  .filter(t => t && !/[:：]/.test(t));
const grams = new Set();
for (const line of lrc) { const s = line.replace(/\s+/g, ''); for (let i = 0; i + 3 <= s.length; i++) grams.add(s.slice(i, i + 3)); }
// 片名本身可以出现
const allow = new Set(['世界赠', '界赠予', '赠予我', '予我的']);
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['js/shots-1.js', 'js/shots-2.js', 'js/shots-3.js', 'js/shots-4.js', 'js/lrc.js', 'js/type.js', 'js/director.js', 'js/app.js', 'README.md', 'docs/分镜脚本.md', 'index.html'];
let total = 0;
for (const f of files) {
  const p = path.join(root, f); if (!fs.existsSync(p)) continue;
  fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    const s = line.replace(/\s+/g, '');
    let hit = 0;
    for (let k = 0; k + 3 <= s.length; k++) { const g = s.slice(k, k + 3); if (grams.has(g) && !allow.has(g)) hit++; }
    if (hit) { total++; console.log(`${f}:${i + 1}  重合 ${hit} 处`); }
  });
}
console.log(total ? `共 ${total} 行需要改` : '没有夹带歌词');

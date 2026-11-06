// 粗估每句歌词各分段的起止（中置声道减侧声道 ≈ 人声），写入 .cache/vocal-phrase-estimate.js
// 能量分段会漏判长音里的弱起音；不再覆盖已经校准的逐字播放时间。
// 只输出数字（相对句首的拍数），不含歌词文字。用法：node tools/vocal-timing.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SR = 16000, STEP = 0.05;
const dec = af => { const b = execFileSync('D:/oopz/ffmpeg.exe', ['-hide_banner', '-loglevel', 'error', '-i', path.join(root, 'assets/song.flac'), '-af', af, '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
const mid = dec('pan=mono|c0=0.5*c0+0.5*c1,highpass=f=250,lowpass=f=3500');
const side = dec('pan=mono|c0=0.5*c0-0.5*c1,highpass=f=250,lowpass=f=3500');
const n = Math.floor(mid.length / SR / STEP);
const db = (a, i) => { let s = 0; const i0 = Math.floor(i * STEP * SR), i1 = Math.floor((i + 1) * STEP * SR); for (let k = i0; k < i1; k++) s += a[k] * a[k]; return 10 * Math.log10(s / (i1 - i0) + 1e-12); };
const voc = new Float32Array(n);
for (let i = 0; i < n; i++) voc[i] = db(mid, i) - db(side, i);
// 平滑
const sm = Float32Array.from(voc, (_, i) => { let s = 0, c = 0; for (let d = -2; d <= 2; d++) { if (voc[i + d] != null) { s += voc[i + d]; c++; } } return s / c; });

// 节拍
const src = fs.readFileSync(path.join(root, 'js/audio-data.js'), 'utf8');
const A = JSON.parse(src.slice(src.indexOf('MV.audioData = ') + 15, src.lastIndexOf('}') + 1));
const beats = A.beatsDP;
const beatAt = t => { if (t <= beats[0]) return (t - beats[0]) / (beats[1] - beats[0]); let i = 0; while (i + 1 < beats.length && beats[i + 1] <= t) i++; if (i + 1 >= beats.length) return i + (t - beats[i]) / A.beatLen; return i + (t - beats[i]) / (beats[i + 1] - beats[i]); };

// 歌词：只取时间和每段字数
const lrc = fs.readFileSync(path.join(root, 'assets/lyrics.lrc'), 'utf8').split(/\r?\n/).map(l => /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(l)).filter(Boolean).map(m => ({ t: +m[1] * 60 + +m[2], text: m[3].trim() }));
const lines = [];
for (const r of lrc) { if (/[:：]/.test(r.text) && !lines.length) continue; if (r.text) lines.push({ t: r.t, parts: r.text.split(/\s+/).filter(Boolean).map(p => [...p].length) }); }

// 自动切分不准的几句：按能量曲线手动给出各段的起点与唱的长度（秒）
const MANUAL = {
  3: { starts: [41.05, 43.0, 44.95], sing: [1.2, 1.05, 1.5] },
  11: { starts: [130.05, 132.0, 133.95], sing: [1.05, 1.05, 2.8] },
  12: { starts: [138.25, 141.7], sing: [2.55, 2.9] },
};
const out = {};
lines.forEach((L, li) => {
  if (MANUAL[li + 1]) {
    const M = MANUAL[li + 1], b0 = beatAt(L.t);
    out[li + 1] = { starts: M.starts.map(s => +(beatAt(s) - b0).toFixed(2)), sing: M.starts.map((s, k) => +(beatAt(s + M.sing[k]) - beatAt(s)).toFixed(2)) };
    console.log(`第 ${String(li + 1).padStart(2)} 句 ${L.t.toFixed(2)}s  手动：` + M.starts.map((s, k) => `${s.toFixed(2)}–${(s + M.sing[k]).toFixed(2)}`).join('  '));
    return;
  }
  const next = li + 1 < lines.length ? lines[li + 1].t : L.t + 30;
  const i0 = Math.floor((L.t - 0.4) / STEP), i1 = Math.floor((next - 0.1) / STEP);
  // 有声帧：差值 > 阈值
  const on = []; for (let i = i0; i < i1; i++) on.push(sm[i] > 6);
  // 段：连续有声，合并 < 0.3 秒的空隙，去掉 < 0.2 秒的碎片
  let segs = [], cur = null;
  on.forEach((v, k) => { const t = (i0 + k) * STEP; if (v) { if (!cur) cur = [t, t]; cur[1] = t + STEP; } else if (cur) { segs.push(cur); cur = null; } });
  if (cur) segs.push(cur);
  const merged = [];
  for (const s of segs) { const p = merged[merged.length - 1]; if (p && s[0] - p[1] < 0.3) p[1] = s[1]; else merged.push(s.slice()); }
  segs = merged.filter(s => s[1] - s[0] > 0.2);
  if (!segs.length) return;
  // 用最大的 (段数-1) 个空隙把有声区分成歌词的各段
  const np = L.parts.length;
  const gaps = segs.slice(1).map((s, k) => ({ k, g: s[0] - segs[k][1] })).sort((a, b) => b.g - a.g).slice(0, np - 1).map(g => g.k).sort((a, b) => a - b);
  const groups = []; let st = 0;
  for (const k of gaps) { groups.push([segs[st][0], segs[k][1]]); st = k + 1; }
  groups.push([segs[st][0], segs[segs.length - 1][1]]);
  const b0 = beatAt(L.t);
  out[li + 1] = { starts: groups.map(g => +(beatAt(g[0]) - b0).toFixed(2)), sing: groups.map(g => +(beatAt(g[1]) - beatAt(g[0])).toFixed(2)) };
  console.log(`第 ${String(li + 1).padStart(2)} 句 ${L.t.toFixed(2)}s  分段 ${np}：` + groups.map(g => `${g[0].toFixed(2)}–${g[1].toFixed(2)}`).join('  ') + (groups.length < np ? '  ⚠ 段数不足' : ''));
});
fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
fs.writeFileSync(path.join(root, '.cache/vocal-phrase-estimate.js'), `// 人声能量粗估分段（单位：拍，相对句首）。不含歌词文字，不作逐字卡点依据
MV.LYRIC_TIMING = ${JSON.stringify(out)};
`);

// 从 assets/song.flac 提取音频特征（60 帧/秒）和节拍网格，写入 js/audio-data.js。
// 用法：node tools/analyze.mjs [ffmpeg 路径]
// 只在更换音频时需要重跑；画面运行时不依赖 ffmpeg。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ffmpeg = process.argv[2] || process.env.FFMPEG || 'D:/oopz/ffmpeg.exe';
const SR = 22050, FPS = 60;

const pcm = execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', path.join(root, 'assets/song.flac'),
  '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const dur = x.length / SR;

function fft(re, im) {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a), h = len >> 1;
    for (let i = 0; i < N; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < h; k++) {
        const p = i + k, q = p + h;
        const br = re[q] * cr - im[q] * ci, bi = re[q] * ci + im[q] * cr;
        re[q] = re[p] - br; im[q] = im[p] - bi; re[p] += br; im[p] += bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// ---- 1. 起音包络（节拍用，约 172 帧/秒） ----
const WIN = 2048, HOP = 128, ORATE = SR / HOP;
const hann = Float32Array.from({ length: WIN }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (WIN - 1)));
const nO = Math.floor((x.length - WIN) / HOP);
const onset = new Float32Array(nO), lowOn = new Float32Array(nO);
const kmax = Math.round(8000 * WIN / SR), kLow = Math.round(200 * WIN / SR);
let prev = new Float32Array(WIN / 2);
{
  const re = new Float32Array(WIN), im = new Float32Array(WIN);
  for (let f = 0; f < nO; f++) {
    const c = f * HOP;
    for (let i = 0; i < WIN; i++) { re[i] = x[c + i] * hann[i]; im[i] = 0; }
    fft(re, im);
    const mag = new Float32Array(WIN / 2);
    let fl = 0, lo = 0;
    for (let k = 1; k < kmax; k++) {
      mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = mag[k] - prev[k];
      if (d > 0) { fl += d; if (k < kLow) lo += d; }
    }
    onset[f] = fl; lowOn[f] = lo; prev = mag;
  }
}
// 去掉缓慢变化的趋势，只留突起
function detrend(a, w) {
  const out = new Float32Array(a.length); let s = 0; const q = [];
  for (let i = 0; i < a.length; i++) {
    q.push(a[i]); s += a[i]; if (q.length > w) s -= q.shift();
    out[i] = Math.max(0, a[i] - s / q.length);
  }
  return out;
}
const env = detrend(onset, Math.round(ORATE * 0.4));
{ let m = 0; for (const v of env) m = Math.max(m, v); for (let i = 0; i < env.length; i++) env[i] /= m; }

// ---- 2. 速度：起音包络自相关 ----
const acf = [];
for (let bpm = 50; bpm <= 160; bpm += 0.25) {
  const lag = ORATE * 60 / bpm;
  let s = 0, n = 0;
  for (let i = 0; i + lag * 4 < env.length; i += 2) {
    const a = env[i];
    const v1 = env[Math.round(i + lag)], v2 = env[Math.round(i + 2 * lag)], v4 = env[Math.round(i + 4 * lag)];
    s += a * (v1 + 0.5 * v2 + 0.25 * v4); n++;
  }
  acf.push({ bpm, s: s / n });
}
const top = [...acf].sort((a, b) => b.s - a.s);
const picks = [];
for (const c of top) { if (picks.every(p => Math.abs(p.bpm - c.bpm) > 2)) picks.push(c); if (picks.length >= 6) break; }
const BPM = +(process.env.BPM || picks[0].bpm);

// ---- 3. 节拍相位：动态规划（Ellis 2007） ----
const period = ORATE * 60 / BPM;
const score = new Float32Array(env.length), back = new Int32Array(env.length).fill(-1);
for (let i = 0; i < env.length; i++) {
  let best = 0, bi = -1;
  const lo = Math.round(i - period * 1.5), hi = Math.round(i - period * 0.66);
  for (let j = Math.max(0, lo); j <= hi; j++) {
    const r = Math.log((i - j) / period);
    const v = score[j] - 120 * r * r;
    if (v > best || bi < 0) { best = v; bi = j; }
  }
  score[i] = env[i] + (bi >= 0 ? best : 0); back[i] = bi;
}
let end = 0;
for (let i = env.length - Math.round(period * 2); i < env.length; i++) if (score[i] > score[end]) end = i;
const beatsDP = [];
for (let i = end; i >= 0; i = back[i]) beatsDP.unshift((i * HOP + WIN / 2) / SR);

// 用直线拟合得到等间隔网格（录音室版速度稳定），并报告偏差
let sx = 0, sy = 0, sxx = 0, sxy = 0;
beatsDP.forEach((t, k) => { sx += k; sy += t; sxx += k * k; sxy += k * t; });
const nb = beatsDP.length;
const slope = (nb * sxy - sx * sy) / (nb * sxx - sx * sx), icpt = (sy - slope * sx) / nb;
let dev = 0; beatsDP.forEach((t, k) => { dev = Math.max(dev, Math.abs(t - (icpt + slope * k))); });

// ---- 4. 画面用特征（60 帧/秒） ----
const n = Math.floor(dur * FPS);
const W2 = 1024;
const hann2 = Float32Array.from({ length: W2 }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (W2 - 1)));
const bin = hz => Math.max(1, Math.min(W2 / 2 - 1, Math.round(hz * W2 / SR)));
const B = { bass: [bin(30), bin(160)], mid: [bin(300), bin(3000)], high: [bin(3000), bin(10000)] };
const raw = { energy: new Float32Array(n), bass: new Float32Array(n), mid: new Float32Array(n), high: new Float32Array(n), onset: new Float32Array(n) };
{
  const re = new Float32Array(W2), im = new Float32Array(W2);
  for (let f = 0; f < n; f++) {
    const c = Math.round(f / FPS * SR) - W2 / 2;
    let s = 0;
    for (let i = 0; i < W2; i++) { const v = x[c + i] || 0; s += v * v; re[i] = v * hann2[i]; im[i] = 0; }
    fft(re, im);
    const band = ([a, b]) => { let e = 0; for (let k = a; k < b; k++) e += re[k] * re[k] + im[k] * im[k]; return 10 * Math.log10(e + 1e-9); };
    raw.energy[f] = 10 * Math.log10(s / W2 + 1e-12);
    raw.bass[f] = band(B.bass); raw.mid[f] = band(B.mid); raw.high[f] = band(B.high);
    raw.onset[f] = env[Math.min(env.length - 1, Math.round(f / FPS * ORATE))] || 0;
  }
}
function pct(a, p) { const s = Array.from(a).filter(v => v > -80).sort((u, v) => u - v); return s[Math.floor(p * (s.length - 1))]; }
const out = {};
for (const [k, a] of Object.entries(raw)) {
  const lo = k === 'onset' ? 0 : pct(a, 0.05), hi = k === 'onset' ? pct(a, 0.995) : pct(a, 0.995);
  const q = new Uint8Array(n);
  for (let i = 0; i < n; i++) q[i] = Math.round(255 * Math.min(1, Math.max(0, (a[i] - lo) / (hi - lo))));
  out[k] = Buffer.from(q).toString('base64');
}

const js = `// 由 tools/analyze.mjs 生成，勿手改。来源：assets/song.flac（${dur.toFixed(3)} 秒）
window.MV = window.MV || {};
MV.audioData = ${JSON.stringify({ fps: FPS, frames: n, duration: +dur.toFixed(3), bpm: BPM, beat0: +icpt.toFixed(4), beatLen: +slope.toFixed(5), beatsDP: beatsDP.map(t => +t.toFixed(3)), ...out })};
`;
fs.writeFileSync(path.join(root, 'js/audio-data.js'), js);

console.log('时长', dur.toFixed(3), 's；帧数', n);
console.log('速度候选：', picks.map(p => `${p.bpm} (${p.s.toFixed(4)})`).join('，'));
console.log(`采用 ${BPM} BPM；DP 节拍 ${nb} 个；拟合 第 0 拍 ${icpt.toFixed(3)} s，每拍 ${slope.toFixed(4)} s（${(60 / slope).toFixed(2)} BPM），最大偏差 ${(dev * 1000).toFixed(0)} ms`);
console.log('前 12 拍：', beatsDP.slice(0, 12).map(t => t.toFixed(2)).join(' '));

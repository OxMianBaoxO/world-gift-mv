// 分析人声大致位置：用 ffmpeg 做中置声道提取（左右相减去掉宽声场伴奏后，再看 200–4000Hz 能量），打印每句的能量曲线
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const SR = 16000;
const pcm = execFileSync('D:/oopz/ffmpeg.exe', ['-hide_banner', '-loglevel', 'error', '-i', 'assets/song.flac', '-af', 'pan=mono|c0=0.5*c0+0.5*c1,highpass=f=250,lowpass=f=3500', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const side = execFileSync('D:/oopz/ffmpeg.exe', ['-hide_banner', '-loglevel', 'error', '-i', 'assets/song.flac', '-af', 'pan=mono|c0=0.5*c0-0.5*c1,highpass=f=250,lowpass=f=3500', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const y = new Float32Array(side.buffer, side.byteOffset, side.byteLength / 4);
const env = (a, t0, t1, step) => { const out = []; for (let t = t0; t < t1; t += step) { let s = 0; const i0 = Math.floor(t * SR), i1 = Math.floor((t + step) * SR); for (let i = i0; i < i1; i++) s += a[i] * a[i]; out.push(10 * Math.log10(s / (i1 - i0) + 1e-12)); } return out; };
const [t0, t1, step] = process.argv.slice(2).map(Number);
const m = env(x, t0, t1, step), s = env(y, t0, t1, step);
let line = '';
m.forEach((v, i) => { const d = v - s[i]; const bar = '#'.repeat(Math.max(0, Math.round((d + 2) * 1.2))); line += `${(t0 + i * step).toFixed(2)} 中${v.toFixed(0).padStart(4)} 差${d.toFixed(1).padStart(5)} ${bar}\n`; });
console.log(line);

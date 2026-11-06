// 核心工具：数学、缓动、随机、噪声、颜色、节拍时间轴。所有画面只依赖时间 t，可任意跳转
window.MV = window.MV || {};
(() => {
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, x) => clamp((x - a) / (b - a));
  const fract = x => x - Math.floor(x);
  const smooth = t => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => smooth(inv(a, b, x));
  // 0→1→0 的窗：a 到 b 淡入，c 到 d 淡出
  const win = (x, a, b, c, d) => sstep(a, b, x) * (1 - sstep(c, d, x));

  const ease = {
    linear: t => t,
    inQuad: t => t * t,
    outQuad: t => t * (2 - t),
    inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
    inCubic: t => t * t * t,
    outCubic: t => 1 - (1 - t) ** 3,
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
    outQuart: t => 1 - (1 - t) ** 4,
    inOutQuart: t => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
    outQuint: t => 1 - (1 - t) ** 5,
    inOutQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
    inExpo: t => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
    outExpo: t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
    inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
    inSine: t => 1 - Math.cos((t * Math.PI) / 2),
    outSine: t => Math.sin((t * Math.PI) / 2),
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
    inOutBack: (t, s = 1.70158 * 1.525) => (t < 0.5 ? ((2 * t) ** 2 * ((s + 1) * 2 * t - s)) / 2 : ((2 * t - 2) ** 2 * ((s + 1) * (t * 2 - 2) + s) + 2) / 2),
    outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  };
  // CSS 同款三次贝塞尔缓动
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t;
    const dx = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 6; i++) { const e = sx(t) - x, d = dx(t); if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; }
      return sy(clamp(t));
    };
  }
  ease.film = bezier(0.65, 0, 0.35, 1);      // 镜头运动：慢起慢停
  ease.snap = bezier(0.2, 0.9, 0.1, 1);      // MG 弹入：快出缓停
  ease.drift = bezier(0.33, 0, 0.2, 1);

  // 用缓动在 [a, b] 时间内从 v0 到 v1
  const tween = (t, a, b, v0, v1, e = ease.inOutCubic) => lerp(v0, v1, e(inv(a, b, t)));

  // ---- 确定性随机 ----
  function hash(n, seed = 0) {
    let h = (n | 0) * 374761393 + (seed | 0) * 668265263;
    h = (h ^ (h >>> 13)) * 1274126177;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---- 噪声 ----
  const P = new Uint8Array(512);
  { const r = rng(1234), p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const grad2 = (h, x, y) => { const g = h & 7; const u = g < 4 ? x : y, v = g < 4 ? y : x; return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v); };
  function noise2(x, y) {
    const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const aa = P[P[xi] + yi], ab = P[P[xi] + yi + 1], ba = P[P[xi + 1] + yi], bb = P[P[xi + 1] + yi + 1];
    const x1 = lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u), x2 = lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v) * 0.35; // 约 -1..1
  }
  const noise1 = x => noise2(x, 0.5);
  function fbm(x, y, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); f *= 2; a *= 0.5; } return s; }

  // ---- 颜色 ----
  const cache = new Map();
  function rgb(c) {
    if (Array.isArray(c)) return c;
    let v = cache.get(c);
    if (!v) {
      const m = /^rgba?\(([^)]+)\)/.exec(c);
      if (m) { const p = m[1].split(',').map(Number); v = [p[0], p[1], p[2]]; }
      else { const h = c.replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, q => q + q) : h, 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
      if (cache.size > 4000) cache.clear();
      cache.set(c, v);
    }
    return v;
  }
  const mixc = (a, b, t) => { const A = rgb(a), B = rgb(b); return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]; };
  // 缓存用的颜色键：量化到 32 级，避免渐变色每帧生成新的缓存项
  const colorKey = c => { const v = rgb(c); const q = x => Math.min(255, Math.round(x / 8) * 8); return `#${[q(v[0]), q(v[1]), q(v[2])].map(n => n.toString(16).padStart(2, '0')).join('')}`; };
  const css = (c, a = 1) => { const v = rgb(c); return a >= 1 ? `rgb(${v[0] | 0},${v[1] | 0},${v[2] | 0})` : `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${clamp(a).toFixed(3)})`; };
  const mix = (a, b, t, alpha = 1) => css(mixc(a, b, clamp(t)), alpha);
  // 多段渐变取色：stops = [[0,'#..'],[0.5,'#..'],[1,'#..']]
  function ramp(stops, t) {
    t = clamp(t);
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; return mixc(ca, cb, (t - a) / (b - a || 1)); }
    return rgb(stops[stops.length - 1][1]);
  }

  // ---- 节拍时间轴（用 DP 跟踪到的真实节拍，乐队录音速度有细微浮动） ----
  const A = MV.audioData;
  const beats = A.beatsDP;
  function beatTime(k) {
    const n = beats.length;
    if (k <= 0) return beats[0] + k * (beats[1] - beats[0]);
    if (k >= n - 1) return beats[n - 1] + (k - n + 1) * A.beatLen;
    const i = Math.floor(k), f = k - i;
    return beats[i] + (beats[i + 1] - beats[i]) * f;
  }
  function beatAt(t) {
    const n = beats.length;
    if (t <= beats[0]) return (t - beats[0]) / (beats[1] - beats[0]);
    if (t >= beats[n - 1]) return n - 1 + (t - beats[n - 1]) / A.beatLen;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (beats[m] <= t) lo = m; else hi = m; }
    return lo + (t - beats[lo]) / (beats[hi] - beats[lo]);
  }
  // 第 m 小节的起点：小节从第 2 拍起（4/4，重拍在 k ≡ 2 mod 4）
  const bar = m => beatTime(4 * m + 2);
  const barAt = t => (beatAt(t) - 2) / 4;

  // 音频特征：0..1，线性插值
  const feats = {};
  for (const k of ['energy', 'bass', 'mid', 'high', 'onset']) {
    const s = atob(A[k]), a = new Float32Array(s.length);
    for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) / 255;
    feats[k] = a;
  }
  function feat(k, t) {
    const a = feats[k], x = t * A.fps, i = Math.floor(x);
    if (i < 0 || i >= a.length - 1) return 0;
    return lerp(a[i], a[i + 1], x - i);
  }
  // 平滑后的特征（前后 w 秒平均）
  function featAvg(k, t, w = 0.25) { let s = 0, n = 0; for (let d = -w; d <= w; d += 1 / 30) { s += feat(k, t + d); n++; } return s / n; }
  // 拍点脉冲：每拍开头 1，指数衰减
  const pulse = (t, sharp = 6) => Math.exp(-sharp * fract(beatAt(t)) * A.beatLen);

  Object.assign(MV, { W, H, TAU, clamp, lerp, inv, fract, smooth, sstep, win, ease, bezier, tween, hash, rng, noise1, noise2, fbm, rgb, mixc, colorKey, css, mix, ramp, beatTime, beatAt, bar, barAt, feat, featAvg, pulse });
})();

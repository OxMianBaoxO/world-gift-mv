// 绘图库：形状、渐变、光晕、天空、星空、云、山、粒子、烟花、声波、风线、光束、海
(() => {
  const { W, H, TAU, clamp, lerp, inv, fract, smooth, sstep, ease, hash, rng, noise1, noise2, fbm, rgb, css, mix, mixc } = MV;
  const D = {};

  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  D.makeCanvas = makeCanvas;

  // ---------- 基本形状 ----------
  D.circle = (ctx, x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, Math.max(0, r), 0, TAU); };
  // 两端半径不同的胶囊（四肢）
  D.capsule = (ctx, x1, y1, r1, x2, y2, r2) => {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    if (d < 1e-3 || d <= Math.abs(r1 - r2)) { D.circle(ctx, x1, y1, Math.max(r1, r2)); return; }
    const a = Math.atan2(dy, dx), b = Math.acos((r1 - r2) / d);
    ctx.moveTo(x1 + r1 * Math.cos(a + b), y1 + r1 * Math.sin(a + b));
    ctx.arc(x1, y1, r1, a + b, a - b + TAU, false);
    ctx.arc(x2, y2, r2, a - b, a + b, false);
    ctx.closePath();
  };
  // 经过各点的平滑曲线（Catmull-Rom 转贝塞尔）
  D.smoothPath = (ctx, pts, closed = false, k = 1) => {
    const n = pts.length;
    if (n < 2) return;
    const P = i => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
    ctx.moveTo(pts[0][0], pts[0][1]);
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k / 6, p1[1] + (p2[1] - p0[1]) * k / 6, p2[0] - (p3[0] - p1[0]) * k / 6, p2[1] - (p3[1] - p1[1]) * k / 6, p2[0], p2[1]);
    }
    if (closed) ctx.closePath();
  };
  D.poly = (ctx, pts, closed = true) => { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (closed) ctx.closePath(); };
  D.lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); for (const [o, c, a] of stops) g.addColorStop(clamp(o), css(c, a ?? 1)); return g; };
  D.rad = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); for (const [o, c, a] of stops) g.addColorStop(clamp(o), css(c, a ?? 1)); return g; };
  D.fill = (ctx, style, fn) => { ctx.beginPath(); fn(); ctx.fillStyle = style; ctx.fill(); };

  // 只画路径的一部分（MG 描线动画）：f0..f1 为起止比例
  D.strokePart = (ctx, pts, f0, f1) => {
    if (f1 <= f0 || pts.length < 2) return;
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = L[L.length - 1], a = f0 * tot, b = f1 * tot;
    const at = s => { let i = 1; while (i < L.length - 1 && L[i] < s) i++; const u = (s - L[i - 1]) / (L[i] - L[i - 1] || 1); return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u), i]; };
    const s = at(a), e = at(b);
    ctx.moveTo(s[0], s[1]);
    for (let i = s[2]; i < e[2]; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(e[0], e[1]);
  };
  // 采样一条三次贝塞尔为点列
  D.bez = (p0, p1, p2, p3, n = 32) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  };

  // ---------- 光晕（预渲染贴图，叠加混合） ----------
  const glowBase = (() => {
    const c = makeCanvas(256, 256), g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    for (let i = 0; i <= 16; i++) { const x = i / 16; gr.addColorStop(x, `rgba(255,255,255,${(Math.exp(-x * x * 5.5) * (1 - x)).toFixed(4)})`); }
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return c;
  })();
  const tinted = new Map();
  D.glowSprite = color => {
    const key = MV.colorKey(color);
    let c = tinted.get(key);
    if (!c) {
      if (tinted.size > 400) tinted.clear();
      c = makeCanvas(256, 256); const g = c.getContext('2d');
      g.drawImage(glowBase, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = key; g.fillRect(0, 0, 256, 256);
      tinted.set(key, c);
    }
    return c;
  };
  D.glow = (ctx, x, y, r, color = '#ffffff', a = 1, op = 'lighter') => {
    if (a <= 0.002 || r <= 0.5) return;
    const pa = ctx.globalAlpha, po = ctx.globalCompositeOperation;
    ctx.globalAlpha = pa * clamp(a); ctx.globalCompositeOperation = op;
    ctx.drawImage(D.glowSprite(color), x - r, y - r, 2 * r, 2 * r);
    ctx.globalAlpha = pa; ctx.globalCompositeOperation = po;
  };
  // 星芒：细长的十字光
  D.flare = (ctx, x, y, r, color, a = 1, rot = 0) => {
    if (a <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const pa = ctx.globalAlpha; ctx.globalAlpha = pa * a; ctx.globalCompositeOperation = 'lighter';
    const s = D.glowSprite(color);
    ctx.drawImage(s, -r, -r * 0.06, 2 * r, r * 0.12);
    ctx.drawImage(s, -r * 0.06, -r, r * 0.12, 2 * r);
    ctx.restore();
  };

  // ---------- 天空 ----------
  D.sky = (ctx, stops, y0 = 0, y1 = H, x0 = -200, w = W + 400) => {
    ctx.fillStyle = D.lin(ctx, 0, y0, 0, y1, stops);
    ctx.fillRect(x0, Math.min(y0, -400), w, Math.max(y1, H + 400) - Math.min(y0, -400));
  };

  // 星星：位置确定，闪烁。region = [x, y, w, h]
  D.stars = (ctx, t, o = {}) => {
    const { seed = 1, n = 300, region = [0, 0, W, H], color = '#fff6e8', alpha = 1, size = 1, twinkle = 1, fadeY = null, appear = null } = o;
    const [rx, ry, rw, rh] = region;
    // 每颗星贴同一张圆点图：同一纹理的连续贴图 GPU 会合批，比几百条圆弧路径快得多
    const dot = D.dotSprite(color), pa = ctx.globalAlpha;
    const vis = viewRect(ctx);
    for (let i = 0; i < n; i++) {
      const x = rx + hash(i, seed) * rw, y = ry + hash(i, seed + 7) * rh;
      if (vis && (x < vis[0] || x > vis[2] || y < vis[1] || y > vis[3])) continue;
      const m = Math.pow(hash(i, seed + 3), 2.6);          // 亮度分布：大多数暗
      let a = alpha * (0.25 + 0.75 * m) * (1 - twinkle * 0.45 * (0.5 + 0.5 * Math.sin(t * (1 + hash(i, seed + 5) * 3) + hash(i, seed + 9) * TAU)));
      if (fadeY) a *= sstep(fadeY[1], fadeY[0], y);
      if (appear) a *= clamp((appear(i, x, y)));
      if (a <= 0.02) continue;
      const r = size * (0.6 + 1.9 * m) * 1.25;
      ctx.globalAlpha = pa * a;
      ctx.drawImage(dot, x - r, y - r, r * 2, r * 2);
      if (m > 0.78) { ctx.globalAlpha = pa; D.glow(ctx, x, y, r * 7, color, a * 0.5); if (m > 0.92) D.flare(ctx, x, y, r * 11, color, a * 0.55); }
    }
    ctx.globalAlpha = pa;
  };
  // 圆点贴图（星星、雪花、尘埃共用）
  const dots = new Map();
  D.dotSprite = color => {
    const key = MV.colorKey(color);
    let c = dots.get(key);
    if (!c) {
      c = makeCanvas(32, 32); const g = c.getContext('2d');
      const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, key); gr.addColorStop(0.62, key); gr.addColorStop(1, css(key, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
      dots.set(key, c);
    }
    return c;
  };
  // 当前变换下可见的世界坐标范围（粗略，用来跳过画面外的粒子）
  function viewRect(ctx) {
    const m = ctx.getTransform(); if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6) return null;
    const cw = ctx.canvas.width, ch = ctx.canvas.height, pad = 40;
    const x0 = (-m.e) / m.a - pad / m.a, x1 = (cw - m.e) / m.a + pad / m.a, y0 = (-m.f) / m.d - pad / m.d, y1 = (ch - m.f) / m.d + pad / m.d;
    return [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)];
  }
  D.viewRect = viewRect;

  // 银河：一次性预渲染
  let milky = null;
  D.milkyWay = (ctx, x, y, w, h, rot, a = 1) => {
    if (!milky) {
      const cw = 1024, ch = 384; milky = makeCanvas(cw, ch); const g = milky.getContext('2d');
      const img = g.createImageData(cw, ch), d = img.data;
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
        const u = i / cw, v = j / ch;
        const band = Math.exp(-(((v - 0.5 - 0.06 * Math.sin(u * 5)) / 0.2) ** 2));
        const n = fbm(u * 7, v * 3, 5) * 0.5 + 0.5, dust = fbm(u * 18 + 3, v * 8, 4);
        let k = band * Math.pow(clamp(n * 1.3 - 0.2), 1.6) * (1 - 0.7 * clamp(dust * 2 - 0.2) * band);
        const p = (j * cw + i) * 4;
        const c = mixc('#7b6cc9', '#f4b8c8', clamp(n * 1.4 - 0.3));
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = clamp(k) * 255 * 0.85;
      }
      g.putImageData(img, 0, 0);
      const r = rng(77);
      for (let i = 0; i < 2600; i++) { const u = r(), v = 0.5 + (r() - 0.5) * 0.55 * Math.sqrt(r()); g.fillStyle = `rgba(255,250,240,${(0.2 + 0.8 * r() ** 3).toFixed(2)})`; g.fillRect(u * cw, v * ch, r() < 0.06 ? 2 : 1, 1); }
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a; ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(milky, -w / 2, -h / 2, w, h); ctx.restore();
  };

  // 月亮：phase 0 新月 → 1 满月（弯月用两个圆相减）
  D.moon = (ctx, x, y, r, phase, color = '#f6efd8', a = 1, rot = -0.5) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a;
    D.glow(ctx, 0, 0, r * 5, color, 0.25 + 0.2 * phase);
    ctx.beginPath();
    if (phase >= 0.999) ctx.arc(0, 0, r, 0, TAU);
    else {
      // 两圆相减：被减的圆在左边偏 d，交点之间取右侧弧 + 内弧
      const d = Math.max(0.02, 2 * phase) * r, rb = r * 1.02;
      const ix = (rb * rb - r * r - d * d) / (2 * d), iy = Math.sqrt(Math.max(0, r * r - ix * ix));
      const al = Math.atan2(iy, ix), be = Math.atan2(iy, ix + d);
      ctx.arc(0, 0, r, -al, al, false);
      ctx.arc(-d, 0, rb, be, -be, true);
      ctx.closePath();
    }
    ctx.fillStyle = css(color); ctx.fill();
    ctx.restore();
  };

  // ---------- 云（MG 扁平云：圆弧叠成，底部平） ----------
  D.cloudPath = (ctx, x, y, w, h, seed = 1, flat = true) => {
    const r = rng(seed), n = 4 + Math.floor(r() * 3);
    const bumps = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, cx = x + (u - 0.5) * w * 0.86 + (r() - 0.5) * w * 0.06;
      const rr = h * (0.42 + 0.5 * Math.sin(Math.PI * u) * (0.7 + 0.5 * r()));
      bumps.push([cx, y - rr * 0.55, rr]);
    }
    for (const [cx, cy, rr] of bumps) { ctx.moveTo(cx + rr, cy); ctx.arc(cx, cy, rr, 0, TAU); }
    if (flat) { const l = x - w / 2, rgt = x + w / 2, hb = h * 0.42; ctx.moveTo(l + hb, y); ctx.arc(l + hb, y - hb, hb, Math.PI / 2, Math.PI * 1.5); ctx.lineTo(rgt - hb, y - 2 * hb); ctx.arc(rgt - hb, y - hb, hb, -Math.PI / 2, Math.PI / 2); ctx.closePath(); }
  };
  // 云做成贴图缓存（形状只和种子、尺寸、颜色有关），每帧只贴一次图
  const cloudCache = new Map();
  D.cloud = (ctx, x, y, w, h, o = {}) => {
    const { seed = 1, top = '#ffffff', bottom = '#dfe6f5', a = 1, shade = 0.18, edge = null } = o;
    if (a <= 0.003) return;
    const qw = Math.round(w / 8) * 8, qh = Math.round(h / 8) * 8;
    const key = [seed, qw, qh, MV.colorKey(top), MV.colorKey(bottom), shade.toFixed(2), edge ? edge.join() : ''].join('|');
    let c = cloudCache.get(key);
    if (!c) {
      if (cloudCache.size > 160) cloudCache.clear();
      const pad = 8, cw = Math.ceil(qw * 1.08) + pad * 2, ch = Math.ceil(qh * 1.55) + pad * 2;
      c = makeCanvas(cw, ch); const g = c.getContext('2d');
      const cx = cw / 2, cy = ch - pad - qh * 0.05;
      g.beginPath(); D.cloudPath(g, cx, cy, qw, qh, seed);
      g.fillStyle = D.lin(g, 0, cy - qh * 1.5, 0, cy, [[0, top], [1, bottom]]); g.fill();
      if (shade > 0) { // 底部一层暗面，增加体积
        g.save(); g.clip(); g.beginPath(); D.cloudPath(g, cx + qw * 0.04, cy + qh * 0.16, qw * 0.98, qh * 0.9, seed);
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = css(bottom, 1); g.globalAlpha = Math.min(1, shade * 2);
        g.fillRect(cx - qw, cy - qh * 0.4, qw * 2, qh); g.restore();
      }
      if (edge) { g.beginPath(); D.cloudPath(g, cx, cy, qw, qh, seed); g.strokeStyle = css(edge[0], edge[1]); g.lineWidth = edge[2] || 2; g.stroke(); }
      c.ox = cx; c.oy = cy;
      cloudCache.set(key, c);
    }
    const pa = ctx.globalAlpha; ctx.globalAlpha = pa * a;
    ctx.drawImage(c, x - c.ox * (w / qw), y - c.oy * (h / qh), c.width * (w / qw), c.height * (h / qh));
    ctx.globalAlpha = pa;
  };

  // ---------- 山脊、地形 ----------
  // y(x) = base - amp * f(x)，f 用分形噪声；ox 为视差偏移
  D.ridge = (ctx, o) => {
    const { base, amp, freq = 0.002, seed = 0, ox = 0, x0 = -100, x1 = W + 100, step = 6, fill, sharp = 0, bottom = H + 400, oct = 4 } = o;
    ctx.beginPath(); ctx.moveTo(x0, bottom);
    for (let x = x0; x <= x1 + step; x += step) {
      let n = fbm((x + ox) * freq + seed * 13.1, seed * 7.7, oct) * 0.5 + 0.5;
      if (sharp) n = lerp(n, 1 - Math.abs(fbm((x + ox) * freq * 0.7 + seed, 3.3, 3)) * 1.6, sharp);
      ctx.lineTo(x, base - amp * n);
    }
    ctx.lineTo(x1 + step, bottom); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  };
  D.ridgeY = (x, o) => { const { base, amp, freq = 0.002, seed = 0, ox = 0, oct = 4 } = o; return base - amp * (fbm((x + ox) * freq + seed * 13.1, seed * 7.7, oct) * 0.5 + 0.5); };

  // ---------- 粒子：雪、雨、萤火、花瓣、尘 ----------
  // 闭式运动：任意时刻可直接算出位置
  D.snow = (ctx, t, o = {}) => {
    const { n = 160, seed = 3, color = '#ffffff', alpha = 1, wind = 20, speed = 1, region = [-100, -100, W + 200, H + 200], depth = [0.2, 1], blurFront = true, freeze = null } = o;
    const [rx, ry, rw, rh] = region;
    // 每片雪贴同一张圆点图（GPU 合批）；最近的几片用光晕贴图，像虚焦
    const dot = D.dotSprite(color), pa = ctx.globalAlpha;
    for (let i = 0; i < n; i++) {
      const z = lerp(depth[0], depth[1], hash(i, seed + 1));
      const tt = freeze ? freeze(i, t) : t;
      const sp = (28 + 50 * z) * speed;
      const x = rx + fract(hash(i, seed) + (wind * z * tt) / rw + 0.02 * Math.sin(tt * (0.6 + hash(i, seed + 2)) + i)) * rw;
      const y = ry + fract(hash(i, seed + 4) + (sp * tt) / rh) * rh;
      const r = 1 + 3.4 * z * z, a = alpha * (0.35 + 0.65 * z);
      if (blurFront && z > 0.85) { ctx.globalAlpha = pa; D.glow(ctx, x, y, r * 4, color, a * 0.9, 'source-over'); continue; }
      ctx.globalAlpha = pa * a;
      ctx.drawImage(dot, x - r * 1.25, y - r * 1.25, r * 2.5, r * 2.5);
    }
    ctx.globalAlpha = pa;
  };
  D.rain = (ctx, t, o = {}) => {
    const { n = 220, seed = 5, color = '#c9d6ff', alpha = 0.5, angle = 0.18, speed = 1, len = 40, region = [-200, -200, W + 400, H + 400] } = o;
    const [rx, ry, rw, rh] = region;
    ctx.strokeStyle = css(color); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const z = 0.3 + 0.7 * hash(i, seed + 1), sp = (900 + 700 * z) * speed;
      const y = ry + fract(hash(i, seed + 2) + (sp * t) / rh) * rh;
      const x = rx + fract(hash(i, seed) + (y - ry) * Math.tan(angle) / rw) * rw;
      ctx.globalAlpha = alpha * z; ctx.lineWidth = 0.6 + 1.6 * z;
      const l = len * z;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(angle) * l, y - Math.cos(angle) * l); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  D.fireflies = (ctx, t, o = {}) => {
    const { n = 40, seed = 9, color = '#e9ff9e', alpha = 1, region = [0, 0, W, H], size = 1 } = o;
    const [rx, ry, rw, rh] = region;
    for (let i = 0; i < n; i++) {
      const ph = hash(i, seed) * 100;
      const x = rx + (hash(i, seed + 1) + 0.06 * noise1(t * 0.15 + ph)) * rw;
      const y = ry + (hash(i, seed + 2) + 0.08 * noise1(t * 0.12 + ph + 50)) * rh;
      const blink = Math.pow(0.5 + 0.5 * Math.sin(t * (1.2 + hash(i, seed + 3) * 1.5) + ph), 3);
      const a = alpha * (0.15 + 0.85 * blink), r = size * (2 + 2.5 * hash(i, seed + 4));
      D.glow(ctx, x, y, r * 9, color, a * 0.55);
      ctx.globalAlpha = a; ctx.fillStyle = '#fbffe6'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  // 花瓣/叶子：一片扁椭圆，翻转
  D.petal = (ctx, x, y, s, rot, flip, color, a = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, 0.25 + 0.75 * Math.abs(flip)); ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.9, s, 0); ctx.quadraticCurveTo(0, s * 0.9, -s, 0);
    ctx.fillStyle = color; ctx.fill(); ctx.restore();
  };
  D.petals = (ctx, t, o = {}) => {
    const { n = 50, seed = 11, colors = ['#f6b8c4', '#f9d3da'], alpha = 1, wind = 120, fall = 60, size = 9, region = [-200, -200, W + 400, H + 400], spin = 1 } = o;
    const [rx, ry, rw, rh] = region;
    for (let i = 0; i < n; i++) {
      const z = 0.4 + 0.6 * hash(i, seed + 1);
      const x = rx + fract(hash(i, seed) + (wind * z * t) / rw + 0.03 * Math.sin(t * 0.7 + i)) * rw;
      const y = ry + fract(hash(i, seed + 2) + (fall * z * t) / rh + 0.02 * Math.sin(t * 1.3 + i * 2)) * rh;
      D.petal(ctx, x, y, size * z, t * spin * (0.8 + hash(i, seed + 3)) + i, Math.sin(t * 2 * spin + i), colors[i % colors.length], alpha * (0.5 + 0.5 * z));
    }
  };
  D.dust = (ctx, t, o = {}) => {
    const { n = 60, seed = 13, color = '#fff2d6', alpha = 0.5, region = [0, 0, W, H], drift = 8 } = o;
    const [rx, ry, rw, rh] = region;
    ctx.fillStyle = css(color);
    for (let i = 0; i < n; i++) {
      const x = rx + fract(hash(i, seed) + noise1(t * 0.05 + i) * 0.05 + t * drift / rw * (hash(i, seed + 3) - 0.5)) * rw;
      const y = ry + fract(hash(i, seed + 1) - t * drift * 0.4 / rh * hash(i, seed + 4) + noise1(t * 0.04 + i * 3) * 0.04) * rh;
      const a = alpha * (0.3 + 0.7 * hash(i, seed + 2)) * (0.6 + 0.4 * Math.sin(t * 1.5 + i));
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, 0.8 + 1.8 * hash(i, seed + 5), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // ---------- 烟花 ----------
  // tt：从发射起的秒数。上升 rise 秒到 (x, y)，然后炸开
  D.firework = (ctx, x0, yGround, x, y, tt, o = {}) => {
    const { seed = 1, n = 64, r = 220, colors = ['#ffd27a', '#ff8a5c'], rise = 1.1, life = 2.6, trail = true, scale = 1, ring = false, glowA = 1 } = o;
    if (tt < 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (tt < rise) {
      const u = ease.outQuad(tt / rise), px = lerp(x0, x, u) + Math.sin(u * 9) * 3, py = lerp(yGround, y, u);
      for (let k = 0; k < 8; k++) { const v = Math.max(0, u - k * 0.018), qx = lerp(x0, x, v), qy = lerp(yGround, y, ease.outQuad(v)); ctx.globalAlpha = (1 - k / 8) * 0.6; ctx.fillStyle = css(colors[0]); ctx.beginPath(); ctx.arc(qx, qy, 2.2 * scale * (1 - k / 10), 0, TAU); ctx.fill(); }
      D.glow(ctx, px, py, 26 * scale, colors[0], 0.9);
      ctx.restore(); return;
    }
    const s = tt - rise;
    if (s > life) { ctx.restore(); return; }
    const fade = 1 - sstep(life * 0.45, life, s);
    D.glow(ctx, x, y, r * 2.2 * scale * (0.6 + 0.4 * ease.outExpo(s * 2)), colors[0], glowA * 0.55 * Math.exp(-s * 2.2));
    // 粒子：带空气阻力的抛射，闭式解。同色的拖尾和亮点各合成一条路径
    const k = 2.4, g = 70 * scale, nc = colors.length;
    const trails = Array.from({ length: nc }, () => new Path2D()), dots = Array.from({ length: nc }, () => new Path2D());
    const late = s > life * 0.5;
    for (let i = 0; i < n; i++) {
      const a = ring ? (i / n) * TAU : (i / n) * TAU + hash(i, seed) * 0.4;
      const sp = r * scale * (ring ? 1 : 0.65 + 0.45 * hash(i, seed + 1)) * k;
      const pos = q => { const d = (1 - Math.exp(-k * q)) / k; return [x + Math.cos(a) * sp * d, y + Math.sin(a) * sp * d + 0.5 * g * q * q]; };
      const [px, py] = pos(s);
      const ci = i % nc;
      if (trail) { const [qx, qy] = pos(Math.max(0, s - 0.22)); trails[ci].moveTo(qx, qy); trails[ci].lineTo(px, py); }
      const tw = late ? (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s * 30 + i * 7))) : 1; // 后半段闪烁：改变亮点大小
      const pr = 2 * scale * tw;
      dots[ci].moveTo(px + pr, py); dots[ci].arc(px, py, pr, 0, TAU);
      if ((i & 7) === 0) D.glow(ctx, px, py, 16 * scale, colors[ci], fade * tw * 0.55);
    }
    ctx.lineWidth = 1.6 * scale; ctx.lineCap = 'round';
    for (let ci = 0; ci < nc; ci++) {
      if (trail) { ctx.globalAlpha = 1; ctx.strokeStyle = css(colors[ci], fade * 0.75); ctx.stroke(trails[ci]); }
      ctx.globalAlpha = fade; ctx.fillStyle = css(colors[ci]); ctx.fill(dots[ci]);
    }
    ctx.restore();
  };

  // ---------- MG 线条元素 ----------
  // 声波：同心弧向外扩散
  D.ripples = (ctx, x, y, t, o = {}) => {
    const { n = 4, period = 0.9, speed = 160, color = '#f2c46d', width = 2, maxR = 400, a0 = 0, a1 = TAU, alpha = 1, start = 0 } = o;
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = css(color);
    for (let i = 0; i < n; i++) {
      const age = (t - start) - i * period;
      if (age < 0) continue;
      const ph = (age % (n * period));
      const r = ph * speed;
      if (r > maxR || r < 2) continue;
      const a = alpha * (1 - r / maxR) * sstep(0, 0.15, ph);
      ctx.globalAlpha = a; ctx.lineWidth = width * (1 + r / maxR);
      ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke();
    }
    ctx.restore();
  };
  // 一次性的扩散环（重音）：tt 为触发后的秒数
  D.ring = (ctx, x, y, tt, o = {}) => {
    const { dur = 1.2, r0 = 10, r1 = 300, color = '#f2c46d', width = 3, alpha = 1 } = o;
    if (tt < 0 || tt > dur) return;
    const u = tt / dur, r = lerp(r0, r1, ease.outCubic(u));
    ctx.save(); ctx.globalAlpha *= alpha * (1 - u) ** 1.5; ctx.strokeStyle = css(color); ctx.lineWidth = width * (1 - u * 0.6);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
  };
  // 风线：沿曲线流动的一段描边，末端卷一个圈
  D.windLine = (ctx, pts, t, o = {}) => {
    const { len = 0.35, speed = 0.6, color = '#f6d79a', width = 2.5, alpha = 0.9, offset = 0, glowA = 0.25 } = o;
    const head = fract(t * speed + offset) * (1 + len);
    const f0 = clamp(head - len), f1 = clamp(head);
    if (f1 - f0 < 0.002) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const fadeA = alpha * sstep(0, 0.15, f1) * (1 - sstep(0.85, 1, f0));
    if (glowA) { ctx.strokeStyle = css(color, fadeA * glowA); ctx.lineWidth = width * 4; ctx.beginPath(); D.strokePart(ctx, pts, f0, f1); ctx.stroke(); }
    ctx.strokeStyle = css(color, fadeA); ctx.lineWidth = width; ctx.beginPath(); D.strokePart(ctx, pts, f0, f1); ctx.stroke();
    ctx.restore();
  };
  // 生成一条带卷曲尾巴的风线点列
  D.windPath = (x, y, len, amp, curl = 1, dir = 1, seed = 1) => {
    const pts = [], n = 60;
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([x + dir * u * len, y + Math.sin(u * Math.PI * 1.3 + seed) * amp * u]); }
    if (curl) { const [ex, ey] = pts[n], rr = amp * 0.6 * curl; for (let i = 1; i <= 30; i++) { const a = -Math.PI / 2 + (i / 30) * TAU * 0.85; pts.push([ex + dir * Math.cos(a) * rr * (1 - i / 60), ey + rr + Math.sin(a) * rr * (1 - i / 60)]); } }
    return pts;
  };

  // 光束（丁达尔）
  D.rays = (ctx, x, y, ang, spread, len, t, o = {}) => {
    const { n = 7, color = '#fff1cc', alpha = 0.25, seed = 2 } = o;
    ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = ang + (hash(i, seed) - 0.5) * spread, w = 0.03 + 0.07 * hash(i, seed + 1);
      const al = alpha * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * (0.3 + hash(i, seed + 2) * 0.5) + i * 2)));
      const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
      g.addColorStop(0, css(color, al)); g.addColorStop(1, css(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len); ctx.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  // ---------- 海 ----------
  D.sea = (ctx, horizon, t, o = {}) => {
    const { top = '#4a4a86', bottom = '#1d1d45', sunX = W / 2, sunColor = '#ffd9a0', glitter = 1, bands = 14, x0 = -200, x1 = W + 200, waveColor = '#ffffff', waveA = 0.08 } = o;
    ctx.fillStyle = D.lin(ctx, 0, horizon, 0, H + 200, [[0, top], [1, bottom]]);
    ctx.fillRect(x0, horizon, x1 - x0, H + 400 - horizon);
    // 波纹带：越近越宽
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < bands; i++) {
      const v = (i + fract(t * 0.08)) / bands, y = horizon + Math.pow(v, 2.2) * (H + 100 - horizon);
      const th = 1 + 6 * v * v;
      ctx.fillStyle = css(waveColor, waveA * (0.3 + v));
      for (let k = 0; k < 6; k++) { const wx = x0 + fract(hash(i, k) + t * 0.01 * (k % 2 ? 1 : -1)) * (x1 - x0), ww = 60 + 300 * v * hash(i, k + 9); ctx.fillRect(wx, y, ww, th); }
    }
    // 太阳倒影：碎金
    if (glitter > 0) {
      for (let i = 0; i < 140; i++) {
        const v = hash(i, 31), y = horizon + 2 + Math.pow(v, 1.6) * (H - horizon);
        const spread = 18 + 260 * v;
        const x = sunX + (hash(i, 32) - 0.5) * 2 * spread * (0.6 + 0.4 * Math.sin(t * 0.7 + i));
        const a = glitter * (1 - v * 0.6) * Math.pow(0.5 + 0.5 * Math.sin(t * (2 + hash(i, 33) * 3) + i), 2);
        ctx.fillStyle = css(sunColor, a); ctx.fillRect(x - (6 + 30 * v) / 2, y, 6 + 30 * v, 1 + 3 * v);
      }
    }
    ctx.restore();
  };

  // ---------- 文字 ----------
  D.font = (size, weight = 400, fam = '"Noto Serif SC", "Source Han Serif SC", "STSong", serif') => `${weight} ${size}px ${fam}`;

  MV.draw = D;
})();

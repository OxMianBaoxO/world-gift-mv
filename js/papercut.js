// 窗花：程序生成的对称剪纸。先画一整张纸，再用 destination-out 剪出镂空
(() => {
  const { TAU, clamp, lerp, ease, hash, rng, css, sstep } = MV;
  const D = MV.draw;
  const SIZE = 1024, C = SIZE / 2;
  const cache = new Map();

  // —— 镂空纹样（单位：半径 = 1，局部坐标 y 向外）——
  function teardrop(g, x, y, len, w, a) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(0, -len / 2);
    g.bezierCurveTo(w, -len * 0.15, w * 0.9, len * 0.45, 0, len / 2);
    g.bezierCurveTo(-w * 0.9, len * 0.45, -w, -len * 0.15, 0, -len / 2);
    g.fill(); g.restore();
  }
  function leaf(g, x, y, len, w, a) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(0, -len / 2); g.quadraticCurveTo(w, 0, 0, len / 2); g.quadraticCurveTo(-w, 0, 0, -len / 2); g.fill(); g.restore();
  }
  function crescent(g, x, y, r, th, a) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.arc(0, 0, r, Math.PI * 0.08, Math.PI * 0.92); g.arc(0, -th, r * 1.02, Math.PI * 0.86, Math.PI * 0.14, true); g.closePath(); g.fill(); g.restore();
  }
  const dot = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  // 锯齿：沿半径 r 的弧，一排细三角
  function sawArc(g, r, a0, a1, n, depth, out = 1) {
    for (let i = 0; i < n; i++) {
      const u0 = lerp(a0, a1, i / n), u1 = lerp(a0, a1, (i + 1) / n), um = (u0 + u1) / 2;
      g.beginPath();
      g.moveTo(Math.sin(u0) * r, Math.cos(u0) * r);
      g.lineTo(Math.sin(um) * (r + depth * out), Math.cos(um) * (r + depth * out));
      g.lineTo(Math.sin(u1) * r, Math.cos(u1) * r);
      g.closePath(); g.fill();
    }
  }
  // 在极坐标 (半径 r，角 a) 放置的变换
  function polar(g, r, a, fn) { g.save(); g.rotate(-a); g.translate(0, r); fn(); g.restore(); }

  // ---------- 团花（圆形窗花），N 瓣 ----------
  function flower(seed, N = 8) {
    const cv = D.makeCanvas(SIZE, SIZE), g = cv.getContext('2d');
    const R = C * 0.96, r = rng(seed);
    g.translate(C, C); g.scale(R, R);
    g.fillStyle = '#fff';
    // 外缘：花边
    g.beginPath();
    const bumps = N * 3;
    for (let i = 0; i <= 360; i++) {
      const a = (i / 360) * TAU, k = Math.cos(a * bumps);
      const rr = 0.95 + 0.045 * Math.pow(Math.abs(k), 0.6) * Math.sign(k);
      const x = Math.sin(a) * rr, y = Math.cos(a) * rr;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out';
    const wedge = TAU / N;
    const variant = Math.floor(r() * 3);
    for (let k = 0; k < N; k++) for (const m of [1, -1]) {
      g.save(); g.rotate(k * wedge); g.scale(m, 1);
      // 外圈月牙
      polar(g, 0.82, wedge * 0.25, () => crescent(g, 0, 0, 0.07, 0.035, Math.PI));
      polar(g, 0.9, wedge * 0.5, () => dot(g, 0, 0, 0.016));
      polar(g, 0.9, wedge * 0.1, () => dot(g, 0, 0, 0.012));
      // 花瓣大镂空（中线上，左右两半各画一次叠加成完整的瓣）
      g.save(); g.beginPath(); g.rect(0, -1, 2, 2); g.clip();
      teardrop(g, 0, 0.58, 0.32, 0.11, 0);
      g.restore();
      // 瓣与瓣之间：柳叶
      polar(g, 0.6, wedge * 0.5, () => leaf(g, 0, 0, 0.2, 0.035, 0));
      polar(g, 0.47, wedge * 0.36, () => leaf(g, 0, 0, 0.12, 0.022, 0.5));
      if (variant !== 1) polar(g, 0.72, wedge * 0.36, () => dot(g, 0, 0, 0.02));
      // 中圈锯齿
      sawArc(g, 0.36, 0.02, wedge / 2 - 0.02, 4, 0.05, 1);
      sawArc(g, 0.31, 0.02, wedge / 2 - 0.02, 4, -0.04, 1);
      // 花心
      polar(g, 0.17, 0, () => { g.save(); g.beginPath(); g.rect(0, -1, 2, 2); g.clip(); teardrop(g, 0, 0, 0.13, 0.05, 0); g.restore(); });
      g.restore();
    }
    dot(g, 0, 0, 0.045);
    // 花瓣里回填一片小纸瓣（剪纸的“岛”，靠细桥相连）
    g.globalCompositeOperation = 'source-over';
    for (let k = 0; k < N; k++) {
      g.save(); g.rotate(k * wedge);
      teardrop(g, 0, 0.6, 0.16, 0.045, 0);
      g.fillRect(-0.004, 0.42, 0.008, 0.32);
      g.restore();
    }
    dot(g, 0, 0, 0.022);
    return cv;
  }

  // ---------- 鱼（年年有余） ----------
  function fish(seed) {
    const cv = D.makeCanvas(SIZE, SIZE), g = cv.getContext('2d');
    g.translate(C, C); g.scale(C * 0.9, C * 0.9);
    g.fillStyle = '#fff';
    // 身体：头朝右
    g.beginPath();
    g.moveTo(0.82, 0);
    g.bezierCurveTo(0.7, -0.36, 0.1, -0.5, -0.45, -0.16);
    g.lineTo(-0.62, -0.05);
    g.lineTo(-0.62, 0.05);
    g.lineTo(-0.45, 0.16);
    g.bezierCurveTo(0.1, 0.5, 0.7, 0.36, 0.82, 0);
    g.fill();
    // 尾巴：扇形
    g.beginPath(); g.moveTo(-0.55, 0);
    g.bezierCurveTo(-0.75, -0.2, -0.95, -0.45, -0.98, -0.5);
    g.quadraticCurveTo(-0.82, -0.12, -0.9, 0);
    g.quadraticCurveTo(-0.82, 0.12, -0.98, 0.5);
    g.bezierCurveTo(-0.95, 0.45, -0.75, 0.2, -0.55, 0);
    g.fill();
    // 背鳍、腹鳍
    g.beginPath(); g.moveTo(0.25, -0.36); g.quadraticCurveTo(0.0, -0.62, -0.25, -0.52); g.quadraticCurveTo(-0.1, -0.4, -0.15, -0.3); g.fill();
    g.beginPath(); g.moveTo(0.1, 0.36); g.quadraticCurveTo(-0.05, 0.56, -0.25, 0.5); g.quadraticCurveTo(-0.1, 0.38, -0.12, 0.3); g.fill();
    g.globalCompositeOperation = 'destination-out';
    // 眼睛、鳃
    g.beginPath(); g.arc(0.58, -0.06, 0.055, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over'; g.beginPath(); g.arc(0.58, -0.06, 0.022, 0, TAU); g.fill();
    g.globalCompositeOperation = 'destination-out';
    crescent(g, 0.42, 0, 0.17, 0.05, -Math.PI / 2);
    // 鳞：一排排月牙
    for (let row = -2; row <= 2; row++) for (let i = 0; i < 6; i++) {
      const x = 0.28 - i * 0.12 - (row & 1) * 0.06, y = row * 0.085;
      const lim = 0.3 * (1 - Math.abs(x - 0.05) * 1.1);
      if (Math.abs(y) > lim || x < -0.42) continue;
      crescent(g, x, y, 0.045, 0.02, -Math.PI / 2);
    }
    // 尾纹：细柳叶
    for (let i = -3; i <= 3; i++) leaf(g, -0.78, i * 0.1, 0.2, 0.012, Math.PI / 2 + i * 0.22);
    // 鳍纹
    for (let i = 0; i < 4; i++) leaf(g, 0.05 - i * 0.07, -0.44 + i * 0.02, 0.12, 0.01, -0.5 + i * 0.15);
    for (let i = 0; i < 3; i++) leaf(g, -0.02 - i * 0.07, 0.42, 0.1, 0.01, 0.6 - i * 0.15);
    return cv;
  }

  // ---------- 囍（字放在圆框里） ----------
  function xi(seed) {
    const cv = D.makeCanvas(SIZE, SIZE), g = cv.getContext('2d');
    g.translate(C, C);
    g.fillStyle = '#fff';
    const R = C * 0.95;
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(0, 0, R * 0.86, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    // 外框锯齿与圆点
    g.save(); g.scale(R, R); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; dot(g, Math.sin(a) * 0.93, Math.cos(a) * 0.93, 0.018); }
    g.restore();
    g.font = `900 ${Math.round(R * 1.18)}px "Noto Serif SC", "SimSun", serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('囍', 0, R * 0.04);
    return cv;
  }

  // 生成或取缓存
  function get(type, seed = 1, N = 8) {
    const key = type + ':' + seed + ':' + N;
    let v = cache.get(key);
    if (!v) {
      const mask = type === 'fish' ? fish(seed) : type === 'xi' ? xi(seed) : flower(seed, N);
      v = { mask, tints: new Map(), N, type, shadow: null };
      cache.set(key, v);
    }
    return v;
  }
  function tint(pc, color0) {
    const color = MV.colorKey(color0);
    let c = pc.tints.get(color);
    if (!c) {
      if (pc.tints.size > 24) pc.tints.clear();
      c = D.makeCanvas(SIZE, SIZE); const g = c.getContext('2d');
      g.drawImage(pc.mask, 0, 0);
      g.globalCompositeOperation = 'source-in';
      // 纸的轻微明暗
      const gr = g.createLinearGradient(0, 0, SIZE, SIZE);
      gr.addColorStop(0, css(MV.mixc(color, '#ffffff', 0.1))); gr.addColorStop(1, css(MV.mixc(color, '#000000', 0.12)));
      g.fillStyle = gr; g.fillRect(0, 0, SIZE, SIZE);
      pc.tints.set(color, c);
    }
    return c;
  }
  function shadowOf(pc) {
    if (!pc.shadow) {
      const c = D.makeCanvas(SIZE, SIZE), g = c.getContext('2d');
      g.filter = 'blur(10px)'; g.drawImage(pc.mask, 0, 0); g.filter = 'none';
      g.globalCompositeOperation = 'source-in'; g.fillStyle = '#000'; g.fillRect(0, 0, SIZE, SIZE);
      pc.shadow = c;
    }
    return pc.shadow;
  }

  // 画一张窗花。o.unfold: 0..1 展开（团花从一瓣转出全部）；o.shadow: 投影强度
  function draw(ctx, type, x, y, size, o = {}) {
    const { seed = 1, N = 8, color = '#c8231d', rot = 0, alpha = 1, unfold = 1, shadow = 0, shadowOff = [6, 8], glow = 0, glowColor = '#ffb35c', flip = 1 } = o;
    const pc = get(type, seed, N);
    const img = tint(pc, color), s = size / SIZE;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * flip, s); ctx.globalAlpha *= alpha;
    if (glow > 0) D.glow(ctx, 0, 0, SIZE * 0.75, glowColor, glow);
    const paint = (im, dx = 0, dy = 0) => {
      if (unfold >= 1 || type !== 'flower') { ctx.drawImage(im, -C + dx, -C + dy); return; }
      const wedge = TAU / pc.N;
      for (let k = 0; k < pc.N; k++) {
        const u = ease.outCubic(clamp(unfold * pc.N - k * 0.85));
        if (u <= 0 && k > 0) continue;
        ctx.save(); ctx.rotate(k * wedge * u);
        ctx.beginPath(); ctx.moveTo(dx, dy); ctx.arc(dx, dy, SIZE, -Math.PI / 2 - wedge / 2 - 0.02, -Math.PI / 2 + wedge / 2 + 0.02); ctx.closePath(); ctx.clip();
        ctx.drawImage(im, -C + dx, -C + dy); ctx.restore();
      }
    };
    if (shadow > 0) { ctx.save(); ctx.globalAlpha *= shadow; paint(shadowOf(pc), shadowOff[0] / s, shadowOff[1] / s); ctx.restore(); }
    paint(img);
    ctx.restore();
  }

  MV.papercut = { get, draw, tint, SIZE };
})();

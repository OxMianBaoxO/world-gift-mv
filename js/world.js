// 场景积木：镜头、夜空、小星球、小镇、雪地、树、云海……
(() => {
  const { W, H, TAU, clamp, lerp, inv, ease, sstep, hash, rng, noise1, noise2, fbm, css, mix, mixc, ramp } = MV;
  const D = MV.draw, PR = MV.props;
  const Wd = {};

  // 2D 镜头：世界坐标 (x, y) 落在屏幕中心，z 缩放，r 旋转；depth < 1 的图层视差更小
  Wd.cam = (ctx, c, depth = 1) => {
    const z = 1 + ((c.z ?? 1) - 1) * depth;
    ctx.translate(W / 2, H / 2);
    if (c.r) ctx.rotate(c.r * depth);
    ctx.scale(z, z);
    ctx.translate(-(W / 2 + ((c.x ?? W / 2) - W / 2) * depth), -(H / 2 + ((c.y ?? H / 2) - H / 2) * depth));
  };
  Wd.layer = (ctx, c, depth, fn) => { ctx.save(); Wd.cam(ctx, c, depth); fn(); ctx.restore(); };
  // 世界坐标 → 屏幕坐标
  Wd.toScreen = (c, x, y, depth = 1) => {
    const z = 1 + ((c.z ?? 1) - 1) * depth, r = (c.r || 0) * depth;
    let dx = x - (W / 2 + ((c.x ?? W / 2) - W / 2) * depth), dy = y - (H / 2 + ((c.y ?? H / 2) - H / 2) * depth);
    dx *= z; dy *= z;
    return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), H / 2 + dx * Math.sin(r) + dy * Math.cos(r)];
  };

  // ---------- 夜空 ----------
  Wd.NIGHT = [[0, '#060819'], [0.45, '#121a45'], [0.8, '#2a2f6a'], [1, '#4a3b72']];
  Wd.nightSky = (ctx, t, o = {}) => {
    const { stops = Wd.NIGHT, stars = 1, milky = 0, seed = 2, region = [-300, -300, W + 600, H + 200], y0 = 0, y1 = H, starN = 380 } = o;
    D.sky(ctx, stops, y0, y1);
    if (milky > 0) D.milkyWay(ctx, W * 0.55, H * 0.3, W * 1.4, 520, -0.32, milky);
    if (stars > 0) D.stars(ctx, t, { n: starN, region, seed, alpha: stars, fadeY: o.fadeY });
  };

  // ---------- 树 ----------
  Wd.pine = (ctx, x, y, h, color, snow = 0, seed = 1) => {
    const w = h * 0.5;
    ctx.fillStyle = css(color);
    ctx.fillRect(x - h * 0.03, y - h * 0.16, h * 0.06, h * 0.16);
    for (let i = 0; i < 3; i++) {
      const yy = y - h * 0.12 - i * h * 0.27, ww = w * (1 - i * 0.24);
      ctx.beginPath(); ctx.moveTo(x - ww / 2, yy); ctx.quadraticCurveTo(x - ww * 0.15, yy - h * 0.12, x, yy - h * 0.42); ctx.quadraticCurveTo(x + ww * 0.15, yy - h * 0.12, x + ww / 2, yy); ctx.closePath(); ctx.fill();
      if (snow > 0) { ctx.fillStyle = css('#eef3fb', snow); ctx.beginPath(); ctx.moveTo(x - ww * 0.22, yy - h * 0.25); ctx.quadraticCurveTo(x, yy - h * 0.47, x + ww * 0.22, yy - h * 0.25); ctx.quadraticCurveTo(x, yy - h * 0.31, x - ww * 0.22, yy - h * 0.25); ctx.fill(); ctx.fillStyle = css(color); }
    }
  };
  // 圆冠树：四季颜色
  Wd.roundTree = (ctx, x, y, h, crown, trunk, seed = 1, blossom = 0, t = 0) => {
    ctx.fillStyle = css(trunk);
    ctx.beginPath(); ctx.moveTo(x - h * 0.035, y); ctx.lineTo(x - h * 0.02, y - h * 0.5); ctx.lineTo(x + h * 0.02, y - h * 0.5); ctx.lineTo(x + h * 0.035, y); ctx.fill();
    const r = rng(seed);
    ctx.fillStyle = css(crown);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + r(); const cx = x + Math.cos(a) * h * 0.16, cy = y - h * 0.66 + Math.sin(a) * h * 0.12; D.circle(ctx, cx, cy, h * (0.2 + 0.06 * r())); }
    D.circle(ctx, x, y - h * 0.72, h * 0.25);
    ctx.fill();
    if (blossom > 0) { ctx.fillStyle = css('#ffe1ea', blossom); for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(x + (r() - 0.5) * h * 0.6, y - h * 0.68 + (r() - 0.5) * h * 0.45, h * 0.025, 0, TAU); ctx.fill(); } }
  };

  // ---------- 小星球 ----------
  // items: [{a, type:'house'|'pine'|'tree'|'lamp', s, seed, lit, ...}]，a 为在球面上的角度（0 = 正上方）
  // 球面上的雪纹、小路（随星球转动），预先算好
  const planetTex = (() => {
    const r = rng(404), blobs = [], dots = [];
    for (let i = 0; i < 18; i++) blobs.push([r() * TAU, 0.1 + r() * 0.85, 0.1 + r() * 0.16, 0.7 + r() * 0.3, r(), r() * TAU]);
    for (let i = 0; i < 260; i++) dots.push([r() * TAU, Math.sqrt(r()) * 0.97, 0.004 + r() * 0.01, r()]);
    return { blobs, dots };
  })();
  Wd.planet = (ctx, o) => {
    const { x, y, R, rot = 0, t = 0, rim = 0, rimColor = '#f2c46d', atmo = '#6f7fd8', atmoA = 0.35, items = [], snow = 1, shade = 0.6, wall = '#2e3466', roof = '#1b1f40', itemColor = null, lightA = 1, pal = null, lights = 1, smoke = 1 } = o;
    const P = pal || { hi: '#eef2fb', mid: '#c3cde6', lo: '#7f8cc0', edge: '#3f4a85', fleck: '#8f9dcb' };
    // 大气光：外层冷蓝，贴边一圈亮
    D.glow(ctx, x, y, R * 2.1, atmo, atmoA, 'lighter');
    D.glow(ctx, x, y, R * 1.25, '#aab8ff', atmoA * 0.5, 'lighter');
    // 球体：左上受光
    ctx.fillStyle = D.rad(ctx, x - R * 0.38, y - R * 0.48, R * 0.05, R * 1.25, [[0, P.hi], [0.45, P.mid], [0.8, P.lo], [1, P.edge]]);
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    // 雪纹（随星球转）
    for (const [a, rr0, sz, st, k, rr2] of planetTex.blobs) {
      const rr = Math.min(rr0, 0.95 - sz);
      const aa = a + rot, px = x + Math.sin(aa) * rr * R, py = y - Math.cos(aa) * rr * R;
      ctx.save(); ctx.translate(px, py); ctx.rotate(rr2 + rot);
      ctx.fillStyle = css(k > 0.5 ? '#ffffff' : P.lo, k > 0.5 ? 0.12 : 0.1);
      ctx.beginPath(); ctx.ellipse(0, 0, sz * R, sz * R * st, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = css(P.fleck, 0.5);
    for (const [a, rr, sz] of planetTex.dots) { const aa = a + rot; ctx.beginPath(); ctx.arc(x + Math.sin(aa) * rr * R, y - Math.cos(aa) * rr * R, sz * R, 0, TAU); ctx.fill(); }
    // 绕村子的小路
    ctx.strokeStyle = css(P.lo, 0.45); ctx.lineWidth = R * 0.012; ctx.setLineDash([R * 0.01, R * 0.03]);
    ctx.beginPath(); ctx.arc(x, y, R * 0.93, -Math.PI / 2 + rot - 1.2, -Math.PI / 2 + rot + 1.2); ctx.stroke(); ctx.setLineDash([]);
    // 地表物件（贴着球面站立）
    for (const it of items) {
      const a = it.a + rot;
      if (it.s <= 0.0005) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.translate(0, -R * (1 - (it.sink ?? 0.01)));
      const s = it.s * R;
      if (it.type === 'house') PR.house(ctx, 0, 0, s, s * (it.hr || 0.85), { snow: snow * (it.snow ?? 1), wall: it.wall || wall, roof: it.roof || roof, windowLit: (it.lit ?? 1) * lightA, seed: it.seed || 1, lantern: it.lantern, t: t + (it.seed || 0), door: it.door ?? true, papercut: it.papercut, windowColor: it.windowColor, chimney: it.chimney ?? ((it.seed || 0) % 2 === 1), smoke, detail: s > 40 ? 1 : 0.4 });
      else if (it.type === 'pine') Wd.pine(ctx, 0, 0, s, it.color || itemColor || '#1d2448', snow * 0.9, it.seed);
      else if (it.type === 'tree') Wd.roundTree(ctx, 0, 0, s, it.crown || '#2f6b4f', it.trunk || '#2a2238', it.seed, it.blossom || 0, t);
      else if (it.type === 'lamp') { ctx.fillStyle = css(itemColor || '#1d2448'); ctx.fillRect(-s * 0.025, -s, s * 0.05, s); PR.lantern(ctx, 0, -s * 0.98, s * 0.14, { t, glow: lightA, string: 0 }); }
      else if (it.draw) it.draw(ctx, s, t);
      ctx.restore();
    }
    // 村子上空的一串彩灯
    if (lights > 0) {
      for (let i = 0; i <= 26; i++) {
        const u = i / 26, a = rot - 0.75 + u * 1.5, rr = R * (1.235 + 0.035 * Math.sin(u * Math.PI * 6));
        const px = x + Math.sin(a) * rr, py = y - Math.cos(a) * rr;
        const tw = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
        D.glow(ctx, px, py, R * 0.035, i % 3 ? '#ffcf7a' : '#ff7a5a', lights * lightA * tw);
      }
    }
    // 明暗：右下方背光
    if (shade > 0) {
      ctx.fillStyle = D.lin(ctx, x - R * 0.7, y - R * 0.9, x + R * 0.9, y + R * 1.0, [[0, '#0a0c24', 0], [0.5, '#0a0c24', 0.08], [1, '#080a20', shade]]);
      ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    }
    // 左上边缘一道亮（月光），整圈细金线可选
    ctx.save(); ctx.lineWidth = Math.max(1.5, R * 0.014);
    const g = ctx.createLinearGradient(x - R, y - R, x + R * 0.4, y + R * 0.4); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 0.995, Math.PI * 0.85, Math.PI * 1.75); ctx.stroke();
    if (rim > 0) { ctx.strokeStyle = css(rimColor, rim); ctx.lineWidth = Math.max(1.5, R * 0.01); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke(); }
    ctx.restore();
  };

  // ---------- 小镇（一排排屋子，雪夜） ----------
  // row: 屋子排的参数；ox 为视差偏移
  Wd.townRow = (ctx, o) => {
    const { y, ox = 0, n = 10, w0 = 180, gap = 40, seed = 1, wall = '#252a52', roof = '#171a36', snow = 1, lit = 1, t = 0, scale = 1, x0 = -400, x1 = W + 400, lantern = 0.4 } = o;
    const r = rng(seed);
    const span = (w0 + gap) * n;
    for (let i = 0; i < n; i++) {
      const hw = w0 * (0.8 + 0.5 * hash(i, seed)) * scale;
      const hh = hw * (0.72 + 0.35 * hash(i, seed + 1));
      let x = ((i * (w0 + gap) * scale - ox) % (span * scale) + span * scale) % (span * scale) + x0;
      if (x < x0 - hw || x > x1 + hw) continue;
      PR.house(ctx, x, y + (hash(i, seed + 7) - 0.5) * 18 * scale, hw, hh, { wall: mixc(wall, '#000000', hash(i, seed + 8) * 0.18), roof, snow, windowLit: lit * (hash(i, seed + 2) > 0.25 ? 1 : 0), seed: seed * 31 + i, windows: hash(i, seed + 3) > 0.5 ? 2 : 1, door: hash(i, seed + 4) > 0.4, lantern: hash(i, seed + 5) < lantern, t, chimney: hash(i, seed + 6) > 0.6 });
    }
  };

  // 雪地：缓坡。上沿一道亮边，往下变蓝；起伏处有柔和的阴影和细碎闪光
  Wd.snowGround = (ctx, y, o = {}) => {
    const { ox = 0, amp = 18, color = '#e7edf8', shade = '#9ba8cc', seed = 3, x0 = -400, x1 = W + 400, depth = 300, t = 0, sparkle = 1, warm = null } = o;
    const yAt = x => y - amp * (fbm((x + ox) * 0.0015, seed, 3) * 0.5 + 0.5);
    const path = () => { ctx.beginPath(); ctx.moveTo(x0, H + 800); for (let x = x0; x <= x1; x += 10) ctx.lineTo(x, yAt(x)); ctx.lineTo(x1, H + 800); ctx.closePath(); };
    path();
    ctx.fillStyle = D.lin(ctx, 0, y - amp, 0, y + depth, [[0, color], [0.35, mixc(color, shade, 0.45)], [1, shade]]); ctx.fill();
    // 起伏的阴影：一些扁长的蓝色椭圆（放在地面以下，不用裁剪）
    for (let i = 0; i < 9; i++) {
      const px = x0 + (((hash(i, seed + 40) * (x1 - x0) - ox * 1) % (x1 - x0)) + (x1 - x0)) % (x1 - x0), py = yAt(px) + 40 + hash(i, seed + 41) * depth * 0.7;
      ctx.fillStyle = css(shade, 0.35); ctx.beginPath(); ctx.ellipse(px, py, 160 + 220 * hash(i, seed + 42), 10 + 14 * hash(i, seed + 43), 0, 0, TAU); ctx.fill();
    }
    if (warm) for (const [wx, wy, wr, wa] of warm) { ctx.save(); ctx.translate(wx, wy); ctx.scale(1, 0.28); D.glow(ctx, 0, 0, wr, '#ffb35c', wa); ctx.restore(); }
    // 上沿亮边
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = x0; x <= x1; x += 10) x === x0 ? ctx.moveTo(x, yAt(x) + 1) : ctx.lineTo(x, yAt(x) + 1); ctx.stroke();
    // 闪光
    if (sparkle > 0) for (let i = 0; i < 40; i++) {
      const px = x0 + (((hash(i, seed + 60) * (x1 - x0) - ox) % (x1 - x0)) + (x1 - x0)) % (x1 - x0);
      const py = yAt(px) + 6 + hash(i, seed + 61) * depth * 0.7;
      const tw = Math.pow(Math.max(0, Math.sin(t * (1.5 + hash(i, seed + 62) * 2) + i * 3.1)), 8);
      if (tw > 0.05) D.flare(ctx, px, py, 6 + 6 * hash(i, seed + 63), '#ffffff', tw * sparkle * 0.9);
    }
    return yAt;
  };

  // ---------- 屋里 ----------
  // 墙、护墙板、地板、窗（窗外由 o.view 画）、窗帘
  Wd.room = (ctx, t, o = {}) => {
    const { wall = ['#22244a', '#16173a'], floorY = 980, floor = '#0f1028', win = { x: 1180, y: 390, w: 420, h: 360 }, view = null, curtain = '#3a2a4a', curtainOpen = 1, sill = '#0c0d20', frame = '#0d0e22', papercut = null, wind = 0, light = null } = o;
    ctx.fillStyle = D.lin(ctx, 0, -100, 0, floorY, [[0, wall[0]], [1, wall[1]]]); ctx.fillRect(-400, -400, W + 800, floorY + 400);
    // 护墙板
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-400, floorY - 230, W + 800, 230);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(-400, floorY - 232, W + 800, 4);
    ctx.fillStyle = css(floor); ctx.fillRect(-400, floorY, W + 800, H + 400);
    const { x, y, w, h } = win;
    if (light) D.glow(ctx, x, y, Math.max(w, h) * 1.3, light[0], light[1]);
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip();
    if (view) view(ctx, x - w / 2, y - h / 2, w, h); else { ctx.fillStyle = '#2a3a7a'; ctx.fillRect(x - w / 2, y - h / 2, w, h); }
    ctx.restore();
    if (papercut) MV.papercut.draw(ctx, papercut.type || 'fish', x + w / 4, y - h / 4 + 10, Math.min(w, h) * (papercut.size || 0.42), { seed: papercut.seed || 1, color: papercut.color || '#b01e18', alpha: papercut.alpha ?? 1, rot: -0.06 });
    ctx.strokeStyle = css(frame); ctx.lineWidth = 16; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x, y + h / 2); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.stroke();
    ctx.fillStyle = css(sill); ctx.fillRect(x - w / 2 - 30, y + h / 2 + 6, w + 60, 18);
    // 窗帘：两片布，风吹时下摆扬起
    for (const sg of [-1, 1]) {
      const cx = x + sg * (w / 2 + 26 - (1 - curtainOpen) * w * 0.22);
      ctx.beginPath(); ctx.moveTo(cx - 46, y - h / 2 - 50); ctx.lineTo(cx + 46, y - h / 2 - 50);
      const sway = Math.sin(t * 1.7 + sg) * 10 * (0.2 + wind);
      ctx.bezierCurveTo(cx + 40 + sway, y, cx + 50 + sway * 2 - sg * wind * 60, y + h * 0.4, cx + 36 + sway * 3 - sg * wind * 120, y + h / 2 + 60);
      ctx.lineTo(cx - 36 + sway * 3 - sg * wind * 120, y + h / 2 + 64);
      ctx.bezierCurveTo(cx - 44 + sway * 2 - sg * wind * 60, y + h * 0.4, cx - 44 + sway, y, cx - 46, y - h / 2 - 50);
      ctx.fillStyle = css(curtain); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 22, y - h / 2 - 40); ctx.quadraticCurveTo(cx + k * 24 + sway * 2, y + h * 0.2, cx + k * 20 + sway * 3 - sg * wind * 120, y + h / 2 + 56); ctx.stroke(); }
    }
    ctx.fillStyle = '#0b0b1e'; ctx.fillRect(x - w / 2 - 110, y - h / 2 - 62, w + 220, 12);
  };
  // 床：被子下躺着一个孩子（侧脸朝上），x,y 为床头脚下
  Wd.bed = (ctx, x, y, w, o = {}) => {
    const { quilt = ['#b8343c', '#7a2230'], frame = '#0d0e22', pattern = '#e0a84a', t = 0, breathe = 1, headUp = 0, kid = '#11142a', pillow = '#d8d2c8' } = o;
    const top = y - 230;
    ctx.fillStyle = css(frame); ctx.fillRect(x - 20, top - 120, 26, 350); ctx.fillRect(x - 20, top + 40, w + 30, 190); ctx.fillRect(x + w - 10, top - 20, 22, 250);
    // 枕头
    ctx.fillStyle = css(pillow); ctx.beginPath(); ctx.ellipse(x + 110, top + 20, 105, 34, -0.04, 0, TAU); ctx.fill();
    // 孩子的头：侧脸朝上，头发铺在枕头上
    ctx.save(); ctx.translate(x + 118, top - 6 - headUp * 40); ctx.rotate(-Math.PI / 2 + headUp * 1.2);
    ctx.fillStyle = css(kid); ctx.beginPath(); MV.figure.headPath(ctx, 0, 0, 40, 0, 0.6, 1); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-22, 4, 46, 40, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // 被子：身体的起伏 + 呼吸
    const b = Math.sin(t * 1.8) * 3 * breathe;
    ctx.beginPath(); ctx.moveTo(x + 150, top + 34);
    ctx.bezierCurveTo(x + 230, top - 22 - b, x + 420, top - 26 - b, x + 560, top - 4);
    ctx.bezierCurveTo(x + 680, top + 10, x + w - 40, top + 0, x + w + 10, top + 30);
    ctx.lineTo(x + w + 24, top + 170); ctx.lineTo(x + 130, top + 170); ctx.closePath();
    ctx.fillStyle = D.lin(ctx, 0, top - 30, 0, top + 170, [[0, quilt[0]], [1, quilt[1]]]); ctx.fill();
    ctx.save(); ctx.clip(); for (let i = 0; i < 7; i++) MV.papercut.draw(ctx, 'flower', x + 220 + i * 105, top + 50 + (i % 2) * 52, 74, { seed: 4, color: pattern, alpha: 0.32 }); ctx.restore();
    ctx.strokeStyle = 'rgba(255,220,180,.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 150, top + 34); ctx.bezierCurveTo(x + 230, top - 22 - b, x + 420, top - 26 - b, x + 560, top - 4); ctx.stroke();
    return { top, head: [x + 118, top - 6] };
  };

  // 祥云（剪纸梦境用）：一串卷曲的云头
  Wd.auspicious = (ctx, x, y, s, o = {}) => {
    const { color = '#e8b04a', line = null, a = 1, flip = 1 } = o;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * flip, s); ctx.globalAlpha *= a;
    ctx.beginPath();
    ctx.moveTo(-1.2, 0.2);
    ctx.bezierCurveTo(-1.3, -0.4, -0.6, -0.6, -0.45, -0.15);
    ctx.bezierCurveTo(-0.4, -0.75, 0.45, -0.85, 0.45, -0.2);
    ctx.bezierCurveTo(0.7, -0.6, 1.35, -0.35, 1.15, 0.2);
    ctx.closePath();
    ctx.fillStyle = css(color); ctx.fill();
    // 卷涡
    ctx.strokeStyle = css(line || mixc(color, '#7a2a10', 0.45)); ctx.lineWidth = 0.06; ctx.lineCap = 'round';
    const spiral = (cx, cy, r0) => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, a = u * TAU * 1.3, r = r0 * (1 - u * 0.8); const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); };
    spiral(-0.8, -0.05, 0.3); spiral(0.0, -0.3, 0.36); spiral(0.8, -0.05, 0.28);
    ctx.restore();
  };

  MV.world = Wd;
})();

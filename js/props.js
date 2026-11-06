// 道具与建筑：小屋（坡顶、瓦、窗）、灯笼、风车、孔明灯、风铃……都是扁平剪影风格
(() => {
  const { W, H, TAU, clamp, lerp, ease, sstep, hash, rng, noise1, css, mix, mixc } = MV;
  const D = MV.draw;
  const P = {};

  // 小屋：两端起翘的坡顶、瓦垄、积雪、春联、窗与门，x 为中心，y 为地面
  // 静态部分（墙、顶、雪、窗、门、春联）和动态部分（窗光、灯笼、炊烟）分开：静态部分可以缓存成贴图
  const houseRaw = (ctx, x, y, w, h, o = {}) => {
    const { wall = '#2a2f55', roof = '#1a1d3a', snow = 0, windowLit = 1, windowColor = '#ffc777', seed = 1, door = true, windows = 1, chimney = false, roofH = 0.52, lantern = false, t = 0, eave = 0.13, papercut = null, festive = true, smoke = 0, detail = 1, body = true, live = true } = o;
    const r = rng(seed);
    const rh = h * roofH, wh = h - rh, top = y - wh;
    const ov = w * eave, ridgeY = top - rh * 0.9, rx = w * 0.2;
    if (body) {
    // 墙：上暗（檐下阴影）下略亮，墙脚一条石基
    ctx.fillStyle = D.lin(ctx, 0, top, 0, y, [[0, mixc(wall, '#000', 0.35)], [0.25, wall], [1, mixc(wall, '#000', 0.12)]]);
    ctx.fillRect(x - w / 2, top, w, wh);
    ctx.fillStyle = css(mixc(wall, '#000', 0.3)); ctx.fillRect(x - w / 2 - w * 0.01, y - wh * 0.1, w * 1.02, wh * 0.1);
    if (detail > 0.5) { ctx.fillStyle = css(mixc(wall, '#000', 0.42)); ctx.fillRect(x - w / 2, top, w * 0.04, wh); ctx.fillRect(x + w / 2 - w * 0.04, top, w * 0.04, wh); ctx.fillRect(x - w / 2, top + wh * 0.06, w, wh * 0.05); }
    // 屋顶：两端上翘
    const roofPath = () => {
      ctx.beginPath();
      ctx.moveTo(x - w / 2 - ov * 1.05, top - rh * 0.16);
      ctx.quadraticCurveTo(x - w / 2 - ov * 0.4, top + rh * 0.04, x - w / 2 + ov * 0.2, top + rh * 0.02);
      ctx.lineTo(x + w / 2 - ov * 0.2, top + rh * 0.02);
      ctx.quadraticCurveTo(x + w / 2 + ov * 0.4, top + rh * 0.04, x + w / 2 + ov * 1.05, top - rh * 0.16);
      ctx.quadraticCurveTo(x + w / 2 + ov * 0.2, top - rh * 0.2, x + rx, ridgeY);
      ctx.lineTo(x - rx, ridgeY);
      ctx.quadraticCurveTo(x - w / 2 - ov * 0.2, top - rh * 0.2, x - w / 2 - ov * 1.05, top - rh * 0.16);
      ctx.closePath();
    };
    roofPath(); ctx.fillStyle = css(roof); ctx.fill();
    if (detail > 0.3 && snow < 0.9) { // 瓦垄：一排排横纹（按屋顶的宽度画，不用裁剪，省 GPU）
      ctx.strokeStyle = css(mixc(roof, '#ffffff', 0.08)); ctx.lineWidth = Math.max(1, rh * 0.03);
      ctx.beginPath();
      for (let i = 1; i < 6; i++) { const u = i / 6, yy = lerp(ridgeY, top, u), hw = lerp(rx, w / 2 + ov * 0.6, u); ctx.moveTo(x - hw, yy); ctx.lineTo(x + hw, yy); }
      ctx.stroke();
    }
    // 屋脊与两端的翘角
    ctx.fillStyle = css(mixc(roof, '#000', 0.25));
    ctx.beginPath(); ctx.roundRect(x - rx - w * 0.03, ridgeY - rh * 0.1, (rx + w * 0.03) * 2, rh * 0.13, rh * 0.04); ctx.fill();
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sg * (rx + w * 0.03), ridgeY + rh * 0.02); ctx.quadraticCurveTo(x + sg * (rx + w * 0.065), ridgeY - rh * 0.02, x + sg * (rx + w * 0.06), ridgeY - rh * 0.12); ctx.lineTo(x + sg * (rx + w * 0.025), ridgeY - rh * 0.06); ctx.closePath(); ctx.fill(); }
    if (chimney) { ctx.fillStyle = css(roof); ctx.fillRect(x + w * 0.24, top - rh * 0.98, w * 0.07, rh * 0.55); }
    // 雪：厚厚一层，上亮下蓝，檐口垂下来
    if (snow > 0) {
      ctx.save(); ctx.globalAlpha *= snow;
      ctx.beginPath();
      ctx.moveTo(x - rx - w * 0.04, ridgeY - rh * 0.12);
      ctx.lineTo(x + rx + w * 0.04, ridgeY - rh * 0.12);
      ctx.quadraticCurveTo(x + w / 2 + ov * 0.1, top - rh * 0.4, x + w / 2 + ov * 0.75, lerp(ridgeY, top, 0.62));
      for (let i = 0; i <= 18; i++) { const u = i / 18, xx = lerp(x + w / 2 + ov * 0.75, x - w / 2 - ov * 0.75, u); ctx.lineTo(xx, lerp(ridgeY, top, 0.6) + rh * 0.1 * Math.pow(Math.sin(u * Math.PI), 0.5) + (hash(i, seed) - 0.4) * rh * 0.09); }
      ctx.quadraticCurveTo(x - w / 2 - ov * 0.1, top - rh * 0.4, x - rx - w * 0.04, ridgeY - rh * 0.12);
      ctx.closePath();
      ctx.fillStyle = D.lin(ctx, 0, ridgeY - rh * 0.12, 0, lerp(ridgeY, top, 0.7), [[0, '#f2f5fd'], [0.65, '#d6deef'], [1, '#a6b2d2']]);
      ctx.fill();
      ctx.restore();
    }
    // 檐下的影子
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - w / 2, top + rh * 0.02, w, wh * 0.06);
    }
    // 窗
    const ww = w * 0.24, whh = wh * 0.42;
    const wins = [];
    for (let i = 0; i < windows; i++) {
      const wx = windows === 1 ? x + (door ? w * 0.16 : 0) : lerp(x - w * 0.27, x + w * 0.27, i / (windows - 1));
      const wy = y - wh * 0.58;
      wins.push([wx, wy, ww, whh]);
      const lit = windowLit * (0.55 + 0.45 * (r() > 0.2 ? 1 : 0.3));
      wins[i].push(lit);
      if (live && lit > 0) D.glow(ctx, wx, wy, Math.max(ww, whh) * 1.8, windowColor, 0.6 * lit);
      if (body) P.windowLight(ctx, wx, wy, ww, whh, { lit, color: windowColor, frame: mixc(roof, '#000', 0.2), papercut: i === 0 ? papercut : null, t, glowA: 0 });
    }
    if (!body) { drawLive(); return { wins, roofY: ridgeY, wallY: top }; }
    if (door) {
      const dx = windows === 1 ? x - w * 0.2 : x, dw = w * 0.18, dh = wh * 0.66;
      ctx.fillStyle = css(mixc(wall, '#000', 0.45)); ctx.fillRect(dx - dw / 2, y - dh, dw, dh);
      // 门缝里的暖光
      if (windowLit > 0) { ctx.fillStyle = css(windowColor, 0.75 * windowLit); ctx.fillRect(dx - dw * 0.02, y - dh, dw * 0.04, dh); }
      if (festive && detail > 0.5) {
        ctx.fillStyle = '#c8281e';
        ctx.fillRect(dx - dw / 2 - dw * 0.3, y - dh * 0.95, dw * 0.18, dh * 0.8);
        ctx.fillRect(dx + dw / 2 + dw * 0.12, y - dh * 0.95, dw * 0.18, dh * 0.8);
        ctx.fillRect(dx - dw * 0.6, y - dh - dh * 0.16, dw * 1.2, dh * 0.11);
        ctx.save(); ctx.translate(dx, y - dh * 0.55); ctx.rotate(Math.PI / 4); ctx.fillRect(-dw * 0.14, -dw * 0.14, dw * 0.28, dw * 0.28); ctx.restore();
      }
    }
    if (live) drawLive();
    return { wins, roofY: ridgeY, wallY: top };
    function drawLive() {
      if (lantern) { P.lantern(ctx, x - w / 2 + w * 0.08, top + rh * 0.02, w * 0.07, { t, glow: 1, string: w * 0.04 }); P.lantern(ctx, x + w / 2 - w * 0.08, top + rh * 0.02, w * 0.07, { t: t + 1, glow: 1, string: w * 0.04 }); }
      // 炊烟
      if (chimney && smoke > 0) {
        for (let i = 0; i < 7; i++) {
          const age = ((t * 0.22 + i / 7) % 1 + 1) % 1;
          const sx = x + w * 0.275 + age * w * 0.35 + Math.sin(age * 5 + i) * w * 0.03, sy = top - rh * 1.0 - age * h * 1.3;
          D.glow(ctx, sx, sy, w * (0.05 + 0.16 * age), '#c9d2ea', smoke * 0.5 * Math.sin(age * Math.PI), 'source-over');
        }
      }
    }
  };
  // 带缓存的小屋：屏幕上不太大时，静态部分画进一张贴图反复用（按当前缩放量化，保证清晰）
  const houseCache = new Map();
  P.house = (ctx, x, y, w, h, o = {}) => {
    const m = ctx.getTransform(), sc = Math.hypot(m.a, m.b);
    if (o.cache === false || sc * w > 700 || sc * w < 4) return houseRaw(ctx, x, y, w, h, o);
    const qs = Math.pow(2, Math.ceil(Math.log2(sc) * 4) / 4);
    const pc = o.papercut ? [o.papercut.type, o.papercut.seed, o.papercut.size, o.papercut.color].join(',') : '';
    const key = [Math.round(w), Math.round(h), qs.toFixed(3), o.wall, o.roof, (o.snow || 0).toFixed(2), (o.windowLit ?? 1).toFixed(2), o.windowColor, o.seed, o.door, o.windows, o.chimney, o.roofH, o.eave, pc, o.festive, o.detail].join('|');
    let sp = houseCache.get(key);
    if (!sp) {
      if (houseCache.size > 220) houseCache.clear();
      const mx = w * 0.75, top = h * 1.35, cw = Math.ceil(mx * 2 * qs), ch = Math.ceil((top + h * 0.08) * qs);
      const c = D.makeCanvas(Math.max(1, cw), Math.max(1, ch)), g = c.getContext('2d');
      g.scale(qs, qs); g.translate(mx, top);
      houseRaw(g, 0, 0, w, h, Object.assign({}, o, { live: false, lantern: false }));
      sp = { c, ox: mx, oy: top };
      houseCache.set(key, sp);
    }
    ctx.drawImage(sp.c, x - sp.ox, y - sp.oy, sp.c.width / qs, sp.c.height / qs);
    return houseRaw(ctx, x, y, w, h, Object.assign({}, o, { body: false }));
  };

  // 发光的窗：暖光、窗棂、可贴窗花
  P.windowLight = (ctx, x, y, w, h, o = {}) => {
    const { lit = 1, color = '#ffc777', frame = '#1a1d3a', bars = 2, papercut = null, t = 0, glowA = 0.6 } = o;
    if (lit > 0) D.glow(ctx, x, y, Math.max(w, h) * 1.8, color, glowA * lit);
    ctx.fillStyle = D.lin(ctx, 0, y - h / 2, 0, y + h / 2, [[0, mixc(color, '#fff3cf', 0.3), lit], [1, mixc(color, '#ff8a3c', 0.25), lit]]);
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    if (lit < 1) { ctx.fillStyle = css('#141832', 1 - lit); ctx.fillRect(x - w / 2, y - h / 2, w, h); }
    if (papercut) MV.papercut.draw(ctx, papercut.type || 'flower', x, y, Math.min(w, h) * (papercut.size || 0.8), { seed: papercut.seed || 1, color: papercut.color || '#9e1d18', alpha: lit });
    ctx.strokeStyle = css(frame); ctx.lineWidth = Math.max(1.5, w * 0.06);
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.lineWidth = Math.max(1, w * 0.035);
    ctx.beginPath();
    for (let i = 1; i < bars; i++) { const xx = x - w / 2 + (w * i) / bars; ctx.moveTo(xx, y - h / 2); ctx.lineTo(xx, y + h / 2); }
    ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y);
    ctx.stroke();
  };

  // 红灯笼：椭圆灯身、上下金边、流苏，光晕
  P.lantern = (ctx, x, y, r, o = {}) => {
    const { t = 0, glow = 1, color = '#d8352a', sway = 1, string = r * 0.8 } = o;
    const a = Math.sin(t * 1.3) * 0.06 * sway;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    if (string > 0) { ctx.strokeStyle = 'rgba(30,20,20,.8)'; ctx.lineWidth = Math.max(1, r * 0.05); ctx.beginPath(); ctx.moveTo(0, -string); ctx.lineTo(0, 0); ctx.stroke(); }
    if (glow > 0) D.glow(ctx, 0, r * 1.1, r * 5, '#ff8a3a', 0.55 * glow);
    const cy = r * 1.15;
    ctx.fillStyle = D.rad(ctx, -r * 0.3, cy - r * 0.3, r * 0.1, r * 1.5, [[0, '#ff9a5a'], [0.6, color], [1, mixc(color, '#000', 0.35)]]);
    ctx.beginPath(); ctx.ellipse(0, cy, r * 1.05, r * 0.92, 0, 0, TAU); ctx.fill();
    // 竖纹
    ctx.strokeStyle = 'rgba(120,20,10,.45)'; ctx.lineWidth = Math.max(0.8, r * 0.04);
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(0, cy, Math.abs(i) * r * 0.24 + 0.01, r * 0.92, 0, -Math.PI / 2, Math.PI / 2, i < 0); ctx.stroke(); }
    ctx.fillStyle = '#e7b35a';
    ctx.fillRect(-r * 0.45, cy - r * 1.02, r * 0.9, r * 0.16);
    ctx.fillRect(-r * 0.45, cy + r * 0.86, r * 0.9, r * 0.16);
    // 流苏
    ctx.strokeStyle = '#e04a32'; ctx.lineWidth = Math.max(1, r * 0.06);
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.07, cy + r * 1.02); ctx.lineTo(i * r * 0.09 + Math.sin(t * 2 + i) * r * 0.05, cy + r * 1.75); ctx.stroke(); }
    ctx.restore();
  };

  // 风车：四片叶，angle 为转角
  P.pinwheel = (ctx, x, y, r, angle, o = {}) => {
    const { colors = ['#e8483a', '#f3c35b', '#e8483a', '#f3c35b'], stick = r * 2.6, stickColor = '#1b1f36', stickAng = 0 } = o;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = css(stickColor); ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(stickAng) * stick, Math.cos(stickAng) * stick); ctx.stroke();
    ctx.rotate(angle);
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate((i * TAU) / 4);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, -r * 0.05); ctx.quadraticCurveTo(r * 0.85, -r * 0.75, 0, -r * 0.08); ctx.closePath();
      ctx.fillStyle = css(colors[i]); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#fff2d8'; ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, TAU); ctx.fill();
    ctx.restore();
  };

  // 孔明灯：梯形纸灯，底部火光
  P.skyLantern = (ctx, x, y, s, o = {}) => {
    const { t = 0, a = 1, color = '#ffcf7a', papercut = null } = o;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= a;
    ctx.rotate(Math.sin(t * 0.9 + x) * 0.04);
    D.glow(ctx, 0, 0, s * 3.2, '#ff9d45', 0.5);
    ctx.fillStyle = D.lin(ctx, 0, -s, 0, s * 0.7, [[0, '#ffe7b0'], [0.7, color], [1, '#ff8a3c']]);
    ctx.beginPath(); ctx.moveTo(-s * 0.55, -s); ctx.quadraticCurveTo(0, -s * 1.12, s * 0.55, -s); ctx.lineTo(s * 0.42, s * 0.6); ctx.quadraticCurveTo(0, s * 0.68, -s * 0.42, s * 0.6); ctx.closePath(); ctx.fill();
    if (papercut) MV.papercut.draw(ctx, papercut.type || 'flower', 0, -s * 0.2, s * 0.75, { seed: papercut.seed || 1, color: '#c8401f', alpha: 0.75 });
    ctx.fillStyle = '#fff4d0'; D.glow(ctx, 0, s * 0.62, s * 0.6, '#fff1c0', 0.9);
    ctx.restore();
  };

  // 风铃：顶盖 + 铃铛 + 纸签，sw 为摆角
  P.chime = (ctx, x, y, s, sw, o = {}) => {
    const { color = '#e9eef6', glass = '#bfe3f2', t = 0, paper = '#e8483a' } = o;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(40,40,60,.7)'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, 0); ctx.stroke();
    ctx.rotate(sw * 0.4);
    // 铃身（玻璃半球）
    ctx.fillStyle = D.lin(ctx, -s * 0.5, 0, s * 0.5, 0, [[0, glass, 0.9], [0.5, '#ffffff', 0.95], [1, glass, 0.9]]);
    ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.45); ctx.bezierCurveTo(-s * 0.5, -s * 0.15, s * 0.5, -s * 0.15, s * 0.5, s * 0.45); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(80,120,160,.5)'; ctx.stroke();
    // 舌与纸签
    ctx.rotate(sw * 0.8);
    ctx.strokeStyle = 'rgba(40,40,60,.7)'; ctx.beginPath(); ctx.moveTo(0, s * 0.1); ctx.lineTo(0, s * 1.1); ctx.stroke();
    ctx.fillStyle = css(paper);
    ctx.save(); ctx.translate(0, s * 1.1); ctx.rotate(sw * 0.6 + Math.sin(t * 3) * 0.05);
    ctx.fillRect(-s * 0.16, 0, s * 0.32, s * 0.9); ctx.restore();
    ctx.restore();
  };

  MV.props = P;
})();

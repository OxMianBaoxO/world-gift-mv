// 第一组：前奏 + 第一段主歌（第 1～4 句）——雪夜、年夜饭后的烟花、外婆的窗花
(() => {
  const { W, H, TAU, clamp, lerp, inv, ease, sstep, win, css, mix, mixc, hash, bar: T, beatTime, pulse } = MV;
  const D = MV.draw, F = MV.figure, PC = MV.papercut, PR = MV.props, Wd = MV.world;

  const INK = '#11142a', GOLD = '#f2c46d', RED = '#d8352a', WARM = '#ffc777';
  const SNOW = '#e6ecf7';
  const scarf = { color: RED };

  // 家乡小星球上的物件（0 = 正上方是外婆家）
  const HOME = [
    { a: 0, type: 'house', s: 0.42, hr: 0.82, seed: 7, lantern: true, chimney: true, papercut: { type: 'fish', seed: 1, size: 0.9 } },
    { a: -0.5, type: 'house', s: 0.32, seed: 3 }, { a: 0.52, type: 'house', s: 0.34, seed: 4, chimney: true },
    { a: -1.0, type: 'house', s: 0.28, seed: 5, chimney: true }, { a: 1.02, type: 'house', s: 0.3, seed: 6 },
    { a: -0.26, type: 'pine', s: 0.26, seed: 1 }, { a: 0.27, type: 'pine', s: 0.22, seed: 2 }, { a: 0.76, type: 'pine', s: 0.3 }, { a: -0.75, type: 'pine', s: 0.27 },
    { a: -0.15, type: 'lamp', s: 0.13 }, { a: 0.16, type: 'lamp', s: 0.13 },
    { a: -1.28, type: 'pine', s: 0.28 }, { a: 1.3, type: 'pine', s: 0.26 }, { a: 1.58, type: 'house', s: 0.27, seed: 8 }, { a: -1.6, type: 'house', s: 0.28, seed: 9 },
    { a: -1.9, type: 'pine', s: 0.25 }, { a: 1.88, type: 'pine', s: 0.28 }, { a: 2.2, type: 'house', s: 0.26, seed: 10 }, { a: -2.2, type: 'pine', s: 0.24 },
    { a: 2.55, type: 'pine', s: 0.27 }, { a: -2.55, type: 'house', s: 0.26, seed: 11 }, { a: 2.88, type: 'house', s: 0.25, seed: 12 }, { a: -2.88, type: 'pine', s: 0.27 },
  ];
  MV.HOME = HOME;
  // 物件逐个弹出：返回一份带缩放的副本
  const popItems = (items, t, t0, gap = 0.09) => items.map((it, i) => {
    const order = Math.abs(it.a) * 3 + i * 0.05;
    const k = ease.outBack(clamp((t - t0 - order * gap * 3) / 0.55), 2.2);
    return Object.assign({}, it, { s: it.s * Math.max(0, k) });
  });
  const PCX = W / 2, PCY = H / 2 + 60; // 星球中心
  // 星球旋转：从 -0.3 慢慢转到 0（外婆家转到正上方）
  const homeRot = t => lerp(-0.42, 0, ease.inOutSine(inv(T(0.5), T(4.9), t)));
  const nightA = [[0, '#05071a'], [0.5, '#0e1438'], [1, '#1d2150']];

  // ———— S01 一点光：黑暗里亮起一点光，金线画出一个圆 ————
  MV.shot({ id: 'S01', name: '一点光', at: -0.7, chapter: '前奏', look: { vignette: 0.6, grain: 0.06 }, draw(ctx, s) {
    const t = s.t;
    ctx.fillStyle = '#020309'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = sstep(0.2, 3.5, t); D.sky(ctx, nightA); ctx.globalAlpha = 1;
    D.stars(ctx, t, { n: 220, seed: 5, alpha: 0.55 * sstep(2, 6.5, t), size: 0.8 });
    const cx = PCX, cy = PCY;
    const hit = t0 => (t >= t0 ? Math.exp(-(t - t0) * 2.4) : 0);
    const p0 = sstep(0.4, 1.0, t);
    const k = p0 * (0.55 + 0.2 * Math.sin(t * 2.3)) + 0.7 * hit(0.5) + 0.6 * hit(2.05) + 0.5 * hit(3.0) + 0.6 * hit(6.05);
    D.glow(ctx, cx, cy, 170 + 80 * k, '#ffd9a0', 0.45 * k);
    D.glow(ctx, cx, cy, 34, '#fff6e0', p0);
    D.flare(ctx, cx, cy, 130 * p0 + 90 * hit(2.05), '#fff0d0', 0.55 * p0, 0.2);
    // 金线画圆，最后成为星球的轮廓
    const R0 = 200;
    const u = ease.inOutCubic(inv(2.0, 6.3, t)), u2 = ease.inOutCubic(inv(3.0, 6.5, t));
    ctx.lineCap = 'round';
    if (u > 0) {
      ctx.strokeStyle = css(GOLD, 0.95); ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(cx, cy, R0, -Math.PI / 2, -Math.PI / 2 + TAU * u); ctx.stroke();
      const a = -Math.PI / 2 + TAU * u;
      D.glow(ctx, cx + Math.cos(a) * R0, cy + Math.sin(a) * R0, 30, '#ffe3a0', 0.9 * (1 - sstep(0.96, 1, u)));
    }
    if (u2 > 0) { ctx.strokeStyle = css(GOLD, 0.3); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R0 + 16, Math.PI / 2, Math.PI / 2 - TAU * u2, true); ctx.stroke(); }
    // 刻度：像钟面，一格一格亮起
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU - Math.PI / 2, on = sstep(0, 0.2, u * 24 - i);
      if (on <= 0) continue;
      ctx.strokeStyle = css(GOLD, 0.35 * on); ctx.lineWidth = i % 6 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R0 + 26), cy + Math.sin(a) * (R0 + 26)); ctx.lineTo(cx + Math.cos(a) * (R0 + (i % 6 === 0 ? 40 : 33)), cy + Math.sin(a) * (R0 + (i % 6 === 0 ? 40 : 33))); ctx.stroke();
    }
    D.snow(ctx, t, { n: 70, alpha: 0.55 * sstep(3.5, 6.5, t), speed: 0.45, wind: 8, seed: 21 });
  } });

  // ———— S02 小星球：圆里长出一个落雪的小世界；片名 ————
  MV.shot({ id: 'S02', name: '小星球', at: 1, look: { vignette: 0.55, grain: 0.06 }, draw(ctx, s) {
    const t = s.t, lt = s.lt;
    D.sky(ctx, nightA);
    const bloom = sstep(T(2) - 0.3, T(2) + 1.5, t);
    D.milkyWay(ctx, W * 0.5, H * 0.32, W * 1.5, 480, -0.28, 0.55 * bloom);
    D.stars(ctx, t, { n: 420, seed: 5, alpha: 0.55 + 0.45 * bloom, size: 0.85 });
    const R = lerp(200, 236, ease.inOutSine(inv(T(1), T(3), t)));
    const fill = ease.outCubic(inv(T(1), T(1) + 1.1, t));
    const rot = homeRot(t);
    // 填色：从中心扩开
    ctx.save(); ctx.beginPath(); ctx.arc(PCX, PCY, Math.max(0.1, R * 1.6 * fill), 0, TAU); ctx.clip();
    Wd.planet(ctx, { x: PCX, y: PCY, R, rot, t, items: popItems(HOME, t, T(1) + 0.5), rim: 0, atmoA: 0.3 * fill, snow: 1 });
    ctx.restore();
    ctx.strokeStyle = css(GOLD, 0.95 * (1 - 0.6 * fill)); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(PCX, PCY, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = css(GOLD, 0.3 * (1 - fill)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(PCX, PCY, R + 16, 0, TAU); ctx.stroke();
    D.snow(ctx, t, { n: 120, alpha: 0.7, speed: 0.5, wind: 10, seed: 21 });
    // 片名：第 2 小节的弦乐起来时逐字浮现
    titleCard(ctx, t);
  } });

  function titleCard(ctx, t) {
    const a0 = T(2) + 0.2, out = 1 - sstep(T(3.4), T(3.4) + 1.2, t);
    if (t < a0 - 0.2 || out <= 0) return;
    const title = '世界赠予我的';
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = D.font(74, 300);
    const sp = 74 * 1.38, x0 = W / 2 - (sp * (title.length - 1)) / 2;
    [...title].forEach((ch, i) => {
      const u = ease.outCubic(clamp((t - a0 - i * 0.16) / 0.9));
      ctx.globalAlpha = u * out;
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24;
      ctx.fillStyle = '#fbf3e4'; ctx.fillText(ch, x0 + i * sp, 170 + (1 - u) * 16);
    });
    const u2 = ease.outCubic(clamp((t - a0 - 1.2) / 1));
    ctx.globalAlpha = u2 * out; ctx.shadowBlur = 0;
    ctx.strokeStyle = css(GOLD, 0.8); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(W / 2 - 90 * u2, 236); ctx.lineTo(W / 2 + 90 * u2, 236); ctx.stroke();
    ctx.font = D.font(24, 400); ctx.fillStyle = css('#f3e6cc'); ctx.letterSpacing = '12px';
    ctx.fillText('王 菲', W / 2 + 6, 270);
    // 片尾式的小字署名（来自歌词文件里的署名行）
    const cr = (MV.app.lyrics && MV.app.lyrics.credits) || [];
    const pick = ['词', '曲', '编曲', '制作人'].map(k => cr.find(c => c.role === k)).filter(Boolean);
    ctx.font = D.font(17, 400); ctx.letterSpacing = '4px'; ctx.globalAlpha = u2 * out * 0.7;
    ctx.fillText(pick.map(c => `${c.role} ${c.name}`).join('　·　'), W / 2, 1010);
    ctx.letterSpacing = '0px';
    // 印章
    const u3 = ease.outBack(clamp((t - a0 - 1.6) / 0.5));
    if (u3 > 0) { ctx.globalAlpha = out; seal(ctx, W / 2 + sp * 3.1 + 30, 150, 38 * u3); }
    ctx.restore();
  }
  function seal(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.04);
    ctx.fillStyle = '#b8231c'; ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s * 1.9, s * 0.12); ctx.fill();
    ctx.fillStyle = '#fbe9d8'; ctx.font = D.font(s * 0.56, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('窗', 0, s * 0.02); ctx.fillText('花', 0, s * 0.86);
    ctx.restore();
  }
  MV.seal = seal;

  // ———— S03 推向小窗：镜头扎进星球上外婆家的窗口 ————
  MV.shot({ id: 'S03', name: '推向小窗', at: 3, draw(ctx, s) {
    const t = s.t;
    const u = ease.inOutCubic(inv(T(3), T(5) + 0.4, t));
    const R = 236, rot = homeRot(t);
    // 外婆家窗户的位置：屋宽 0.3R，窗在屋基上方 16px、偏右 11px（见 props.house 的比例）
    const lx = 0.42 * R * 0.16, ly = -R * 0.99 - 0.42 * R * 0.82 * 0.48 * 0.58;
    const hx = PCX + lx * Math.cos(rot) - ly * Math.sin(rot), hy = PCY + lx * Math.sin(rot) + ly * Math.cos(rot);
    const z = Math.exp(lerp(0, Math.log(15), u));
    const k = ease.inOutSine(clamp(u * 1.15));
    const cam = { x: lerp(PCX, hx, k), y: lerp(PCY - 40, hy, k), z, r: -rot * sstep(0.2, 1, u) };
    MV.S03win = { cam, hx, hy };
    D.sky(ctx, nightA);
    Wd.layer(ctx, cam, 0.15, () => { D.milkyWay(ctx, W * 0.5, H * 0.32, W * 1.5, 480, -0.28, 0.55); D.stars(ctx, t, { n: 420, seed: 5, size: 0.85 }); });
    titleCard(ctx, t);
    Wd.layer(ctx, cam, 1, () => { Wd.planet(ctx, { x: PCX, y: PCY, R, rot, t, items: HOME, atmoA: 0.3 }); });
    // 雪：越推越快，拉成线
    const sp = 1 + 6 * u * (1 - u) * 4;
    D.snow(ctx, t, { n: 160, alpha: 0.75, speed: 0.5 * sp, wind: 10, seed: 21 });
    if (u > 0.3) { ctx.save(); ctx.globalAlpha = sstep(0.3, 0.6, u) * (1 - sstep(0.85, 1, u)) * 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
      for (let i = 0; i < 60; i++) { const a = hash(i, 4) * TAU, r0 = 120 + fractional(hash(i, 5) + t * 1.4) * 900; const l = 30 + 80 * u; ctx.lineWidth = 1 + 2 * hash(i, 6); ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * (r0 + l), H / 2 + Math.sin(a) * (r0 + l)); ctx.stroke(); }
      ctx.restore(); }
  } });
  const fractional = x => x - Math.floor(x);

  // ———— S04 外婆剪窗花：窗里暖光，外婆剪出一条鱼，贴上窗 ————
  // 屋子正面的大窗：画在 1920×1080 里，窗心在 (WX, WY)
  const WX = 1010, WY = 470, WW = 640, WH = 470;
  function houseFront(ctx, t, o = {}) {
    const { pasted = 1, fishPos = null, grandma = true, cut = 0, unfold = 1, light = 1 } = o;
    // 墙
    ctx.fillStyle = D.lin(ctx, 0, 0, 0, H, [[0, '#2b2a4a'], [1, '#1b1b33']]); ctx.fillRect(-400, -400, W + 800, H + 800);
    // 木纹墙板
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 3;
    for (let x = -400; x < W + 400; x += 70) { ctx.beginPath(); ctx.moveTo(x, -400); ctx.lineTo(x, H + 400); ctx.stroke(); }
    // 窗里的光漫到墙上
    D.glow(ctx, WX, WY, 760, '#ff9d4a', 0.32 * light);
    // 窗里：暖光的屋子（只在窗框里可见）
    ctx.save(); ctx.beginPath(); ctx.rect(WX - WW / 2, WY - WH / 2, WW, WH); ctx.clip();
    ctx.fillStyle = D.lin(ctx, 0, WY - WH / 2, 0, WY + WH / 2, [[0, '#ffd99a'], [0.55, '#ffbf6e'], [1, '#f0a050']]);
    ctx.fillRect(WX - WW / 2, WY - WH / 2, WW, WH);
    const tableY = WY + WH / 2 - 105;
    // 屋里墙上的年画方块、搁板（淡淡的影子）
    ctx.fillStyle = 'rgba(150,70,30,.18)'; ctx.fillRect(WX + 70, WY - WH / 2 + 50, 120, 150); ctx.fillRect(WX - WW / 2, WY - 40, WW, 8);
    // 油灯
    const lx = WX + 215;
    D.glow(ctx, lx, tableY - 46, 95, '#fff4d6', 0.5);
    ctx.fillStyle = '#6a3a22'; ctx.beginPath(); ctx.moveTo(lx - 18, tableY); ctx.lineTo(lx - 10, tableY - 30); ctx.lineTo(lx + 10, tableY - 30); ctx.lineTo(lx + 18, tableY); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,235,.9)'; ctx.beginPath(); ctx.ellipse(lx, tableY - 46, 7, 13, 0, 0, TAU); ctx.fill();
    // 外婆：坐在桌前，低头剪纸（逆光剪影）
    if (grandma) {
      const hold = o.hold || 0; // 举起展开
      const sn = Math.sin(t * 10) * 0.5 + 0.5;
      const gx = WX - 150, gy = WY + WH / 2 - 105 + 135, gs = 430;
      const toL = (px, py) => [(px - gx) / gs, (py - gy) / gs];
      const hF = hold > 0 ? toL(lerp(WX - 30, WX - 20, hold), lerp(tableY - 16, WY - 10, hold)) : toL(WX - 52 + sn * 6 * cut, tableY - 18 - sn * 5 * cut);
      const hB = toL(lerp(WX - 84, WX - 96, hold), lerp(tableY - 14, WY - 6, hold));
      F.draw(ctx, { x: gx, y: gy, s: gs, age: 'old', hair: 'oldbun', outfit: 'robe', t, wind: 0, hairColor: o.hairColor,
        pose: Object.assign(F.sit({ spine: lerp(0.3, 0.16, hold), neck: lerp(0.55, 0.05, hold) }), { reachF: hF, reachB: hB, bendF: -1, bendB: -1 }),
        color: '#3d2318',
        inHand: (c, J) => {
          const h = J.AF.hand, g = J.AB.hand;
          if (hold < 0.5) { // 折好的红纸 + 剪刀
            c.fillStyle = '#a0281c'; c.beginPath(); c.moveTo(g[0] - 0.005, g[1] - 0.03); c.lineTo(g[0] + 0.07, g[1] - 0.01); c.lineTo(g[0] + 0.02, g[1] + 0.03); c.closePath(); c.fill();
            if (cut > 0) { c.save(); c.translate(h[0], h[1]); c.rotate(-0.5); c.strokeStyle = '#3d2318'; c.lineWidth = 0.006; c.lineCap = 'round'; const op = 0.35 * sn * cut;
              c.beginPath(); c.moveTo(0, 0); c.lineTo(0.06, -op * 0.08); c.moveTo(0, 0); c.lineTo(0.06, op * 0.08); c.stroke(); c.restore(); }
          }
        } });
    }
    if (o.extra) o.extra(ctx, t, tableY);
    // 桌子
    ctx.fillStyle = '#4a2416'; ctx.fillRect(WX - WW / 2, tableY, WW, 90);
    ctx.fillStyle = 'rgba(255,190,110,.45)'; ctx.fillRect(WX - WW / 2, tableY, WW, 4);
    ctx.restore();
    // 窗棂：外框、十字、每格里一道细内框
    ctx.strokeStyle = '#1c1426'; ctx.lineWidth = 24; ctx.strokeRect(WX - WW / 2, WY - WH / 2, WW, WH);
    ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(WX, WY - WH / 2); ctx.lineTo(WX, WY + WH / 2); ctx.moveTo(WX - WW / 2, WY); ctx.lineTo(WX + WW / 2, WY); ctx.stroke();
    ctx.lineWidth = 3; ctx.globalAlpha = 0.55;
    for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = WX + px * WW / 4, cy = WY + py * WH / 4; ctx.strokeRect(cx - WW / 4 + 22, cy - WH / 4 + 22, WW / 2 - 44, WH / 2 - 44); }
    ctx.globalAlpha = 1;
    // 贴在玻璃上的鱼（右上格），逆光：深红，孔里透光
    if (fishPos) PC.draw(ctx, 'fish', fishPos[0], fishPos[1], fishPos[2], { seed: 1, color: '#b01e18', alpha: pasted, rot: fishPos[3] || 0, unfold, shadow: 0.25 });
    // 窗台积雪
    ctx.fillStyle = SNOW; ctx.beginPath(); ctx.moveTo(WX - WW / 2 - 40, WY + WH / 2 + 8);
    for (let i = 0; i <= 12; i++) ctx.lineTo(WX - WW / 2 - 40 + (WW + 80) * i / 12, WY + WH / 2 + 4 - 14 * Math.sin(i / 12 * Math.PI) - 6 * hash(i, 3));
    ctx.lineTo(WX + WW / 2 + 40, WY + WH / 2 + 28); ctx.lineTo(WX - WW / 2 - 40, WY + WH / 2 + 28); ctx.fill();
    // 屋檐：上方一条瓦檐 + 积雪 + 冰凌
    ctx.fillStyle = '#141327'; ctx.fillRect(-400, -400, W + 800, 470);
    ctx.fillStyle = SNOW; ctx.beginPath(); ctx.moveTo(-400, 60);
    for (let x = -400; x <= W + 400; x += 40) ctx.lineTo(x, 66 + 10 * Math.sin(x * 0.02) + 6 * hash(x, 2));
    ctx.lineTo(W + 400, 40); ctx.lineTo(-400, 40); ctx.fill();
    ctx.fillStyle = 'rgba(220,235,255,.8)';
    for (let i = 0; i < 26; i++) { const x = -60 + i * 80 + 30 * hash(i, 1), l = 20 + 50 * hash(i, 2); ctx.beginPath(); ctx.moveTo(x - 5, 70); ctx.lineTo(x, 70 + l); ctx.lineTo(x + 5, 70); ctx.fill(); }
    // 两只灯笼
    PR.lantern(ctx, WX - WW / 2 - 170, 120, 46, { t, glow: 1, string: 60 });
    PR.lantern(ctx, WX + WW / 2 + 170, 120, 46, { t: t + 1.2, glow: 1, string: 60 });
  }

  MV.houseFront = houseFront; MV.HF = { WX, WY, WW, WH };
  MV.shot({ id: 'S04', name: '外婆剪窗花', at: 5, tin: { type: 'fade', dur: 0.8 }, look: { vignette: 0.55 }, draw(ctx, s) {
    const t = s.t;
    const b = k => T(5) + k * MV.audioData.beatLen; // 本小节第 k 拍
    const hold = sstep(b(2.0), b(2.6), t) * (1 - sstep(b(2.9), b(3.2), t));
    const stick = ease.outCubic(inv(b(2.85), b(3.35), t));
    const cut = 1 - sstep(b(1.8), b(2.1), t);
    // 鱼：从外婆手里（展开）飞到右上格玻璃上
    const handP = [WX - 58, WY - 40], glassP = [WX + WW / 4, WY - WH / 4 + 10];
    const fishP = [lerp(handP[0], glassP[0], stick), lerp(handP[1], glassP[1], stick) - Math.sin(stick * Math.PI) * 30, lerp(150, 290, stick) * (stick > 0 ? 1 : sstep(b(2.0), b(2.4), t)), lerp(-0.2, -0.06, stick)];
    const showFish = t > b(2.0);
    // 镜头：慢推；最后一拍推向鱼眼（下一镜从鱼眼里炸出烟花）
    const ex = 290 * 0.58 * 0.45, ey = -290 * 0.06 * 0.45, er = -0.06; // 鱼眼在鱼身 (0.58, -0.06)，单位 = 0.45×尺寸
    const eye = [glassP[0] + ex * Math.cos(er) - ey * Math.sin(er), glassP[1] + ex * Math.sin(er) + ey * Math.cos(er)];
    const fin = ease.inCubic(inv(b(3.3), b(4.0), t));
    const z = lerp(1.0, 1.12, ease.inOutSine(inv(T(5), b(3.3), t))) * Math.exp(fin * Math.log(4));
    const cam = { x: lerp(W / 2 + 20, eye[0], ease.inOutCubic(clamp(fin * 1.4))), y: lerp(H / 2, eye[1], ease.inOutCubic(clamp(fin * 1.4))), z };
    Wd.layer(ctx, cam, 1, () => houseFront(ctx, t, { fishPos: showFish ? fishP : null, cut, hold, unfold: sstep(b(2.0), b(2.6), t) }));
    D.snow(ctx, t, { n: 140, alpha: 0.8, speed: 0.55, wind: 14, seed: 23 });
    MV.S04eye = Wd.toScreen(cam, eye[0], eye[1]);
  } });

  // ———— 小镇雪夜（S05、S06 共用） ————
  function townSky(ctx, t, cam, flash) {
    D.sky(ctx, [[0, mixc('#070a1e', '#2a2050', flash * 0.6)], [0.55, mixc('#141c4a', '#4a3060', flash * 0.6)], [1, mixc('#3a3570', '#8a5a70', flash * 0.5)]], -600, H);
    Wd.layer(ctx, cam, 0.1, () => D.stars(ctx, t, { n: 300, seed: 8, region: [-400, -500, W + 800, 900], alpha: 0.8 - flash * 0.4 }));
  }
  // 烟花时刻表：[发射时间, 地面 x, 炸点 x, 炸点 y, 种子, 颜色组, 半径]
  const FW = [
    [25.59 - 1.1, 960, 960, 330, 1, 0, 260], [26.6 - 1.0, 520, 560, 250, 2, 1, 200], [27.55 - 1.0, 1400, 1360, 220, 3, 2, 230],
    [28.5 - 1.0, 760, 820, 170, 4, 0, 210], [29.3 - 1.0, 1650, 1600, 300, 5, 1, 170], [30.4 - 1.0, 300, 330, 230, 6, 2, 190],
    [31.3 - 1.0, 1200, 1150, 160, 7, 0, 220], [32.2 - 1.0, 600, 640, 280, 8, 1, 180], [33.1 - 1.0, 1500, 1480, 200, 9, 2, 200],
  ];
  const FWC = [['#ffd27a', '#fff1c0', '#ffb04a'], ['#ff6a5a', '#ffd0a0', '#ff9a7a'], ['#ffb8d8', '#fff0f6', '#d8a0ff']];
  const flashAt = t => FW.reduce((s, f) => { const tb = f[0] + 1.1; return s + (t > tb ? Math.exp(-(t - tb) * 2.6) * (f[6] / 260) : 0); }, 0);
  function fireworks(ctx, t, scale = 1) {
    for (const f of FW) D.firework(ctx, f[1], H + 100, f[2], f[3], t - f[0], { seed: f[4], colors: FWC[f[5]], r: f[6], n: 70, rise: 1.1, life: 2.8, scale, ring: f[4] % 3 === 0 });
  }

  // ———— S05 年夜烟花：鱼眼里炸开第一朵烟花，雪夜小镇 ————
  MV.shot({ id: 'S05', name: '年夜烟花', at: 6, chapter: '主歌一', tin: { type: 'iris', dur: 1.0, center: 0.35, get x() { return (MV.S04eye || [960, 420])[0]; }, get y() { return (MV.S04eye || [960, 420])[1]; }, ring: '#ffe3a0' }, draw(ctx, s) {
    const t = s.t, u = ease.inOutSine(inv(T(6) - 0.5, T(7) + 0.3, t));
    const flash = clamp(flashAt(t));
    const cam = { x: W / 2 + 60 * u, y: H / 2 - 30 * u, z: 1.02 + 0.05 * u };
    townSky(ctx, t, cam, flash);
    Wd.layer(ctx, cam, 0.3, () => fireworks(ctx, t, 1));
    Wd.layer(ctx, cam, 0.35, () => D.ridge(ctx, { base: 760, amp: 140, freq: 0.0018, seed: 4, x0: -500, x1: W + 500, fill: mix('#1b2150', '#3a3060', flash * 0.5) }));
    Wd.layer(ctx, cam, 0.55, () => Wd.townRow(ctx, { y: 790, n: 14, w0: 120, gap: 30, seed: 3, wall: mixc('#1e2450', '#4a3a60', flash * 0.4), roof: '#131634', t, scale: 0.9, lantern: 0.3 }));
    Wd.layer(ctx, cam, 0.8, () => { Wd.snowGround(ctx, 900, { amp: 30, seed: 2, t, color: mixc(SNOW, '#ffd9b0', flash * 0.35) }); Wd.townRow(ctx, { y: 905, n: 8, w0: 260, gap: 70, seed: 5, t, scale: 1, lantern: 0.6, wall: mixc('#262c5a', '#5a4060', flash * 0.4) }); });
    // 近景：看烟花的人；父亲蹲着点引线
    Wd.layer(ctx, cam, 1, () => {
      Wd.snowGround(ctx, 1010, { amp: 24, seed: 7, t, color: mixc('#dfe6f4', '#ffd9b0', flash * 0.35), shade: '#8e9bc4', warm: [[392, 1010, 260, 0.6], [1450, 1020, 420, 0.25]] });
      const yy = 1012;
      F.draw(ctx, { x: 300, y: yy, s: 300, age: 'man', hair: 'short', outfit: 'pants', pose: F.pose({ spine: 0.38, neck: 0.35, thighF: 1.25, kneeF: 1.35, thighB: -0.05, kneeB: 1.6, footB: 0.9, shoulderF: 1.15, elbowF: 0.25, shoulderB: 0.5, elbowB: 0.6 }), t, color: INK });
      const sp = (t * 7) % 1; D.glow(ctx, 392, 1000, 30 + 26 * sp, '#ffd27a', 0.9); D.flare(ctx, 392, 1000, 26 + 14 * sp, '#fff3c8', 0.8, t * 3);
      F.draw(ctx, { x: 1380, y: yy, s: 330, age: 'woman', hair: 'bun', outfit: 'long', pose: F.mixPose(F.idle(t), F.pose({ neck: -0.35 }), 1), t, color: INK, dir: -1 });
      F.draw(ctx, { x: 1290, y: yy + 4, s: 210, age: 'child', hair: 'bob', outfit: 'coat', pose: F.pose({ neck: -0.45, shoulderF: 2.6, elbowF: 0.3, shoulderB: 2.4, elbowB: 0.3 }), t, color: INK, dir: -1, scarf: { color: '#3d6fb0' } });
      F.draw(ctx, { x: 1560, y: yy + 6, s: 320, age: 'old', hair: 'oldbun', outfit: 'robe', pose: F.pose({ spine: 0.25, neck: -0.25 }), t, color: INK, dir: -1 });
    });
    D.snow(ctx, t, { n: 150, alpha: 0.8, speed: 0.5, wind: 12, seed: 25 });
  } });

  // ———— S06 举着风车奔跑：她举着风车在巷子里跑，金色风线 ————
  const runX = t => (t - T(7)) * 430; // 世界里的奔跑距离
  MV.shot({ id: 'S06', name: '举着风车奔跑', at: 7, tin: { type: 'wipe', dur: 0.7, ang: 0, soft: 300 }, draw(ctx, s) {
    const t = s.t, dx = runX(t);
    const flash = clamp(flashAt(t)) * 0.6;
    const rise = sstep(T(7.6), T(8) + 0.2, t);
    const cam = { x: W / 2, y: H / 2 - 120 * rise, z: 1 };
    townSky(ctx, t, cam, flash);
    Wd.layer(ctx, cam, 0.2, () => fireworks(ctx, t, 0.7));
    Wd.layer(ctx, cam, 0.3, () => D.ridge(ctx, { base: 740, amp: 150, freq: 0.0016, seed: 4, ox: dx * 0.15, x0: -500, x1: W + 500, fill: '#1b2150' }));
    Wd.layer(ctx, cam, 0.5, () => Wd.townRow(ctx, { y: 800, n: 16, w0: 130, gap: 30, seed: 9, ox: dx * 0.35, t, scale: 0.85, lantern: 0.3, wall: '#1f2552' }));
    // 巷子：屋子 + 横跨的灯笼串
    Wd.layer(ctx, cam, 0.8, () => {
      Wd.snowGround(ctx, 880, { amp: 20, ox: dx * 0.8, seed: 5, t, sparkle: 0.5 });
      Wd.townRow(ctx, { y: 885, n: 9, w0: 300, gap: 120, seed: 11, ox: dx * 0.8, t, lantern: 0.8, wall: '#262c5a' });
      ctx.strokeStyle = 'rgba(20,20,40,.7)'; ctx.lineWidth = 2;
      for (let k = -1; k < 4; k++) {
        const x0 = ((k * 700 - dx * 0.8) % 2800 + 2800) % 2800 - 400;
        ctx.beginPath(); ctx.moveTo(x0, 470); ctx.quadraticCurveTo(x0 + 350, 560, x0 + 700, 470); ctx.stroke();
        for (let i = 1; i < 6; i++) { const u = i / 6, lx = x0 + 700 * u, ly = 470 + 4 * 90 * u * (1 - u) * 0.9; PR.lantern(ctx, lx, ly + 10, 16, { t: t + i + k, glow: 0.8, string: 10 }); }
      }
    });
    // 地面：上坡
    const groundY = x => 1010 - rise * Math.max(0, (x - 300)) * 0.18 - 12 * (MV.fbm((x + dx) * 0.003, 2, 3) * 0.5 + 0.5);
    Wd.layer(ctx, cam, 1, () => {
      const path = () => { ctx.beginPath(); ctx.moveTo(-400, H + 600); for (let x = -400; x <= W + 400; x += 20) ctx.lineTo(x, groundY(x)); ctx.lineTo(W + 400, H + 600); ctx.closePath(); };
      path(); ctx.fillStyle = D.lin(ctx, 0, 900, 0, 1180, [[0, '#e9eef8'], [0.4, '#c8d2ea'], [1, '#8794bf']]); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = -400; x <= W + 400; x += 20) x === -400 ? ctx.moveTo(x, groundY(x) + 1) : ctx.lineTo(x, groundY(x) + 1); ctx.stroke();
      // 风线
      for (let i = 0; i < 6; i++) {
        const y = 640 + i * 62 - rise * 90;
        D.windLine(ctx, D.windPath(-200, y, 1600 + i * 120, 40 + i * 6, (i + 1) % 2, 1, i), t, { speed: 0.6 + i * 0.07, offset: i * 0.19, len: 0.32, width: 3, alpha: 1, glowA: 0.35, color: '#f6d79a' });
      }
      // 小女孩：跑
      const gx = 760, gs = 330, gy = groundY(gx) - 4;
      const ph = t * 10.5;
      F.draw(ctx, { x: gx, y: gy, s: gs, age: 'child', hair: 'bob', outfit: 'coat', pose: F.run(ph, 0.95), t, wind: 0.95, scarf: { color: RED, len: 0.42 }, color: INK, rim: [-2, -2, '#5a6aa8'],
        inHand: (c, J) => { const h = J.AF.hand; c.save(); c.scale(1 / gs, 1 / gs); PR.pinwheel(c, h[0] * gs + 10, h[1] * gs - 76, 40, t * 14, { stick: 76, stickColor: INK }); c.restore(); } });
      for (let i = 0; i < 14; i++) { const age = fractional(t * 1.8 + i / 14); D.glow(ctx, gx - 50 - age * 200, gy - age * 50 * Math.abs(Math.sin(i * 1.7)), 12 * (1 - age), '#ffffff', 0.8 * (1 - age), 'source-over'); }
    });
    // 近处虚化的雪堆与灌木（暗色光斑掠过）
    Wd.layer(ctx, cam, 1.7, () => {
      for (let k = 0; k < 4; k++) { const x = ((k * 900 - dx * 1.7) % 3600 + 3600) % 3600 - 700; D.glow(ctx, x, 1130, 420, '#070915', 0.95, 'source-over'); D.glow(ctx, x + 160, 1080, 260, '#0b0e22', 0.9, 'source-over'); }
    });
    D.snow(ctx, t, { n: 150, alpha: 0.85, speed: 0.5, wind: -320, seed: 27 });
  } });

  // ———— 山顶（S07～S10 共用） ————
  const HILL = { x: 1160, y: 820 };
  const HOMEX = HILL.x + 820;
  const slopeY = x => { // 沿小路的地面高度（近似）
    if (x >= HILL.x - 120) return HILL.y + 6 + Math.max(0, x - HILL.x - 200) * 0.03;
    const P0 = [-900, 1120], P1 = [300, 1090], P2 = [700, 840], P3 = [HILL.x - 120, HILL.y + 6];
    let best = P0[1], bd = 1e9;
    for (const p of D.bez(P0, P1, P2, P3, 80)) { const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = p[1]; } } return best;
  };
  function hillScene(ctx, t, cam, o = {}) {
    const { frozen = null, home = false } = o;
    const tf = frozen ? Math.min(t, frozen) : t;
    D.sky(ctx, [[0, '#050717'], [0.45, '#0f1640'], [0.8, '#28306a'], [1, '#4a3f78']], -1800, H);
    Wd.layer(ctx, cam, 0.1, () => { D.milkyWay(ctx, W * 0.45, -120, W * 1.9, 700, -0.35, 1); D.stars(ctx, t, { n: 900, seed: 12, region: [-800, -1900, W + 1600, 2300], size: 0.9 }); });
    // 远处小镇的灯与烟花
    Wd.layer(ctx, cam, 0.3, () => {
      for (const f of FW) D.firework(ctx, f[1] * 0.6 - 100, 900, f[2] * 0.6 - 100, f[3] * 0.6 + 380, tf - f[0] - 8 * Math.floor((tf - f[0]) / 8), { seed: f[4], colors: FWC[f[5]], r: f[6] * 0.45, n: 50, scale: 0.6 });
      D.ridge(ctx, { base: 860, amp: 120, freq: 0.0015, seed: 6, x0: -900, x1: W + 900, fill: '#1a2050' });
      for (let i = 0; i < 90; i++) { const x = -300 + hash(i, 41) * 1500, y = 850 + hash(i, 42) * 90; D.glow(ctx, x, y, 10 + 8 * hash(i, 43), WARM, 0.5 + 0.3 * Math.sin(t * 2 + i)); }
    });
    Wd.layer(ctx, cam, 0.6, () => D.ridge(ctx, { base: 960, amp: 120, freq: 0.002, seed: 9, x0: -900, x1: W + 900, fill: '#141a40' }));
    // 山坡（雪）：右边高
    Wd.layer(ctx, cam, 1, () => {
      const hill = () => { ctx.beginPath(); ctx.moveTo(-900, 1500); ctx.lineTo(-900, 1120); ctx.bezierCurveTo(300, 1090, 700, 840, HILL.x - 120, HILL.y + 6); ctx.quadraticCurveTo(HILL.x + 200, HILL.y - 14, W + 1400, HILL.y + 40); ctx.lineTo(W + 1400, 1500); ctx.closePath(); };
      hill(); ctx.fillStyle = D.lin(ctx, 0, 780, 0, 1250, [[0, '#e4eaf6'], [0.35, '#bfc9e4'], [1, '#6f7cab']]); ctx.fill();
      for (let i = 0; i < 7; i++) { const ex = -200 + i * 420; ctx.fillStyle = 'rgba(110,122,170,.22)'; ctx.beginPath(); ctx.ellipse(ex, slopeY(ex) + 70 + (i % 3) * 70, 260, 18, -0.05, 0, TAU); ctx.fill(); }
      if (home) { ctx.save(); ctx.translate(HOMEX, HILL.y + 40); ctx.scale(1, 0.3); D.glow(ctx, 0, 0, 520, '#ffb35c', 0.35); ctx.restore(); }
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-900, 1121); ctx.bezierCurveTo(300, 1091, 700, 841, HILL.x - 120, HILL.y + 7); ctx.quadraticCurveTo(HILL.x + 200, HILL.y - 13, W + 1400, HILL.y + 41); ctx.stroke();
      for (let i = 0; i < 30; i++) { const px = -300 + hash(i, 71) * 2600, py = slopeY(px) + 20 + hash(i, 72) * 200; const tw = Math.pow(Math.max(0, Math.sin(t * (1.4 + hash(i, 73) * 2) + i * 2.3)), 10); if (tw > 0.05) D.flare(ctx, px, py, 7, '#ffffff', tw * 0.9); }
      // 小路
      ctx.strokeStyle = 'rgba(110,120,165,.4)'; ctx.lineWidth = 6; ctx.setLineDash([2, 22]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-200, 1130); ctx.bezierCurveTo(300, 1100, 700, 860, HILL.x - 60, HILL.y + 6); ctx.quadraticCurveTo(HILL.x + 300, HILL.y - 6, HOMEX - 160, HILL.y + 34); ctx.stroke(); ctx.setLineDash([]);
      Wd.pine(ctx, HILL.x + 330, HILL.y + 4, 230, '#141a3a', 0.9);
      Wd.pine(ctx, HILL.x + 470, HILL.y + 14, 160, '#141a3a', 0.9);
      if (home) PR.house(ctx, HOMEX, HILL.y + 44, 420, 340, { snow: 1, lantern: true, t, chimney: true, smoke: 1, seed: 7, papercut: { type: 'fish', seed: 1, size: 0.9 }, wall: '#2e3466' });
    });
  }

  // ———— S07 金色光带：山顶，金色的光带绕着她，落进手心 ————
  const ribbonPath = (() => {
    const pts = [];
    const P0 = [-300, 300], P1 = [400, 100], P2 = [900, 900], P3 = [HILL.x - 150, HILL.y - 300];
    for (const p of D.bez(P0, P1, P2, P3, 60)) pts.push(p);
    const cx = HILL.x + 10, cy = HILL.y - 150;
    for (let i = 1; i <= 90; i++) { const u = i / 90, a = Math.PI + u * TAU * 1.75, r = lerp(170, 6, ease.inQuad(u)); pts.push([cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 0.55 + lerp(-150, 60, u) * (1 - u)]); }
    return pts;
  })();
  const handsAt = [HILL.x + 48, HILL.y - 118];
  MV.shot({ id: 'S07', name: '金色光带', at: 8, tin: { type: 'fade', dur: 0.6 }, draw(ctx, s) {
    const t = s.t;
    const k0 = ease.inOutSine(inv(T(8), T(9), t));
    const cam = { x: lerp(W / 2 + 160, W / 2 + 60, k0), y: lerp(H / 2 - 40, H / 2 - 60, k0), z: lerp(1.6, 1.42, k0) };
    hillScene(ctx, t, cam);
    const stop = ease.outCubic(inv(T(8) - 0.2, T(8) + 1.0, t));
    const cup = sstep(T(8) + 2.0, T(8) + 2.7, t);
    const look = sstep(T(9) - 0.9, T(9) - 0.1, t);
    const rib = ease.inOutSine(inv(T(8) + 0.4, T(8) + 3.0, t));
    Wd.layer(ctx, cam, 1, () => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const f1 = rib, f0 = clamp(rib - 0.3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [w, a] of [[26, 0.08], [11, 0.22], [4, 0.6], [1.6, 0.95]]) { ctx.strokeStyle = css('#ffd98a', a * (1 - sstep(0.97, 1, rib) * 0.75)); ctx.lineWidth = w; ctx.beginPath(); D.strokePart(ctx, ribbonPath, f0, f1); ctx.stroke(); }
      ctx.restore();
      const head = ribbonPath[Math.min(ribbonPath.length - 1, Math.floor(f1 * (ribbonPath.length - 1)))];
      if (rib < 0.999) { D.glow(ctx, head[0], head[1], 46, '#ffe7b0', 0.95); D.flare(ctx, head[0], head[1], 40, '#fff6dc', 0.8, t); }
      // 光带掉下的金粉
      for (let i = 0; i < 40; i++) { const f = clamp(rib - i * 0.006), p = ribbonPath[Math.floor(f * (ribbonPath.length - 1))]; const age = i * 0.06; D.glow(ctx, p[0] + Math.sin(i * 7) * 10, p[1] + age * 60, 6, '#ffe3a0', 0.7 * (1 - i / 40) * (1 - sstep(0.98, 1, rib))); }
      const p = F.mixPose(F.run(t * 10.5 * (1 - stop) + stop * 2, 0.95 * (1 - stop)), F.idle(t), stop);
      const p2 = F.mixPose(p, F.pose({ shoulderF: 0.9, elbowF: 1.5, shoulderB: 0.8, elbowB: 1.6, spine: 0.06, neck: 0.25 }), cup);
      const p3 = F.mixPose(p2, F.pose({ shoulderF: 1.1, elbowF: 1.2, shoulderB: 1.0, elbowB: 1.3, spine: -0.05, neck: -0.6 }), look);
      F.draw(ctx, { x: HILL.x, y: HILL.y + 4, s: 250, age: 'child', hair: 'bob', outfit: 'coat', pose: p3, t, wind: lerp(0.9, 0.35, stop), scarf, color: INK, rim: [-1.5, -1.5, '#ffe0a0'] });
      const orb = sstep(0.985, 1, rib) + cup * 0.3;
      if (orb > 0) { D.glow(ctx, handsAt[0], handsAt[1] - look * 14, 80 + 10 * Math.sin(t * 4), '#ffd98a', orb * 0.9); D.glow(ctx, handsAt[0], handsAt[1] - look * 14, 16, '#fffbe8', orb); }
    });
    D.snow(ctx, t, { n: 110, alpha: 0.7, speed: 0.4, wind: 20, seed: 29 });
  } });

  // ———— S08 星河入手：镜头拉远上摇，星星流进她手里 ————
  MV.shot({ id: 'S08', name: '星河入手', at: 9, draw(ctx, s) {
    const t = s.t;
    const u = ease.inOutCubic(inv(T(9), T(9) + 2.8, t));
    const cam = { x: lerp(W / 2 + 60, W / 2 + 200, u), y: lerp(H / 2 - 60, H / 2 - 330, u), z: lerp(1.42, 0.62, u) };
    hillScene(ctx, t, cam);
    const raise = sstep(T(9) + 0.6, T(9) + 2.2, t);
    const hx = HILL.x + 30, hy = HILL.y - 250;
    Wd.layer(ctx, cam, 1, () => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const on = sstep(T(9) + 0.4, T(9) + 1.4, t);
      for (let i = 0; i < 120; i++) {
        const sx = -900 + hash(i, 61) * (W + 1800), sy = -1700 + hash(i, 62) * 1400;
        const ph = fractional(hash(i, 63) + (t - T(9)) * (0.2 + 0.15 * hash(i, 64)));
        const e = ease.inCubic(ph);
        const mx = lerp(sx, hx, e) + Math.sin(ph * 6 + i) * 60 * (1 - e), my = lerp(sy, hy, e);
        const col = i % 3 ? '#ffe7b0' : '#cfe0ff';
        D.glow(ctx, mx, my, 30 * (1 - e * 0.6), col, on * 0.7 * sstep(0, 0.1, ph));
        ctx.fillStyle = css('#fffaeb', on); ctx.beginPath(); ctx.arc(mx, my, 2.6 * (1 - e * 0.5), 0, TAU); ctx.fill();
        const e2 = ease.inCubic(Math.max(0, ph - 0.04)), tx = lerp(sx, hx, e2) + Math.sin((ph - 0.04) * 6 + i) * 60 * (1 - e2), ty = lerp(sy, hy, e2);
        ctx.strokeStyle = css(col, on * 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(mx, my); ctx.stroke();
      }
      ctx.restore();
      const p = F.mixPose(F.pose({ shoulderF: 1.1, elbowF: 1.2, shoulderB: 1.0, elbowB: 1.3, spine: -0.05, neck: -0.6 }), F.pose({ shoulderF: 2.75, elbowF: 0.25, shoulderB: 2.6, elbowB: 0.3, spine: -0.12, neck: -0.75 }), raise);
      F.draw(ctx, { x: HILL.x, y: HILL.y + 4, s: 250, age: 'child', hair: 'bob', outfit: 'coat', pose: p, t, wind: 0.35, scarf, color: INK, rim: [-1.5, -1.5, '#ffe0a0'] });
      const by = lerp(HILL.y - 132, hy, raise), bx = lerp(HILL.x + 48, hx, raise);
      const k = 0.6 + 0.9 * sstep(T(9) + 1, T(10), t);
      D.glow(ctx, bx, by, 220 * k, '#ffd98a', 0.6);
      D.glow(ctx, bx, by, 60 * k, '#fff8e0', 0.95);
      D.flare(ctx, bx, by, 180 * k, '#fff3d0', 0.7, 0.3);
      D.stars(ctx, t, { n: 40, seed: 66, region: [bx - 50 * k, by - 50 * k, 100 * k, 100 * k], size: 1.4, color: '#ffffff' });
    });
    D.snow(ctx, t, { n: 90, alpha: 0.6, speed: 0.4, wind: 20, seed: 29 });
  } });

  // ———— S09 雪停在半空：雪停在半空，金色钟面停摆；她回头，外婆提灯上山 ————
  const FREEZE = () => T(10) + 0.15, RESUME = () => T(11) + 0.8;
  const snowClock = (i, t) => { const f = FREEZE(), r = RESUME(); if (t < f) return t; if (t < r) return f + (1 - Math.exp(-(t - f) * 6)) * 0.12; return f + 0.12 + (t - r) * 0.35 * sstep(r, r + 2, t); };
  const grandmaX = t => lerp(380, HILL.x - 230, ease.inOutSine(inv(T(10) + 0.4, T(11) + 0.6, t)));
  MV.shot({ id: 'S09', name: '雪停在半空', at: 10, draw(ctx, s) {
    const t = s.t;
    const k0 = ease.inOutSine(inv(T(10), T(11), t));
    const kin = ease.inOutCubic(inv(T(10), T(10) + 1.5, t));
    const cam = { x: lerp(W / 2 + 200, lerp(HILL.x - 260, HILL.x - 330, k0), kin), y: lerp(H / 2 - 330, HILL.y - 170, kin), z: Math.exp(lerp(Math.log(0.62), Math.log(lerp(1.6, 1.68, k0)), kin)) };
    hillScene(ctx, t, cam, { frozen: FREEZE() });
    const turn = sstep(T(10) + 1.0, T(10) + 1.5, t);
    Wd.layer(ctx, cam, 1, () => {
      // 钟面
      const cu = ease.outCubic(inv(FREEZE() - 0.1, FREEZE() + 0.9, t)), fade = 1 - sstep(T(11) + 0.4, T(11) + 1.4, t);
      if (cu > 0 && fade > 0) {
        const cx = HILL.x, cy = HILL.y - 130, R = 200;
        ctx.save(); ctx.globalAlpha = fade; ctx.lineCap = 'round';
        ctx.strokeStyle = css(GOLD, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * cu); ctx.stroke();
        ctx.strokeStyle = css(GOLD, 0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R + 12, -Math.PI / 2, -Math.PI / 2 - TAU * cu, true); ctx.stroke();
        for (let i = 0; i < 60; i++) { const a = i / 60 * TAU - Math.PI / 2, on = sstep(0, 0.03, cu - i / 60); const big = i % 5 === 0; ctx.strokeStyle = css(GOLD, (big ? 0.7 : 0.3) * on); ctx.lineWidth = big ? 2.5 : 1; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - (big ? 18 : 10)), cy + Math.sin(a) * (R - (big ? 18 : 10))); ctx.lineTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4)); ctx.stroke(); }
        const ha = -Math.PI / 2 + TAU * (0.6 * ease.outBack(clamp((t - FREEZE() + 0.1) / 1.2), 1.4));
        ctx.strokeStyle = css('#ffe3a0', 0.95); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - Math.cos(ha) * 20, cy - Math.sin(ha) * 20); ctx.lineTo(cx + Math.cos(ha) * (R - 34), cy + Math.sin(ha) * (R - 34)); ctx.stroke();
        D.glow(ctx, cx, cy, 30, '#ffe3a0', 0.6);
        ctx.restore();
      }
      // 外婆提着灯笼走上来
      const gx = grandmaX(t), gy = slopeY(gx);
      const moving = t < T(11) + 0.6;
      F.draw(ctx, { x: gx, y: gy + 4, s: 300, age: 'old', hair: 'oldbun', outfit: 'robe', pose: F.mixPose(moving ? F.walk(t * 3.2, 0.6) : F.idle(t), F.pose({ spine: 0.3, neck: -0.2 }), 0.5), t, color: INK, wind: 0.2,
        inHand: (c, J) => { const h = J.AF.hand; c.save(); c.scale(1 / 300, 1 / 300); PR.lantern(c, h[0] * 300 + 6, h[1] * 300 + 6, 20, { t, glow: 1, string: 18 }); c.restore(); } });
      D.glow(ctx, gx + 60, gy - 120, 260, '#ff9d4a', 0.28);
      const p = F.mixPose(F.pose({ shoulderF: 2.75, elbowF: 0.25, shoulderB: 2.6, elbowB: 0.3, spine: -0.12, neck: -0.75 }), F.pose({ neck: 0.12, shoulderF: 0.1, elbowF: 0.3 }), sstep(T(10), T(10) + 1.2, t));
      F.draw(ctx, { x: HILL.x, y: HILL.y + 4, s: 250, age: 'child', hair: 'bob', outfit: 'coat', pose: p, t, dir: (turn < 0.5 ? 1 : -1) * Math.max(0.12, Math.abs(Math.cos(turn * Math.PI))), wind: 0.25, scarf, color: INK, rim: [1.5, -1.5, '#ffcf90'] });
      if (t < T(10) + 1.4) { const k = 1 - sstep(T(10), T(10) + 1.4, t), dn = sstep(T(10), T(10) + 1.2, t); D.glow(ctx, lerp(HILL.x + 30, HILL.x + 48, dn), lerp(HILL.y - 250, HILL.y - 132, dn), lerp(220, 90, dn), '#ffd98a', 0.75 * k); }
    });
    D.snow(ctx, t, { n: 130, alpha: 0.8, speed: 0.4, wind: 20, seed: 29, freeze: snowClock });
    // 近处的大雪片：停住，带一点虚化
    for (let i = 0; i < 16; i++) {
      const tt = snowClock(i, t), x = fractional(hash(i, 91) + tt * 0.01) * W, y = fractional(hash(i, 92) + tt * 0.06) * H;
      D.glow(ctx, x, y, 22 + 26 * hash(i, 93), '#ffffff', 0.55, 'source-over');
    }
  } });

  // ———— S10 牵手回家：外婆牵着她慢慢走回家；脚印，雪又飘起来 ————
  MV.shot({ id: 'S10', name: '牵手回家', at: 11, draw(ctx, s) {
    const t = s.t;
    const k0 = ease.inOutSine(inv(T(11), T(12) + 0.5, t));
    const kout = ease.inOutCubic(inv(T(11), T(11) + 1.6, t)), push = ease.inCubic(inv(T(12) - 1.4, T(12) + 0.5, t));
    const cam0 = { x: lerp(HILL.x - 330, lerp(HILL.x - 80, HILL.x + 380, k0), kout), y: lerp(HILL.y - 170, lerp(H / 2 + 30, H / 2 + 50, k0), kout), z: Math.exp(lerp(Math.log(1.68), Math.log(lerp(1.0, 0.92, k0)), kout)) };
    const cam = { x: lerp(cam0.x, HOMEX + 67, push), y: lerp(cam0.y, HILL.y - 50, push), z: cam0.z * Math.exp(push * Math.log(4.5)) };
    hillScene(ctx, t, cam, { frozen: FREEZE(), home: true });
    const meet = sstep(T(11) + 0.6, T(11) + 1.2, t);
    const go = inv(T(11) + 1.3, T(12) + 1.2, t);
    Wd.layer(ctx, cam, 1, () => {
      const gx0 = HILL.x - 230, cx0 = HILL.x;
      const walkD = go * 560;
      const gx = lerp(Math.min(gx0, grandmaX(t)), gx0 + 110, meet) + walkD, cx = lerp(cx0, gx0 + 200, meet) + walkD;
      const turn = sstep(T(11) + 1.0, T(11) + 1.4, t), cdir = (turn < 0.5 ? -1 : 1) * Math.max(0.12, Math.abs(Math.cos(turn * Math.PI)));
      const walkPh = (t - T(11) - 1.0) * 3.3;
      ctx.fillStyle = 'rgba(105,115,160,.4)';
      for (let i = 0; i < 26; i++) { const fx = gx0 + 150 + i * 26; if (fx > gx - 40) break; ctx.beginPath(); ctx.ellipse(fx, slopeY(fx) + 6 + (i % 2) * 7, 7, 3, 0, 0, TAU); ctx.fill(); }
      const moving = go > 0.001 && go < 0.999;
      const gp = moving ? F.walk(walkPh, 0.5, { stride: 0.28 }) : F.idle(t);
      const cp = moving ? F.walk(walkPh * 1.35, 0.6) : F.idle(t + 1);
      const gPose = F.mixPose(gp, F.pose({ spine: 0.3, neck: -0.12 }), 0.6);
      // 牵手：两只手在两人之间相遇
      const gy = slopeY(gx) + 4, cy = slopeY(cx) + 6;
      const M = [lerp(gx, cx, 0.52), Math.min(gy, cy) - 112];
      gPose.reachF = [(M[0] - gx) / 300, (M[1] - gy) / 300];
      F.draw(ctx, { x: gx, y: gy, s: 300, age: 'old', hair: 'oldbun', outfit: 'robe', pose: gPose, t, color: INK, wind: 0.2,
        inHand: (c, J) => { const h = J.AB.hand; c.save(); c.scale(1 / 300, 1 / 300); PR.lantern(c, h[0] * 300 - 4, h[1] * 300 + 6, 20, { t, glow: 1, string: 18 }); c.restore(); } });
      D.glow(ctx, gx - 10, gy - 120, 260, '#ff9d4a', 0.28);
      const cPose = F.mixPose(cp, F.pose({ neck: -0.15 }), 0.3);
      cPose.reachB = [(M[0] - cx) / 250, (M[1] - cy) / 250];
      if (turn < 1) { delete cPose.reachB; }
      F.draw(ctx, { x: cx, y: cy, s: 250, age: 'child', hair: 'bob', outfit: 'coat', pose: cPose, t, wind: 0.25, scarf, color: INK, dir: cdir });
    });
    D.snow(ctx, t, { n: 130, alpha: 0.8, speed: 0.4, wind: 20, seed: 29, freeze: snowClock });
  } });

  // ———— 卧室（S11） ————
  const BWIN = { x: 1250, y: 370, w: 400, h: 330 };
  const nightView = t => (c, x, y, w, h) => {
    c.fillStyle = D.lin(c, 0, y, 0, y + h, [[0, '#1a2762'], [1, '#41478f']]); c.fillRect(x, y, w, h);
    D.stars(c, t, { n: 50, seed: 81, region: [x, y, w, h * 0.7], size: 0.8 });
    D.moon(c, x + w * 0.8, y + h * 0.2, 24, 0.3, '#f6efd8', 1, -0.4);
    c.fillStyle = '#131536'; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + h * 0.72); c.lineTo(x + w * 0.38, y + h * 0.6); c.lineTo(x + w * 0.66, y + h * 0.8); c.lineTo(x + w, y + h * 0.7); c.lineTo(x + w, y + h); c.fill();
    c.strokeStyle = '#dfe6f4'; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y + h * 0.72); c.lineTo(x + w * 0.38, y + h * 0.6); c.lineTo(x + w * 0.66, y + h * 0.8); c.lineTo(x + w, y + h * 0.7); c.stroke();
    D.snow(c, t, { n: 26, seed: 85, region: [x, y, w, h], speed: 0.4, wind: 10, alpha: 0.8 });
  };
  function bedroom(ctx, t, o = {}) {
    const { fishOn = 1 } = o;
    Wd.room(ctx, t, { win: BWIN, view: nightView(t), papercut: { type: 'fish', alpha: fishOn, size: 0.42 }, light: ['#7f9cff', 0.22], curtain: '#2a2346', wall: ['#24264c', '#17183a'] });
    // 月光落在地上
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.1; ctx.fillStyle = '#9fb4ff';
    ctx.beginPath(); ctx.moveTo(BWIN.x - BWIN.w / 2, BWIN.y + BWIN.h / 2); ctx.lineTo(BWIN.x + BWIN.w / 2, BWIN.y + BWIN.h / 2); ctx.lineTo(BWIN.x + BWIN.w / 2 - 300, H + 40); ctx.lineTo(BWIN.x - BWIN.w / 2 - 460, H + 40); ctx.fill(); ctx.restore();
    // 床头柜和油灯
    D.glow(ctx, 190, 660, 340, '#ffb35c', 0.42);
    ctx.fillStyle = '#0e0f25'; ctx.fillRect(120, 700, 150, 300);
    ctx.fillStyle = '#5a3420'; ctx.beginPath(); ctx.moveTo(172, 700); ctx.lineTo(180, 676); ctx.lineTo(206, 676); ctx.lineTo(214, 700); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,235,.95)'; ctx.beginPath(); ctx.ellipse(193, 662, 6, 11, 0, 0, TAU); ctx.fill();
    D.glow(ctx, 193, 662, 40, '#ffe0a0', 0.9);
    // 墙上挂着一张年画（暗）
    ctx.fillStyle = 'rgba(120,40,40,.35)'; ctx.fillRect(520, 250, 180, 240); ctx.strokeStyle = 'rgba(230,180,90,.25)'; ctx.lineWidth = 3; ctx.strokeRect(520, 250, 180, 240);
    Wd.bed(ctx, 300, 990, 820, { t });
  }
  MV.shot({ id: 'S11', name: '窗花鱼醒来', at: 12, tin: { type: 'fade', dur: 1.4 }, look: { vignette: 0.6 }, draw(ctx, s) {
    const t = s.t;
    const k0 = ease.inOutSine(inv(T(12), T(13), t));
    const cam = { x: lerp(W / 2 - 20, W / 2 + 60, k0), y: lerp(H / 2, H / 2 - 30, k0), z: lerp(1.0, 1.1, k0) };
    const lift = ease.inOutCubic(inv(T(12) + 1.6, T(13) + 0.2, t));
    Wd.layer(ctx, cam, 1, () => {
      bedroom(ctx, t, { fishOn: 1 - sstep(T(12) + 1.4, T(12) + 1.8, t) });
      // 外婆坐在床边的矮凳上，侧身轻拍被子，然后起身望向窗
      const pat = Math.max(0, Math.sin((t - T(12)) * 5.0)) * (1 - sstep(T(12) + 2.0, T(12) + 2.6, t));
      const turn = sstep(T(12) + 1.3, T(12) + 2.2, t);
      const gx = 720, gy = 1010, gs = 470;
      const pose = F.sit({ spine: lerp(0.38, 0.12, turn), neck: lerp(0.4, -0.3, turn) });
      pose.reachF = [(560 - gx) / -gs + 0.0, (760 + pat * -14 - gy) / gs];
      pose.reachB = [0.12, -0.46];
      // 矮凳
      ctx.fillStyle = '#0a0b1c'; ctx.fillRect(gx - 60, gy - 132, 120, 20); ctx.fillRect(gx - 50, gy - 122, 14, 122); ctx.fillRect(gx + 36, gy - 122, 14, 122);
      F.draw(ctx, { x: gx, y: gy - 10, s: gs, age: 'old', hair: 'oldbun', outfit: 'robe', pose, t, color: '#0b0c1c', dir: -1, rim: [2, -2, '#3a4478'] });
      // 窗花鱼活过来：从窗上游下来，绕过她们，带出金粉
      if (t > T(12) + 1.3) {
        const u = clamp((t - (T(12) + 1.3)) / 2.6);
        const path = D.bez([BWIN.x + BWIN.w / 4, BWIN.y - BWIN.h / 4 + 10], [900, 80], [260, 360], [560, 560], 60);
        const i = Math.min(path.length - 2, Math.floor(ease.inOutSine(u) * (path.length - 1)));
        const p = path[i], q = path[i + 1];
        const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
        for (let k = 0; k < 18; k++) { const j = Math.max(0, i - k * 2), pp = path[j]; D.glow(ctx, pp[0] + Math.sin(k + t * 3) * 6, pp[1] + Math.cos(k * 2) * 6, 10, '#ffd98a', 0.5 * (1 - k / 18)); }
        PC.draw(ctx, 'fish', p[0], p[1] + Math.sin(t * 5) * 6, 170 + 70 * u, { seed: 1, color: mixc('#b01e18', '#e04030', u), rot: ang + Math.PI * (Math.cos(ang) < 0 ? 1 : 0), flip: Math.cos(ang) < 0 ? -1 : 1, glow: 0.3 + 0.4 * u, glowColor: '#ff8a5a' });
      }
    });
    // 梦的光从上面漫下来
    ctx.globalAlpha = lift * 0.9; ctx.fillStyle = D.lin(ctx, 0, 0, 0, H, [[0, '#ffcf8a', 0.8], [1, '#c8231d', 0.1]]); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  } });


  // ———— S12 剪纸梦境：红纸梦境，她骑着鱼游过；大团花展开 ————
  MV.shot({ id: 'S12', name: '剪纸梦境', at: 13, tin: { type: 'fade', dur: 0.6 }, look: { vignette: 0.5, grain: 0.08 }, draw(ctx, s) {
    const t = s.t, lt = t - T(13);
    // 层层红纸
    D.sky(ctx, [[0, '#5a0d12'], [0.6, '#8e1a1c'], [1, '#b8321f']]);
    const bloom = ease.outCubic(inv(T(13) + 1.6, T(13) + 3.4, t));
    // 背后的大团花
    PC.draw(ctx, 'flower', W / 2, H / 2 + 20, 900 * (0.75 + 0.25 * bloom), { seed: 2, N: 12, color: '#e0a640', alpha: 0.95 * sstep(0, 0.05, bloom), unfold: bloom, rot: lt * 0.05, glow: 0.4 * bloom, glowColor: '#ffcf7a' });
    // 纸云层（视差）
    for (let layer = 0; layer < 3; layer++) {
      const sp = 50 + layer * 80, col = ['#b8342a', '#d39a3c', '#eab656'][layer], sc = [0.8, 1.05, 1.4][layer];
      for (let i = 0; i < 6; i++) {
        const x = ((hash(i, 50 + layer) * 2600 - lt * sp) % 2600 + 2600) % 2600 - 300, y = 160 + hash(i, 60 + layer) * 760 * (0.4 + layer * 0.3) + layer * 120;
        const sz = (70 + 60 * hash(i, 70 + layer)) * sc, bob = Math.sin(i * 2 + lt * (0.8 + layer * 0.3)) * 8;
        Wd.auspicious(ctx, x + 10 * sc, y + bob + 14 * sc, sz, { color: '#3a0608', a: 0.35, flip: i % 2 ? 1 : -1, line: '#3a0608' });
        Wd.auspicious(ctx, x, y + bob, sz, { color: col, a: 0.95, flip: i % 2 ? 1 : -1 });
      }
    }
    // 纸月亮
    ctx.fillStyle = '#f3d9a0'; ctx.beginPath(); ctx.arc(1600, 200, 70, 0, TAU); ctx.fill();
    PC.draw(ctx, 'flower', 1600, 200, 120, { seed: 9, color: '#c8401f', alpha: 0.5 });
    // 鱼载着她
    const fx = lerp(200, 1500, ease.inOutSine(inv(T(13) - 0.3, T(14) + 0.5, t))), fy = 620 + Math.sin(lt * 2.2) * 50 - 140 * Math.sin(Math.PI * clamp(lt / 3.8));
    const fa = Math.cos(lt * 2.2) * 0.18 - 0.1;
    PC.draw(ctx, 'fish', fx, fy, 380, { seed: 1, color: '#f6e7c8', rot: fa, glow: 0.35, glowColor: '#ffe0a0', shadow: 0.35, shadowOff: [10, 16] });
    F.draw(ctx, { x: fx - 24, y: fy - 22, s: 240, age: 'child', hair: 'bob', outfit: 'coat', pose: Object.assign(F.sit({ spine: -0.1, neck: -0.2, shoulderF: 2.4, elbowF: 0.4, shoulderB: 2.1, elbowB: 0.5 }), { rot: fa }), t, color: '#5a0d12', wind: 0.8, scarf: { color: '#f3d9a0' } });
    // 金粉
    D.dust(ctx, t, { n: 90, color: '#ffe3a0', alpha: 0.8, drift: 30, seed: 17 });
  } });

  // —— 第 1～4 句的版式 ——
  MV.LYRIC_STYLE = Object.assign(MV.LYRIC_STYLE || {}, {
    1: { y: 950, size: 50, weight: 300, spacing: 0.28, gap: 1.4, backdrop: 0.8 },
    2: { y: 950, size: 50, weight: 300, spacing: 0.28, gap: 1.4, backdrop: 0.7 },
    3: { y: 950, size: 50, weight: 300, spacing: 0.3, gap: 1.6, backdrop: 0.7 },
    4: { y: 950, size: 50, weight: 300, spacing: 0.28, gap: 1.4, backdrop: 0.4 },
  });
})();

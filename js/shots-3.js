// 第三组：第二段主歌（第 9～12 句）+ 第二段副歌（第 13～16 句）——海边的青春与爱情，婚礼，新家，孩子，变老
(() => {
  const { W, H, TAU, clamp, lerp, inv, ease, sstep, win, css, mix, mixc, hash, rng, noise1, fbm, bar: T, beatTime, beatAt, pulse } = MV;
  const D = MV.draw, F = MV.figure, PC = MV.papercut, PR = MV.props, Wd = MV.world;
  const fr = x => x - Math.floor(x);
  const B = MV.audioData.beatLen;
  const At = sec => (beatAt(sec) - 2) / 4; // 秒 → 小节号（镜头按人声对齐）
  const GOLD = '#f2c46d', RED = '#d8352a';
  const SIL = '#2a1830'; // 黄昏里的剪影色
  const her = (o) => Object.assign({ age: 'woman', hair: 'long', outfit: 'long', color: SIL, scarf: { color: RED, len: 0.34 } }, o);
  const him = (o) => Object.assign({ age: 'man', hair: 'short', outfit: 'pants', color: SIL }, o);

  // ———— 黄昏海边（S26～S31 共用） ————
  const DUSK = [[0, '#3a2c6a'], [0.35, '#8a4a7a'], [0.62, '#e07a6a'], [0.82, '#f8a868'], [1, '#ffd9a0']];
  const HZ = 640; // 海平线
  function seaSky(ctx, t, cam, o = {}) {
    const { sunX = 1300, sunY = 560, sunR = 110, warm = 0 } = o;
    D.sky(ctx, DUSK.map(([p, c]) => [p, mixc(c, '#ffb070', warm * 0.3)]), -500, HZ + 10);
    Wd.layer(ctx, cam, 0.05, () => {
      D.stars(ctx, t, { n: 120, seed: 91, region: [-300, -500, W + 600, 500], alpha: 0.5, fadeY: [-100, 300] });
      D.glow(ctx, sunX, sunY, sunR * 7, '#ffcf8a', 0.55);
      D.glow(ctx, sunX, sunY, sunR * 2.6, '#fff0c8', 0.7);
      ctx.fillStyle = D.lin(ctx, 0, sunY - sunR, 0, sunY + sunR, [[0, '#fff6dc'], [1, '#ffd28a']]); ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, TAU); ctx.fill();
      // 薄云带
      for (let i = 0; i < 5; i++) { const y = 200 + i * 70, x = ((i * 480 + t * (6 + i * 3)) % 2600) - 400; ctx.fillStyle = css(mixc('#f0a090', '#6a4a8a', i / 5), 0.45); ctx.beginPath(); ctx.ellipse(x, y, 380 + i * 40, 10 + i * 2, 0, 0, TAU); ctx.fill(); }
    });
    Wd.layer(ctx, cam, 0.15, () => {
      // 远岛与灯塔
      ctx.fillStyle = '#5a3a6a'; ctx.beginPath(); ctx.moveTo(-200, HZ); ctx.quadraticCurveTo(150, HZ - 70, 420, HZ); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1650, HZ); ctx.quadraticCurveTo(1800, HZ - 40, 2100, HZ); ctx.closePath(); ctx.fill();
      // 灯塔：收分的塔身、两道深色带、回廊、灯室和穹顶；旁边一间守塔人的小屋；光束慢慢扫过海面
      { const lx = 262, lb = HZ - 40, lh = 96, ink = '#4a2e5a';
        ctx.fillStyle = ink; ctx.fillRect(lx - 46, lb - 16, 30, 16); ctx.beginPath(); ctx.moveTo(lx - 50, lb - 16); ctx.lineTo(lx - 31, lb - 30); ctx.lineTo(lx - 12, lb - 16); ctx.fill();
        ctx.fillStyle = 'rgba(255,210,150,.8)'; ctx.fillRect(lx - 38, lb - 11, 6, 6);
        ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(lx - 15, lb); ctx.lineTo(lx + 15, lb); ctx.lineTo(lx + 9, lb - lh); ctx.lineTo(lx - 9, lb - lh); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a2048'; for (const f of [0.28, 0.6]) { const y = lb - lh * f, hw = lerp(15, 9, f); ctx.fillRect(lx - hw, y - 7, hw * 2, 12); }
        ctx.fillStyle = 'rgba(255,190,150,.35)'; ctx.beginPath(); ctx.moveTo(lx + 3, lb); ctx.lineTo(lx + 15, lb); ctx.lineTo(lx + 9, lb - lh); ctx.lineTo(lx + 2, lb - lh); ctx.fill();
        ctx.fillStyle = ink; ctx.fillRect(lx - 14, lb - lh - 4, 28, 5); ctx.fillRect(lx - 7, lb - lh - 20, 14, 2);
        ctx.fillStyle = '#fff2c8'; ctx.fillRect(lx - 6, lb - lh - 18, 12, 14);
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(lx, lb - lh - 19, 8, Math.PI, TAU); ctx.fill(); ctx.fillRect(lx - 1, lb - lh - 32, 2, 6);
        const a = t * 0.8, k = Math.cos(a), L = 900 * (0.35 + 0.65 * Math.abs(Math.sin(a)));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const dir = Math.sign(Math.sin(a)) || 1, g = ctx.createLinearGradient(lx, 0, lx + dir * L, 0);
        g.addColorStop(0, css('#fff2c8', 0.32 * (0.4 + 0.6 * Math.abs(k)))); g.addColorStop(1, css('#fff2c8', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, lb - lh - 11); ctx.lineTo(lx + dir * L, lb - lh - 11 - 40); ctx.lineTo(lx + dir * L, lb - lh - 11 + 30); ctx.closePath(); ctx.fill();
        ctx.restore();
        D.glow(ctx, lx, lb - lh - 11, 36 + 30 * Math.abs(k), '#fff2c0', 0.55 + 0.4 * Math.abs(k)); }
      D.sea(ctx, HZ, t, { top: '#d87a72', bottom: '#4a2e62', sunX: sunX, sunColor: '#ffe0a8', glitter: 1, waveA: 0.06 });
    });
  }
  // 海堤：长长的一道，堤上有路灯
  function seawall(ctx, t, o = {}) {
    const { y = 900, x0 = -400, x1 = W + 400, lamps = true, ox = 0 } = o;
    ctx.fillStyle = D.lin(ctx, 0, y, 0, y + 200, [[0, '#3a2440'], [1, '#1c1024']]); ctx.fillRect(x0, y, x1 - x0, H + 400);
    ctx.fillStyle = '#4a2e4e'; ctx.fillRect(x0, y - 8, x1 - x0, 12);
    ctx.strokeStyle = '#2a1830'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y - 60); ctx.lineTo(x1, y - 60); ctx.stroke();
    for (let x = x0 - ((ox % 90) + 90) % 90; x < x1; x += 90) { ctx.fillRect(x, y - 60, 5, 60); }
    if (lamps) for (let k = 0; k < 6; k++) {
      const x = ((k * 520 - ox) % 3120 + 3120) % 3120 - 400;
      ctx.fillStyle = '#2a1830'; ctx.fillRect(x - 4, y - 260, 8, 260); ctx.beginPath(); ctx.moveTo(x, y - 260); ctx.quadraticCurveTo(x + 40, y - 290, x + 60, y - 260); ctx.lineWidth = 6; ctx.strokeStyle = '#2a1830'; ctx.stroke();
      D.glow(ctx, x + 60, y - 250, 60, '#ffd28a', 0.7); ctx.fillStyle = '#fff0c8'; ctx.beginPath(); ctx.arc(x + 60, y - 252, 7, 0, TAU); ctx.fill();
    }
  }
  function guitar(c, x, y, s, a) {
    c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = SIL;
    c.beginPath(); c.ellipse(0, 0, s * 0.16, s * 0.13, 0, 0, TAU); c.ellipse(s * 0.17, 0, s * 0.12, s * 0.1, 0, 0, TAU); c.fill();
    c.fillRect(s * 0.25, -s * 0.025, s * 0.42, s * 0.05); c.fillRect(s * 0.65, -s * 0.04, s * 0.08, s * 0.08);
    c.fillStyle = '#ffb880'; c.beginPath(); c.arc(s * 0.05, 0, s * 0.035, 0, TAU); c.fill();
    c.restore();
  }
  // 音符：从吉他飘出的金色五线谱带
  function noteRibbon(ctx, t, x, y, x2, y2, a = 1) {
    const pts = D.bez([x, y], [x + 300, y - 260], [x2 - 300, y2 - 220], [x2, y2], 50);
    for (let k = 0; k < 3; k++) D.windLine(ctx, pts.map(p => [p[0], p[1] + k * 10]), t, { speed: 0.35, offset: k * 0.08, len: 0.5, width: 1.4, alpha: 0.8 * a, glowA: 0.2, color: GOLD });
    for (let i = 0; i < 6; i++) { const f = fr(t * 0.35 + i / 6), p = pts[Math.floor(f * (pts.length - 1))]; const al = a * Math.sin(f * Math.PI);
      ctx.save(); ctx.translate(p[0], p[1] + 8); ctx.globalAlpha = al; ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(6, -30, 2.5, 30); if (i % 2) ctx.fillRect(6, -30, 14, 4); ctx.restore(); }
  }
  const gulls = (ctx, t, n = 5, seed = 3) => {
    ctx.strokeStyle = SIL; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const x = fr(hash(i, seed) + t * 0.02 * (1 + hash(i, seed + 1))) * (W + 400) - 200, y = 180 + hash(i, seed + 2) * 260 + Math.sin(t + i) * 10, s = 12 + 10 * hash(i, seed + 3), f = Math.sin(t * 7 + i * 2) * 0.6;
      ctx.beginPath(); ctx.moveTo(x - s, y - s * f); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.6, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.6, x + s, y - s * f); ctx.stroke(); }
  };

  // ———— S26 海堤吉他：黄昏海堤，他弹吉他，她走过来 ————
  MV.shot({ id: 'S26', name: '海堤吉他', at: 29, chapter: '主歌二', tin: { type: 'fade', dur: 0.8 }, look: { vignette: 0.4 }, draw(ctx, s) {
    const t = s.t, k = ease.inOutSine(inv(T(29), T(30), t));
    const cam = { x: lerp(W / 2 - 80, W / 2 + 60, k), y: H / 2, z: lerp(1.02, 1.08, k) };
    seaSky(ctx, t, cam);
    gulls(ctx, t);
    Wd.layer(ctx, cam, 1, () => {
      seawall(ctx, t, { y: 900 });
      // 他坐在堤沿上弹琴
      const strum = Math.sin(t * 9.6) * 0.18;
      const gx = 1240, gy = 900, gs = 330;
      F.draw(ctx, him({ x: gx, y: gy + 14, s: gs, dir: -1, pose: F.sit({ spine: 0.12, neck: 0.25, shoulderF: 0.9 + strum, elbowF: 1.3, shoulderB: 1.4, elbowB: 0.5 }), t,
        inHand: (c) => { c.save(); c.scale(1 / gs, 1 / gs); guitar(c, 0.16 * gs, -0.42 * gs, gs * 0.75, -0.25); c.restore(); } }));
      noteRibbon(ctx, t, gx - 80, gy - 150, 520, 560, sstep(T(29), T(29) + 0.8, t));
      // 她走来
      const wx = lerp(180, 640, ease.outSine(inv(T(29) - 0.5, T(30) + 0.2, t)));
      const walking = t < T(30) - 0.1;
      F.draw(ctx, her({ x: wx, y: gy - 6, s: 380, pose: walking ? F.walk(t * 4.2, 0.85) : F.mixPose(F.idle(t), F.pose({ neck: -0.1 }), 1), t, wind: 0.55 }));
    });
  } });

  // ———— S27 山寺撞钟：山上的寺撞钟，钟声一圈圈荡开，她停下脚步 ————
  const bellHit = k => T(30) + k * 2 * B; // 每两拍撞一下
  MV.shot({ id: 'S27', name: '山寺撞钟', at: 30, tin: { type: 'slide', dur: 1.3, dir: 1 }, look: { vignette: 0.4 }, draw(ctx, s) {
    const t = s.t, k = ease.inOutSine(inv(T(30), T(31), t));
    const cam = { x: lerp(W / 2 + 200, W / 2 + 120, k), y: lerp(H / 2 - 120, H / 2 - 40, k), z: lerp(1.15, 1.0, k) };
    seaSky(ctx, t, cam, { sunX: 700, sunY: 600, sunR: 90 });
    Wd.layer(ctx, cam, 0.6, () => {
      // 山与寺
      ctx.fillStyle = '#4a2a50'; ctx.beginPath(); ctx.moveTo(900, HZ + 40); ctx.bezierCurveTo(1200, 420, 1500, 330, 1700, 360); ctx.bezierCurveTo(1900, 390, 2100, 500, 2300, HZ + 40); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 14; i++) Wd.pine(ctx, 1000 + i * 90 + hash(i, 4) * 40, 520 - Math.sin(i / 13 * Math.PI) * 140 + hash(i, 5) * 40, 90 + hash(i, 6) * 50, '#3a2042', 0);
      // 钟亭：石台基、两根立柱、额枋、重檐翘角；青铜钟挂在梁下，撞木用两根绳吊着，像钟摆一样荡过去撞钟
      const px = 1600, py = 372, SILC = '#2c1630', RIM = '#ffb07a', PS = 0.74;
      ctx.save(); ctx.translate(px, py); ctx.scale(PS, PS); ctx.translate(-px, -py);
      const ring = Math.max(...[0, 1, 2, 3].map(q => (t >= bellHit(q) ? Math.exp(-(t - bellHit(q)) * 3) : 0)));
      // 台基与台阶
      ctx.fillStyle = SILC;
      ctx.beginPath(); ctx.moveTo(px - 190, py); ctx.lineTo(px + 190, py); ctx.lineTo(px + 172, py - 26); ctx.lineTo(px - 172, py - 26); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 3; k++) ctx.fillRect(px - 60 - k * 12, py + k * 10, 120 + k * 24, 10);
      ctx.fillStyle = css(RIM, 0.35); ctx.fillRect(px - 172, py - 27, 344, 2);
      // 立柱（带柱础）与额枋、雀替
      const colH = 196, top = py - 26 - colH;
      ctx.fillStyle = SILC;
      for (const sg of [-1, 1]) {
        const cx = px + sg * 128;
        ctx.fillRect(cx - 9, top, 18, colH); ctx.fillRect(cx - 14, py - 34, 28, 10);
        ctx.beginPath(); ctx.moveTo(cx - sg * 9, top + 16); ctx.quadraticCurveTo(cx - sg * 40, top + 16, cx - sg * 58, top + 4); ctx.lineTo(cx - sg * 9, top + 2); ctx.closePath(); ctx.fill(); // 雀替
      }
      ctx.fillRect(px - 150, top - 4, 300, 16); ctx.fillRect(px - 140, top + 16, 280, 6);
      ctx.fillStyle = css(RIM, 0.4); ctx.fillRect(px - 150, top - 4, 300, 2);
      // 重檐：下檐宽、上檐窄，四角起翘
      const eave = (y, hw, rise, curl) => {
        ctx.beginPath();
        ctx.moveTo(px - hw - curl, y - curl * 0.9);
        ctx.quadraticCurveTo(px - hw + curl * 0.2, y + 6, px - hw * 0.55, y + 4);
        ctx.lineTo(px + hw * 0.55, y + 4);
        ctx.quadraticCurveTo(px + hw - curl * 0.2, y + 6, px + hw + curl, y - curl * 0.9);
        ctx.quadraticCurveTo(px + hw * 0.7, y - rise * 0.45, px + hw * 0.32, y - rise);
        ctx.lineTo(px - hw * 0.32, y - rise);
        ctx.quadraticCurveTo(px - hw * 0.7, y - rise * 0.45, px - hw - curl, y - curl * 0.9);
        ctx.closePath(); ctx.fill();
      };
      ctx.fillStyle = SILC;
      eave(top - 4, 196, 58, 26);
      ctx.fillRect(px - 92, top - 92, 184, 34);
      eave(top - 86, 132, 70, 20);
      ctx.fillRect(px - 50, top - 166, 100, 12);
      ctx.beginPath(); ctx.arc(px, top - 172, 9, 0, TAU); ctx.fill(); ctx.fillRect(px - 3, top - 196, 6, 26); ctx.beginPath(); ctx.arc(px, top - 198, 6, 0, TAU); ctx.fill(); // 宝顶
      // 檐口一道暖色边光
      ctx.strokeStyle = css(RIM, 0.5); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px - 222, top - 27); ctx.quadraticCurveTo(px - 196, top + 2, px - 108, top); ctx.lineTo(px + 108, top); ctx.quadraticCurveTo(px + 196, top + 2, px + 222, top - 27); ctx.stroke();
      // 青铜钟：钟钮、钟身（下沿外撇）、两道箍
      const bx = px, byTop = top + 26, sw = Math.sin((t - T(30)) * 7) * 0.035 * ring;
      ctx.save(); ctx.translate(bx, byTop); ctx.rotate(sw);
      ctx.fillStyle = SILC; ctx.fillRect(-3, -6, 6, 12); ctx.beginPath(); ctx.ellipse(0, 8, 13, 9, 0, 0, TAU); ctx.fill();
      const bell = () => { ctx.beginPath(); ctx.moveTo(-30, 14); ctx.bezierCurveTo(-34, 50, -40, 92, -56, 124); ctx.quadraticCurveTo(0, 134, 56, 124); ctx.bezierCurveTo(40, 92, 34, 50, 30, 14); ctx.quadraticCurveTo(0, 2, -30, 14); ctx.closePath(); };
      bell(); ctx.fillStyle = D.lin(ctx, -56, 0, 56, 0, [[0, '#2a1a26'], [0.35, '#5a3a34'], [0.62, mixc('#7a4a36', '#ffb07a', ring * 0.5)], [1, '#2a1a26']]); ctx.fill();
      ctx.strokeStyle = 'rgba(20,8,16,.55)'; ctx.lineWidth = 3;
      for (const yy of [40, 74, 112]) { ctx.beginPath(); ctx.moveTo(-31 - (yy - 14) * 0.18, yy); ctx.lineTo(31 + (yy - 14) * 0.18, yy); ctx.stroke(); }
      ctx.restore();
      // 撞木：两根绳吊着，撞之前往后荡，撞完回弹
      const swing = (() => { let a = 0.55; for (let q = 0; q < 4; q++) { const d = t - bellHit(q); if (d < -2 * B + 0.4) continue; if (d < 0) a = 0.55 * ease.inOutSine(clamp((-d) / (2 * B - 0.4))); else if (d < 2 * B) a = Math.max(a * 0, 0.12 * Math.exp(-d * 3) * Math.cos(d * 9)); } return t < bellHit(0) ? 0.55 : a; })();
      const ropeL = 88, piv = [px - 120, top + 22], piv2 = [px - 52, top + 22];
      const lx = Math.sin(-swing) * ropeL, ly = Math.cos(swing) * ropeL;
      ctx.strokeStyle = SILC; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(piv[0], piv[1]); ctx.lineTo(piv[0] + lx, piv[1] + ly); ctx.moveTo(piv2[0], piv2[1]); ctx.lineTo(piv2[0] + lx, piv2[1] + ly); ctx.stroke();
      ctx.fillStyle = SILC; ctx.beginPath(); ctx.roundRect(piv[0] + lx - 44, piv[1] + ly - 2, 140, 20, 10); ctx.fill();
      ctx.fillStyle = css(RIM, 0.35); ctx.fillRect(piv[0] + lx - 36, piv[1] + ly - 2, 124, 2);

      ctx.restore();
      const bellY = py - 126 * PS;
      // 钟声：金色大圆环
      for (let q = 0; q < 4; q++) { D.ring(ctx, px, bellY, t - bellHit(q), { dur: 2.8, r0: 40, r1: 1500, color: GOLD, width: 4, alpha: 0.75 }); D.ring(ctx, px, bellY, t - bellHit(q) - 0.15, { dur: 2.6, r0: 30, r1: 1300, color: '#ffe8b0', width: 1.5, alpha: 0.5 }); }
      D.glow(ctx, px, bellY, 160, '#ffd28a', 0.5 * ring);
      // 被惊起的鸟
      if (t > bellHit(0)) { ctx.strokeStyle = '#2c1630'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { const u = t - bellHit(0), x = px + (hash(i, 7) - 0.3) * 200 + u * (80 + 60 * hash(i, 8)) * (i % 2 ? 1 : -1), y = py - 300 - u * (60 + 40 * hash(i, 9)); const f = Math.sin(t * 9 + i) * 0.6, sz = 10; ctx.beginPath(); ctx.moveTo(x - sz, y - sz * f); ctx.quadraticCurveTo(x - 4, y - 6, x, y); ctx.quadraticCurveTo(x + 4, y - 6, x + sz, y - sz * f); ctx.stroke(); } }
    });
    // 前景：她在堤上停下，抬头望
    Wd.layer(ctx, cam, 1, () => {
      seawall(ctx, t, { y: 960 });
      const turn = sstep(T(30) + 0.4, T(30) + 1.2, t);
      F.draw(ctx, her({ x: 520, y: 954, s: 400, pose: F.mixPose(F.walk(t * 4.2, 0.5 * (1 - turn)), F.pose({ neck: -0.35, spine: -0.04 }), turn), t, wind: 0.5 }));
    });
  } });

  // ———— S28 被吹走的围巾：风吹走她的围巾，他接住，递回来 ————
  const scarfFly = (t, t0) => { // 围巾飞出的路径
    const u = clamp((t - t0) / 1.6);
    const p = D.bez([760, 600], [900, 300], [1150, 320], [1290, 560], 40)[Math.floor(ease.inOutSine(u) * 40)];
    return { p, u };
  };
  MV.shot({ id: 'S28', name: '被吹走的围巾', at: 31, tin: { type: 'fade', dur: 0.5 }, look: { vignette: 0.4 }, draw(ctx, s) {
    const t = s.t, t0 = T(31) + 0.2;
    const cam = { x: W / 2 + 40, y: H / 2 - 20, z: 1.2 };
    seaSky(ctx, t, cam, { sunX: 1000, sunY: 600, sunR: 100 });
    const { p, u } = scarfFly(t, t0);
    const caught = t > t0 + 1.6;
    const give = ease.inOutSine(inv(t0 + 2.0, t0 + 3.2, t));
    Wd.layer(ctx, cam, 1, () => {
      seawall(ctx, t, { y: 930 });
      // 她：围巾被吹走时伸手去抓
      const reach = sstep(t0, t0 + 0.4, t) * (1 - sstep(t0 + 1.2, t0 + 1.8, t));
      F.draw(ctx, her({ x: 700, y: 924, s: 420, scarf: t < t0 || give > 0.95 ? { color: RED, len: 0.34 } : null, pose: F.mixPose(F.idle(t), F.pose({ shoulderF: 2.4, elbowF: 0.3, neck: -0.3, spine: -0.05 }), reach), t, wind: 0.7 }));
      // 他：接住后走过来
      const hx = lerp(1360, 980, ease.inOutSine(inv(t0 + 1.4, t0 + 2.6, t)));
      const jump = caught ? 0 : sstep(t0 + 1.0, t0 + 1.5, t);
      const pose = caught ? (give > 0 && give < 1 ? F.walk(t * 4, 0.6) : F.idle(t)) : F.pose({ shoulderF: 2.8 * jump, elbowF: 0.2, neck: -0.4 * jump });
      if (give > 0.4) { pose.shoulderF = lerp(pose.shoulderF, 1.25, sstep(0.4, 0.9, give)); pose.elbowF = lerp(pose.elbowF || 0.2, 0.25, sstep(0.4, 0.9, give)); }
      F.draw(ctx, him({ x: hx, y: 924 - jump * 30 * Math.sin(Math.PI * clamp((t - t0 - 1.0) / 0.6)), s: 440, dir: -1, pose, t,
        inHand: (c, J) => { if (caught && give < 0.97) { const h = J.AF.hand; F.ribbon(c, F.tailPts([h[0], h[1] + 0.01], 0.26, t, 0.45, 1.1, 0.15), 0.05, t, 1.2, RED, css(mixc(RED, '#000000', 0.3))); } } }));
      // 飞着的围巾
      if (!caught && t > t0) {
        const ang = -0.4 + u * 3.6 + Math.sin(t * 2.3) * 0.4, dx = Math.cos(ang), dy = Math.sin(ang), L = 190;
        const pts = Array.from({ length: 19 }, (_, i) => { const v = i / 18 - 0.5, w = Math.sin(v * 7 - t * 11) * 22 * (0.4 + Math.abs(v)) + MV.noise1(t * 1.7 + v * 2) * 16; return [p[0] + dx * v * L - dy * w, p[1] + dy * v * L + dx * w]; });
        F.ribbon(ctx, pts, 30, t, 0.5, RED, css(mixc(RED, '#000000', 0.3)), 0.1);
      }
      // 两人之间的一点微光
      if (give > 0.9) D.glow(ctx, 840, 650, 40 + 10 * Math.sin(t * 5), '#ffe3a0', sstep(0.9, 1, give) * 0.9);
    });
  } });

  // ———— S29 浪潮：身后的浪层层翻起、砸下 ————
  MV.shot({ id: 'S29', name: '浪潮', at: 32, look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, t0 = T(32);
    const u = inv(t0, T(33), t);
    const surge = ease.outCubic(inv(t0, t0 + 1.6, t)), crash = ease.inCubic(inv(t0 + 1.6, t0 + 2.4, t));
    const cam = { x: lerp(W / 2 + 40, W / 2 - 60, ease.inOutSine(u)), y: lerp(H / 2 - 20, H / 2 + 20 - 30 * surge, ease.inOutSine(clamp(u * 2))), z: lerp(1.2, 1.28, ease.inOutSine(u)) };
    seaSky(ctx, t, cam, { sunX: 1000, sunY: 600, sunR: 100, warm: surge });
    // 浪：五层，波长短、浪峰尖、前陡后缓；浪峰前沿一道白沫。后面的深、前面的亮
    const cols = ['#3a2c66', '#5a3a78', '#8a4a7e', '#c8607a', '#f2907a'];
    const crestFn = ph => { const s = ph + 0.7 * Math.sin(ph); return Math.pow(0.5 - 0.5 * Math.cos(s), 3.2); };
    Wd.layer(ctx, cam, 0.7, () => {
      for (let l = 0; l < 5; l++) {
        const lam = 420 + l * 110, k = TAU / lam;
        const h = lam * (0.3 + 0.05 * l) * surge * (1 - crash * 0.6) * (1 + 0.08 * Math.sin(t * 3 + l)), y0 = HZ + 60 + l * 46;
        const sp = 1.2 + l * 0.35, off = l * 1.9 + Math.sin(l * 3) * 2;
        const ph = x => x * k + off - t * sp;
        const yAt = x => y0 - h * (0.18 + 0.82 * crestFn(ph(x)));
        ctx.globalAlpha = l === 4 ? 0.9 : 1;
        ctx.fillStyle = D.lin(ctx, 0, y0 - h, 0, y0 + 140, [[0, mixc(cols[l], '#ffffff', 0.14)], [1, cols[l]]]);
        ctx.beginPath(); ctx.moveTo(-400, H + 300); ctx.lineTo(-400, yAt(-400));
        for (let x = -400; x <= W + 400; x += 10) ctx.lineTo(x, yAt(x));
        ctx.lineTo(W + 400, H + 300); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        // 白沫：只画在每个浪峰前沿那一小段，粗细随浪高
        ctx.strokeStyle = css('#fff6ec', 0.9); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = (4 + l * 2.2) * surge;
        ctx.beginPath();
        let on = false;
        for (let x = -400; x <= W + 400; x += 8) {
          const p = ((ph(x) % TAU) + TAU) % TAU; // 0..2π，浪峰大约在 π-0.6
          const cap = p > Math.PI - 1.15 && p < Math.PI + 0.05;
          if (cap) { const y = yAt(x) + 1; on ? ctx.lineTo(x, y) : ctx.moveTo(x, y); on = true; } else on = false;
        }
        ctx.stroke();
        // 浪脊上的细亮线
        ctx.strokeStyle = css('#ffe8d8', 0.25 + 0.08 * l); ctx.lineWidth = 1.5; ctx.beginPath();
        for (let x = -400; x <= W + 400; x += 12) x === -400 ? ctx.moveTo(x, yAt(x) + 6) : ctx.lineTo(x, yAt(x) + 6);
        ctx.stroke();
      }
      // 浪花
      for (let i = 0; i < 110; i++) { const a = hash(i, 5), x = a * W, age = fr(t * 0.8 + hash(i, 6)); const y = HZ + 100 - age * 440 * surge + age * age * 320; D.glow(ctx, x, y, 7 + 10 * hash(i, 7), '#fff6ea', (1 - age) * surge * 0.9, 'source-over'); }
    });

    // 两人站在堤上，被浪映红
    Wd.layer(ctx, cam, 1, () => {
      seawall(ctx, t, { y: 930, lamps: false });
      F.draw(ctx, her({ x: 700, y: 924, s: 420, pose: F.pose({ neck: 0.05 }), t, wind: 0.8 + 0.2 * surge, rim: [-2, -2, '#ffb08a'] }));
      F.draw(ctx, him({ x: 980, y: 924, s: 440, dir: -1, pose: F.mixPose(F.pose({ neck: 0.1, shoulderF: 1.25, elbowF: 0.25 }), F.pose({ neck: 0.1, shoulderF: 0.4, elbowF: 0.2 }), sstep(t0, t0 + 0.8, t)), t, rim: [2, -2, '#ffb08a'] }));
      // 心跳：两人之间的光随拍子一跳一跳
      D.glow(ctx, 840, 640, 60 + 50 * pulse(t, 4), '#ffd8b0', 0.4 + 0.4 * pulse(t, 4));
    });
  } });

  // ———— S30 单车载她：他骑车载着她沿海边公路飞驰 ————
  function bicycle(ctx, x, y, s, ang) {
    const r = s * 0.18;
    ctx.strokeStyle = SIL; ctx.lineWidth = s * 0.012; ctx.lineCap = 'round';
    const rw = [x - s * 0.32, y - r], fw = [x + s * 0.34, y - r];
    for (const w of [rw, fw]) { ctx.beginPath(); ctx.arc(w[0], w[1], r, 0, TAU); ctx.stroke(); for (let k = 0; k < 8; k++) { const a = ang + k * Math.PI / 4; ctx.lineWidth = s * 0.003; ctx.beginPath(); ctx.moveTo(w[0], w[1]); ctx.lineTo(w[0] + Math.cos(a) * r, w[1] + Math.sin(a) * r); ctx.stroke(); } ctx.lineWidth = s * 0.012; }
    const bb = [x, y - r * 0.9], seat = [x - s * 0.08, y - s * 0.46], head = [x + s * 0.26, y - s * 0.5];
    ctx.beginPath(); ctx.moveTo(rw[0], rw[1]); ctx.lineTo(bb[0], bb[1]); ctx.lineTo(seat[0], seat[1]); ctx.lineTo(rw[0], rw[1]); ctx.moveTo(seat[0], seat[1] + s * 0.04); ctx.lineTo(head[0], head[1] + s * 0.04); ctx.lineTo(bb[0], bb[1]); ctx.moveTo(head[0], head[1]); ctx.lineTo(fw[0], fw[1]); ctx.moveTo(head[0], head[1]); ctx.lineTo(head[0] - s * 0.04, head[1] - s * 0.06); ctx.lineTo(head[0] + s * 0.04, head[1] - s * 0.08); ctx.stroke();
    // 后座
    ctx.beginPath(); ctx.moveTo(seat[0] - s * 0.03, seat[1] + s * 0.06); ctx.lineTo(rw[0] - s * 0.06, rw[1] - r * 0.95); ctx.lineTo(rw[0], rw[1]); ctx.stroke();
    ctx.fillStyle = SIL; ctx.beginPath(); ctx.ellipse(seat[0], seat[1] - s * 0.01, s * 0.05, s * 0.014, 0, 0, TAU); ctx.fill();
    // 踏板
    const pa = ang * 0.5, p1 = [bb[0] + Math.cos(pa) * s * 0.07, bb[1] + Math.sin(pa) * s * 0.07], p2 = [bb[0] - Math.cos(pa) * s * 0.07, bb[1] - Math.sin(pa) * s * 0.07];
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    return { seat, head, p1, p2, rack: [rw[0] + s * 0.02, rw[1] - r * 0.95] };
  }
  MV.shot({ id: 'S30', name: '单车载她', at: 33, tin: { type: 'wipe', dur: 0.6, ang: 0, soft: 300 }, look: { vignette: 0.4 }, draw(ctx, s) {
    const t = s.t, lt = t - T(33), dx = lt * 900;
    const cam = { x: W / 2, y: H / 2, z: 1 };
    seaSky(ctx, t, cam, { sunX: 400 + lt * 20, sunY: 600, sunR: 110 });
    gulls(ctx, t, 4, 8);
    // 近处：海边公路，护栏飞快掠过
    Wd.layer(ctx, cam, 1, () => {
      ctx.fillStyle = D.lin(ctx, 0, 900, 0, 1100, [[0, '#3a2440'], [1, '#1a0f22']]); ctx.fillRect(-400, 900, W + 800, 400);
      ctx.fillStyle = '#2a1830'; ctx.fillRect(-400, 840, W + 800, 8);
      for (let x = -((dx % 120) + 120) % 120 - 200; x < W + 200; x += 120) ctx.fillRect(x, 840, 6, 60);
      for (let k = 0; k < 5; k++) { const x = ((k * 700 - dx * 1.0) % 3500 + 3500) % 3500 - 500; ctx.fillRect(x - 4, 600, 8, 300); ctx.beginPath(); ctx.moveTo(x, 600); ctx.quadraticCurveTo(x + 40, 570, x + 60, 600); ctx.lineWidth = 6; ctx.strokeStyle = SIL; ctx.stroke(); D.glow(ctx, x + 60, 610, 70, '#ffd28a', 0.7); }
      // 速度线
      ctx.strokeStyle = 'rgba(255,230,200,.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) { const y = 300 + hash(i, 3) * 600, x = fr(hash(i, 4) - lt * 1.4) * (W + 600) - 300; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 160 + 120 * hash(i, 5), y); ctx.stroke(); }
      // 车与人
      const bx = 960, by = 905 + Math.sin(t * 18) * 1.5, bs = 520;
      const ang = dx / (bs * 0.18);
      const g = bicycle(ctx, bx, by, bs, ang);
      // 他：踩车（脚到踏板，手到车把）
      const sx = g.seat[0], sy = g.seat[1];
      const toL = (p, ox, oy, sc) => [(p[0] - ox) / sc, (p[1] - oy) / sc];
      const ms = 460, mx = sx + 6, my = sy + 0.255 * ms * 0 + ms * 0.47;
      const mp = F.pose({ spine: 0.45, neck: -0.25, ground: false, seated: false });
      mp.py = 0; mp.ikF = toL(g.p1, mx, my, ms); mp.ikB = toL(g.p2, mx, my, ms);
      mp.reachF = toL(g.head, mx, my, ms); mp.reachB = toL([g.head[0] - 6, g.head[1] + 4], mx, my, ms);
      F.draw(ctx, him({ x: mx, y: my, s: ms, pose: Object.assign(mp, { px: 0 }), t, wind: 0.8 }));
      // 她：侧坐在后座，一手搂着他
      const ws = 420;
      const wx = g.rack[0] - 34, wy = g.rack[1] + (0.235 + 0.02) * ws - 6;
      // 侧坐：大腿朝着镜头，侧面看是缩短的；小腿从车架边垂下，脚离地
      const wp = F.sit({ spine: -0.06, neck: -0.12, shoulderB: 0.35, elbowB: 0.5, thighF: 1.25, kneeF: 1.45, thighB: 1.15, kneeB: 1.4, footF: 0.45, footB: 0.45 });
      const waist = [mx - 0.06 * ms, my - 0.6 * ms];
      wp.reachF = [(waist[0] - wx) / ws, (waist[1] - wy) / ws];
      F.draw(ctx, her({ x: wx, y: wy, skirt: 0.45, P: Object.assign({}, F.AGES.woman, { thigh: 0.1 }), s: ws, pose: wp, t, wind: 1, scarf: { color: RED, len: 0.42, wind: 1 } }));
    });
  } });

  // ———— S31 落日牵手：两人牵着手，面对一轮巨大的落日 ————
  MV.shot({ id: 'S31', name: '落日牵手', at: 34, tin: { type: 'fade', dur: 0.6 }, look: { vignette: 0.5 }, draw(ctx, s) {
    const t = s.t, k = ease.inOutSine(inv(T(34), T(35) + 0.5, t));
    const cam = { x: W / 2, y: H / 2 + 20, z: lerp(1.25, 1.05, k) };
    const sunX = 960, sunY = 600, sunR = 260;
    seaSky(ctx, t, cam, { sunX, sunY, sunR, warm: 0.6 });
    Wd.layer(ctx, cam, 1, () => {
      // 沙滩
      ctx.fillStyle = D.lin(ctx, 0, 820, 0, 1100, [[0, '#7a4a5a'], [1, '#3a2034']]);
      ctx.beginPath(); ctx.moveTo(-400, H + 300); ctx.lineTo(-400, 860); ctx.quadraticCurveTo(960, 800, W + 400, 860); ctx.lineTo(W + 400, H + 300); ctx.fill();
      // 湿沙的倒影
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffcf9a'; ctx.beginPath(); ctx.ellipse(960, 880, 300, 20, 0, 0, TAU); ctx.fill(); ctx.restore();
      const lean = sstep(T(34) + 1.0, T(34) + 2.4, t);
      const hp = F.pose({ neck: 0.05, shoulderB: 0.3 }), wp = F.pose({ neck: lerp(0, 0.3, lean), spine: lerp(0, 0.06, lean), shoulderF: 0.3 });
      const wx = 880, mx = 1000, gy = 830;
      const M = [lerp(wx, mx, 0.5), gy - 0.43 * 420];
      wp.reachF = [(M[0] - wx) / 420, (M[1] - gy) / 420]; hp.reachB = [(mx - M[0]) / 440, (M[1] - gy) / 440];
      F.draw(ctx, her({ x: wx, y: gy, s: 420, pose: wp, t, wind: 0.5 }));
      F.draw(ctx, him({ x: mx, y: gy, s: 440, dir: -1, pose: hp, t }));
      // 一对脚印通向他们
      ctx.fillStyle = 'rgba(40,20,40,.35)'; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.ellipse(400 + i * 40, 900 + i * 6 + (i % 2) * 8, 8, 3, 0, 0, TAU); ctx.fill(); }
    });
    D.dust(ctx, t, { n: 50, color: '#ffe8c8', alpha: 0.5, drift: 10, seed: 23 });
  } });

  // ———— S32 贴囍：落日化成一盏红灯笼；外婆把“囍”贴上窗 ————
  MV.shot({ id: 'S32', name: '贴囍', at: At(138.15), tin: { type: 'fade', dur: 0.5 }, look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    const morph = ease.inOutCubic(inv(t0 - 0.2, t0 + 0.9, t));
    // 暖红的夜
    D.sky(ctx, [[0, '#2a0f1c'], [0.6, '#5a1a24'], [1, '#8a2a24']]);
    // 窗：外婆从里面贴上囍
    const wx = 1180, wy = 470, ww = 560, wh = 440;
    D.glow(ctx, wx, wy, 600, '#ffb35c', 0.35);
    ctx.fillStyle = D.lin(ctx, 0, wy - wh / 2, 0, wy + wh / 2, [[0, '#ffd99a'], [1, '#f39a4c']]); ctx.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
    const stick = ease.outBack(clamp((t - t0 - 1.4) / 0.6), 1.2);
    F.draw(ctx, { x: wx - 100, y: wy + wh / 2 + 60, s: 420, age: 'old', hair: 'oldbun', outfit: 'robe', color: '#4a2018', pose: F.pose({ spine: 0.08, neck: -0.05, shoulderF: lerp(1.2, 1.55, stick), elbowF: lerp(0.9, 0.35, stick), shoulderB: lerp(1.1, 1.5, stick), elbowB: lerp(1.0, 0.4, stick) }), t });
    PC.draw(ctx, 'xi', lerp(wx - 20, wx + 60, stick), lerp(wy + 40, wy - 30, stick), lerp(120, 260, stick), { color: '#c8201c', alpha: sstep(t0 + 0.8, t0 + 1.2, t), shadow: 0.3 });
    ctx.strokeStyle = '#2a0c10'; ctx.lineWidth = 22; ctx.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(wx, wy - wh / 2); ctx.lineTo(wx, wy + wh / 2); ctx.moveTo(wx - ww / 2, wy); ctx.lineTo(wx + ww / 2, wy); ctx.stroke();
    ctx.fillStyle = '#3a1418'; ctx.fillRect(-100, wy + wh / 2 + 11, W + 200, 400);
    // 落日 → 灯笼：同一个位置、同样大小，一串灯笼依次亮起
    const lx = lerp(960, 380, ease.inOutSine(morph)), ly = lerp(600, 300, ease.inOutSine(morph)), lr = lerp(260, 70, ease.inOutSine(morph));
    if (morph < 1) { ctx.globalAlpha = 1 - morph; ctx.fillStyle = '#ffd28a'; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (morph > 0) {
      ctx.globalAlpha = morph; PR.lantern(ctx, lx, ly - lr * 1.15, lr, { t, glow: 1, string: lr * 0.6 }); ctx.globalAlpha = 1;
      for (let i = 1; i < 6; i++) { const on = sstep(t0 + 0.4 + i * 0.25, t0 + 0.7 + i * 0.25, t); if (on > 0) { ctx.globalAlpha = on; PR.lantern(ctx, 380 - i * 0 + i * 0, 300 + i * 0, 0, {}); PR.lantern(ctx, 380 + i * 280 * (i < 3 ? 1 : 0) + (i >= 3 ? (i - 2) * 140 + 840 : 0), 120 + (i % 2) * 40, 40, { t: t + i, glow: 1, string: 40 }); ctx.globalAlpha = 1; } }
    }
    D.dust(ctx, t, { n: 40, color: '#ffd8a0', alpha: 0.5, seed: 29 });
  } });

  // ———— S33 婚礼：婚礼，灯笼串下红花瓣和金屑落下来 ————
  MV.shot({ id: 'S33', name: '婚礼', at: At(141.62), tin: { type: 'fade', dur: 0.6 }, look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, k = ease.inOutSine(inv(t0, s.t1, t));
    const cam = { x: W / 2, y: lerp(H / 2 + 40, H / 2 - 20, k), z: lerp(1.0, 1.08, k) };
    D.sky(ctx, [[0, '#1c0a18'], [0.6, '#4a1420'], [1, '#7a2420']]);
    Wd.layer(ctx, cam, 0.5, () => {
      // 院墙与屋檐的剪影
      ctx.fillStyle = '#2a0c14'; ctx.fillRect(-300, 640, W + 600, 500);
      PR.house(ctx, 400, 700, 520, 380, { wall: '#3a1218', roof: '#220810', windowColor: '#ffb35c', seed: 3, t, papercut: { type: 'xi', size: 0.8, color: '#e0281c' } });
      PR.house(ctx, 1560, 700, 560, 400, { wall: '#3a1218', roof: '#220810', windowColor: '#ffb35c', seed: 5, t, windows: 2 });
    });
    // 灯笼串
    Wd.layer(ctx, cam, 0.8, () => {
      for (let row = 0; row < 2; row++) {
        const y0 = 140 + row * 130; ctx.strokeStyle = 'rgba(30,8,10,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-200, y0); ctx.quadraticCurveTo(960, y0 + 160, W + 200, y0); ctx.stroke();
        for (let i = 0; i < 9; i++) { const u = (i + 0.5) / 9, x = lerp(-200, W + 200, u), y = y0 + 4 * 160 * u * (1 - u) * 0.5 * 2 * 0.5; PR.lantern(ctx, x, y + 14, 26 - row * 4, { t: t + i + row, glow: 1, string: 14 }); }
      }
      D.rays(ctx, 960, -200, Math.PI / 2, 0.6, 1400, t, { n: 8, color: '#ffd8a0', alpha: 0.22 });
    });
    Wd.layer(ctx, cam, 1, () => {
      ctx.fillStyle = '#1a0810'; ctx.fillRect(-300, 960, W + 600, 400);
      // 新人：她一身红；亲人围着
      F.draw(ctx, { x: 900, y: 960, s: 430, age: 'woman', hair: 'bun', outfit: 'long', color: '#a8141c', pose: F.pose({ neck: 0.1, shoulderF: 0.6, elbowF: 0.9 }), t, scarf: null, rim: [-2, -2, '#ffb080'] });
      F.draw(ctx, { x: 1020, y: 960, s: 450, age: 'man', hair: 'short', outfit: 'pants', color: '#140608', pose: F.pose({ neck: 0.1, shoulderB: 0.6, elbowB: 0.9 }), t, dir: -1, rim: [2, -2, '#ffb080'] });
      const clap = Math.max(0, Math.sin(t * 12));
      for (const [x, dir, age, sc, hair] of [[380, 1, 'old', 380, 'oldbun'], [520, 1, 'man', 420, 'short'], [640, 1, 'woman', 400, 'bun'], [1330, -1, 'woman', 400, 'bun'], [1470, -1, 'man', 430, 'short'], [1600, -1, 'child', 220, 'bob']])
        F.draw(ctx, { x, y: 960, s: sc, age, hair, outfit: age === 'man' ? 'pants' : age === 'child' ? 'dress' : 'long', color: '#140608', dir, pose: F.pose({ shoulderF: 1.2 + clap * 0.2, elbowF: 1.3, shoulderB: 1.1 - clap * 0.2, elbowB: 1.3, neck: -0.05 }), t: t + x });
    });
    D.petals(ctx, t, { n: 70, seed: 33, colors: ['#e8343a', '#ff6a5a', '#c8201c'], alpha: 0.95, wind: 40, fall: 110, size: 9 });
    D.dust(ctx, t, { n: 70, color: '#ffd890', alpha: 0.8, drift: 20, seed: 31 });
  } });

  // ———— S34 穿过囍字窗：镜头穿过贴着囍的窗 ————
  MV.shot({ id: 'S34', name: '穿过囍字窗', at: 37, tin: { type: 'fade', dur: 0.5 }, look: { vignette: 0.5 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, u = ease.inCubic(inv(t0, s.t1 + 0.2, t));
    const z = Math.exp(lerp(0, Math.log(7), u));
    const cam = { x: W / 2, y: H / 2, z };
    D.sky(ctx, [[0, '#120a1c'], [1, '#2a1424']]);
    Wd.layer(ctx, cam, 1, () => {
      ctx.fillStyle = '#2a1626'; ctx.fillRect(-2000, -2000, W + 4000, H + 4000);
      const wx = W / 2, wy = H / 2, ww = 420, wh = 340;
      D.glow(ctx, wx, wy, 520, '#ffb35c', 0.4);
      ctx.fillStyle = D.lin(ctx, 0, wy - wh / 2, 0, wy + wh / 2, [[0, '#ffe2aa'], [1, '#f6a858']]); ctx.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
      PC.draw(ctx, 'xi', wx, wy, 230, { color: '#c8201c', alpha: 1 - sstep(0.5, 0.9, u) });
      ctx.strokeStyle = '#180a12'; ctx.lineWidth = 18; ctx.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(wx, wy - wh / 2); ctx.lineTo(wx, wy - 120); ctx.moveTo(wx, wy + 120); ctx.lineTo(wx, wy + wh / 2); ctx.stroke();
    });
    D.snow(ctx, t, { n: 80, alpha: 0.6, speed: 0.4, seed: 51 });
    const wash = sstep(s.t1 - 0.5, s.t1 + 0.1, t);
    if (wash > 0) { ctx.fillStyle = css('#ffe0b0', wash); ctx.fillRect(0, 0, W, H); }
  } });

  // ———— 新家的屋里（S35、S41、S42 用） ————
  const HWIN = { x: 1280, y: 400, w: 380, h: 330 };
  const snowNight = t => (c, x, y, w, h) => {
    c.fillStyle = D.lin(c, 0, y, 0, y + h, [[0, '#141c44'], [1, '#2e3672']]); c.fillRect(x, y, w, h);
    D.stars(c, t, { n: 30, seed: 7, region: [x, y, w, h * 0.6], size: 0.8 });
    c.fillStyle = '#10142e'; c.fillRect(x, y + h * 0.72, w, h);
    for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(255,200,120,.8)'; c.fillRect(x + 30 + i * 70, y + h * 0.78, 16, 12); }
    D.snow(c, t, { n: 30, region: [x, y, w, h], speed: 0.4, alpha: 0.9, seed: 9 });
  };
  function homeRoom(ctx, t, o = {}) {
    const { lamp = 1, papercut = null } = o;
    Wd.room(ctx, t, { win: HWIN, view: snowNight(t), wall: ['#5a3a34', '#3a2420'], floor: '#24140f', curtain: '#8a3a2e', sill: '#2a1810', frame: '#24140e', papercut, light: ['#ffb35c', 0.2] });
    // 台灯
    D.glow(ctx, 420, 560, 420, '#ffc070', 0.45 * lamp);
    ctx.fillStyle = '#20120c'; ctx.fillRect(300, 660, 240, 330);
    ctx.fillStyle = '#e8c890'; ctx.beginPath(); ctx.moveTo(380, 560); ctx.lineTo(460, 560); ctx.lineTo(490, 620); ctx.lineTo(350, 620); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#20120c'; ctx.fillRect(415, 620, 10, 40);
  }

  // ———— S35 抱着新生儿：灯下，她抱着刚出生的孩子 ————
  MV.shot({ id: 'S35', name: '抱着新生儿', at: At(147.27), chapter: '副歌二', tin: { type: 'fade', dur: 0.8 }, look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, k = ease.inOutSine(inv(s.t0, s.t1, t));
    const cam = { x: lerp(W / 2 + 40, 1060, k), y: lerp(H / 2, 520, k), z: lerp(1.0, 1.35, k) };
    Wd.layer(ctx, cam, 1, () => {
      homeRoom(ctx, t);
      const rock = Math.sin(t * 2.2) * 0.05;
      F.draw(ctx, { x: 1000, y: 990, s: 450, age: 'woman', hair: 'bun', outfit: 'long', color: '#2a1612', pose: F.pose({ spine: 0.06 + rock * 0.3, neck: 0.45, shoulderF: 0.8, elbowF: 1.7, shoulderB: 0.6, elbowB: 1.8 }), t, scarf: { color: RED, len: 0.28 }, rim: [2, -2, '#ffb070'],
        inHand: (c, J) => { const h = J.AF.hand; c.save(); c.translate(h[0] - 0.02, h[1] - 0.03); c.rotate(-0.3 + rock); c.fillStyle = '#f2e2c8'; c.beginPath(); c.ellipse(0, 0, 0.1, 0.05, 0, 0, TAU); c.fill(); c.fillStyle = '#2a1612'; c.beginPath(); c.arc(0.075, -0.015, 0.03, 0, TAU); c.fill();
          // 小手伸出来
          const reach = 0.5 + 0.5 * Math.sin(t * 1.5); c.strokeStyle = '#2a1612'; c.lineWidth = 0.012; c.lineCap = 'round'; c.beginPath(); c.moveTo(0.03, -0.03); c.lineTo(0.06 + reach * 0.01, -0.08 - reach * 0.02); c.stroke(); c.restore(); } });
      F.draw(ctx, { x: 1160, y: 990, s: 470, age: 'man', hair: 'short', outfit: 'pants', color: '#20100c', dir: -1, pose: F.pose({ neck: 0.35, shoulderF: 1.4, elbowF: 0.3 }), t });
      D.glow(ctx, 1080, 620, 130 + 10 * Math.sin(t * 3), '#ffe0b0', 0.55);
    });
    D.dust(ctx, t, { n: 40, color: '#ffe8c0', alpha: 0.5, region: [600, 200, 900, 700] });
  } });

  // ———— S36 回赠窗花：她带着孩子回外婆家，递上一张自己剪的窗花 ————
  MV.shot({ id: 'S36', name: '回赠窗花', at: At(153.05), tin: { type: 'fade', dur: 0.6 }, look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    const give = ease.inOutSine(inv(t0 + 0.3, t0 + 1.4, t)), paste = ease.inOutCubic(inv(t0 + 1.6, t0 + 2.8, t));
    const cam = { x: W / 2 + 60, y: H / 2, z: 1.08 };
    Wd.layer(ctx, cam, 1, () => {
      // 外婆的老屋：窗上还是那条鱼，褪了色
      Wd.room(ctx, t, { win: { x: 1260, y: 380, w: 400, h: 340 }, view: (c, x, y, w, h) => { c.fillStyle = D.lin(c, 0, y, 0, y + h, [[0, '#ffd9a0'], [1, '#ffb878']]); c.fillRect(x, y, w, h); }, papercut: { type: 'fish', color: '#b8605a', alpha: 0.85 }, wall: ['#6a4a3a', '#4a3028'], floor: '#2a1a14', curtain: '#8a5a3a', light: ['#ffc070', 0.3] });
      // 新贴上的团花（她剪的）
      const fx = lerp(820, 1160, paste), fy = lerp(640, 300, paste);
      if (give > 0.05) PC.draw(ctx, 'flower', fx, fy, lerp(90, 150, paste), { seed: 6, color: '#d8281e', unfold: give, shadow: 0.3 });
      // 外婆坐在藤椅上
      ctx.fillStyle = '#3a2418'; ctx.fillRect(560, 840, 210, 24); ctx.fillRect(560, 620, 24, 240); ctx.fillRect(580, 860, 16, 140); ctx.fillRect(740, 860, 16, 140);
      F.draw(ctx, { x: 680, y: 1000, s: 430, age: 'old', hair: 'oldbun', outfit: 'robe', color: '#2a1a14', pose: F.sit({ spine: 0.2, neck: -0.1, shoulderF: lerp(0.6, 1.3, give) - paste * 0.4, elbowF: 0.4, shoulderB: 0.5, elbowB: 1.0 }), t, hairColor: '#8a8a8a' });
      // 她抱着孩子，递上窗花
      F.draw(ctx, { x: 990, y: 1000, s: 450, age: 'woman', hair: 'bun', outfit: 'long', color: '#2a1612', dir: -1, pose: F.pose({ spine: 0.12, neck: 0.25, shoulderF: lerp(0.4, 1.3, give) * (1 - paste * 0.6), elbowF: 0.4, shoulderB: 0.7, elbowB: 1.8 }), t, scarf: { color: RED, len: 0.28 },
        behindBody: (c, J) => { const h = J.AB.hand; c.save(); c.translate(h[0], h[1] - 0.03); c.fillStyle = '#f2e2c8'; c.beginPath(); c.ellipse(0, 0, 0.09, 0.045, 0.3, 0, TAU); c.fill(); c.restore(); } });
    });
  } });

  // ———— S37 金线画窗：金线在深蓝里勾出窗框，窗格一格格亮起 ————
  const LINE_BG = [[0, '#0c1230'], [1, '#1a2250']];
  function lineWindow(ctx, t, x, y, w, h, draw, fill, o = {}) {
    const pts = [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2], [x - w / 2, y - h / 2]];
    const inner = [[[x, y - h / 2], [x, y + h / 2]], [[x - w / 2, y], [x + w / 2, y]]];
    // 窗格亮起（四格依次）
    const panes = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    panes.forEach(([px, py], i) => {
      const f = ease.outCubic(clamp(fill * 4 - i));
      if (f <= 0) return;
      const cx = x + px * w / 4, cy = y + py * h / 4;
      ctx.fillStyle = D.lin(ctx, 0, cy - h / 4, 0, cy + h / 4, [[0, '#ffe2a8', f], [1, '#ffb45c', f]]);
      ctx.fillRect(cx - w / 4, cy - h / 4, w / 2, h / 2);
      D.glow(ctx, cx, cy, w * 0.5, '#ffc070', 0.35 * f);
    });
    if (o.inside) { ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip(); o.inside(ctx); ctx.restore(); }
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
    for (const [lw, a] of [[14, 0.12], [5, 0.4], [2.2, 1]]) { ctx.strokeStyle = css(GOLD, a); ctx.lineWidth = lw; ctx.beginPath(); D.strokePart(ctx, pts, 0, clamp(draw * 1.3)); ctx.stroke();
      inner.forEach((ln, i) => { const f = clamp(draw * 2.2 - 1.1 - i * 0.3); if (f > 0) { ctx.beginPath(); D.strokePart(ctx, ln, 0, f); ctx.stroke(); } }); }
    ctx.restore();
  }
  const familyInside = (t, x, y, a) => (c) => {
    c.globalAlpha = a;
    F.draw(c, { x: x - 60, y: y + 200, s: 300, age: 'woman', hair: 'bun', outfit: 'long', color: '#6a3a24', pose: F.pose({ neck: 0.2, shoulderF: 0.8, elbowF: 1.6 }), t, dir: 1 });
    F.draw(c, { x: x + 70, y: y + 200, s: 320, age: 'man', hair: 'short', outfit: 'pants', color: '#6a3a24', pose: F.pose({ neck: 0.1, shoulderF: 0.4 }), t, dir: -1 });
    c.globalAlpha = 1;
  };
  MV.shot({ id: 'S37', name: '金线画窗', at: At(156.6), tin: { type: 'dip', dur: 0.6, color: '#0c1230' }, look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    D.sky(ctx, LINE_BG);
    D.stars(ctx, t, { n: 160, seed: 17, alpha: 0.5, size: 0.8 });
    const draw = ease.inOutSine(inv(t0, t0 + 1.6, t)), fill = inv(t0 + 1.2, t0 + 2.6, t);
    const cam = { x: W / 2, y: H / 2, z: lerp(1.25, 1.1, ease.inOutSine(inv(t0, s.t1, t))) };
    Wd.layer(ctx, cam, 1, () => lineWindow(ctx, t, W / 2, H / 2 + 20, 440, 360, draw, fill, { inside: familyInside(t, W / 2, H / 2 + 20, sstep(t0 + 2.0, t0 + 3.0, t)) }));
  } });

  // ———— S38 瓦片搭屋顶：镜头拉开，瓦片一排排落下搭成屋顶；下雨了，屋里暖 ————
  MV.shot({ id: 'S38', name: '瓦片搭屋顶', at: At(160.8), look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    const pull = ease.inOutCubic(inv(t0 - 0.3, t0 + 1.2, t));
    const cam = { x: W / 2, y: lerp(H / 2 + 20, H / 2 - 40, pull), z: lerp(1.1, 0.62, pull) };
    D.sky(ctx, LINE_BG);
    D.stars(ctx, t, { n: 160, seed: 17, alpha: 0.5 * (1 - sstep(t0 + 1.8, t0 + 2.6, t)), size: 0.8 });
    const rain = sstep(t0 + 2.0, t0 + 2.6, t);
    Wd.layer(ctx, cam, 1, () => {
      const x = W / 2, y = H / 2 + 20, w = 440, h = 360;
      // 墙：金线勾边，再填色
      const wall = ease.outCubic(inv(t0 + 0.4, t0 + 1.4, t));
      ctx.fillStyle = css('#2a2f5a', wall); ctx.fillRect(x - 520, y - 260, 1040, 640);
      ctx.strokeStyle = css(GOLD, 0.8 * (1 - wall * 0.6)); ctx.lineWidth = 3; ctx.strokeRect(x - 520, y - 260, 1040 * wall, 640);
      lineWindow(ctx, t, x, y, w, h, 1, 1, { inside: familyInside(t, x, y, 1) });
      // 屋顶：瓦一排排从上面落下来
      const rows = 7;
      for (let r = 0; r < rows; r++) {
        const yy = y - 300 - r * 46, half = 640 - r * 66;
        for (let c = -12; c <= 12; c++) {
          const tx = x + c * 52; if (Math.abs(c * 52) > half) continue;
          const tt = t0 + 0.6 + r * 0.16 + (c + 12) * 0.012;
          const f = ease.outBack(clamp((t - tt) / 0.35), 1.6);
          if (f <= 0) continue;
          ctx.fillStyle = r % 2 ? '#3a3f78' : '#454a88';
          ctx.beginPath(); ctx.ellipse(tx, yy - (1 - f) * 260, 30, 24, 0, Math.PI, TAU); ctx.fill();
          ctx.strokeStyle = css(GOLD, 0.55); ctx.lineWidth = 2; ctx.stroke();
          if (rain > 0) { const age = fr(t * 2.5 + hash(r * 30 + c, 3)); if (age < 0.25) D.ring(ctx, tx, yy - 20, age, { dur: 0.25, r0: 2, r1: 16, color: '#c8d8ff', width: 1.2, alpha: rain * 0.8 }); }
        }
      }
      // 屋脊
      const ridge = sstep(t0 + 1.9, t0 + 2.2, t);
      ctx.fillStyle = css('#2a2e60', ridge); ctx.fillRect(x - 280, y - 300 - rows * 46 - 6, 560, 26); ctx.strokeStyle = css(GOLD, 0.7 * ridge); ctx.lineWidth = 2; ctx.strokeRect(x - 280, y - 300 - rows * 46 - 6, 560, 26);
      // 屋檐下的雨帘
      if (rain > 0) for (let i = 0; i < 30; i++) { const age = fr(t * 1.6 + hash(i, 8)); ctx.fillStyle = css('#cfe0ff', rain * 0.8 * (1 - age)); ctx.fillRect(x - 640 + i * 44, y - 280 + age * 120, 2, 14); }
    });
    if (rain > 0) D.rain(ctx, t, { n: 220, alpha: 0.45 * rain, angle: 0.1, color: '#a8b8ff', len: 40 });
  } });

  // ———— S39 毛笔写名：毛笔在红纸上写下一个字 ————
  // 「安」字的大致笔顺（字框 0..1），用来遮罩出书写的过程
  const AN = [[[0.47, 0.06], [0.53, 0.17]], [[0.2, 0.24], [0.17, 0.38]], [[0.2, 0.25], [0.5, 0.22], [0.8, 0.21], [0.78, 0.34]], [[0.44, 0.38], [0.34, 0.56], [0.3, 0.64], [0.5, 0.74], [0.74, 0.88]], [[0.62, 0.42], [0.55, 0.62], [0.42, 0.8], [0.22, 0.93]], [[0.1, 0.6], [0.5, 0.58], [0.9, 0.56]]];
  let anGlyph = null;
  function glyph() {
    if (!anGlyph || !anGlyph.ok) { anGlyph = D.makeCanvas(512, 512); anGlyph.ok = document.fonts.check('400 100px "STXingkai"'); const g = anGlyph.getContext('2d'); g.fillStyle = '#16100e'; g.font = '400 470px "STXingkai", "STKaiti", "KaiTi", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('安', 256, 270); }
    return anGlyph;
  }
  let maskC = null;
  MV.shot({ id: 'S39', name: '毛笔写名', at: At(164.85), tin: { type: 'fade', dur: 0.6 }, look: { vignette: 0.4 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    const wr = clamp((t - t0 - 0.2) / 2.2);
    const pull = ease.inOutCubic(inv(t0 + 2.6, s.t1 + 0.3, t));
    const cam = { x: W / 2, y: lerp(H / 2, H / 2 + 60, pull), z: lerp(1.25, 0.8, pull) };
    ctx.fillStyle = '#2a1812'; ctx.fillRect(0, 0, W, H);
    Wd.layer(ctx, cam, 1, () => {
      // 红纸
      const px = W / 2, py = H / 2, ps = 520;
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.02);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-ps / 2 + 14, -ps / 2 + 18, ps, ps);
      ctx.fillStyle = D.lin(ctx, -ps / 2, -ps / 2, ps / 2, ps / 2, [[0, '#d8342a'], [1, '#b0201c']]); ctx.fillRect(-ps / 2, -ps / 2, ps, ps);
      ctx.strokeStyle = 'rgba(240,190,90,.6)'; ctx.lineWidth = 4; ctx.strokeRect(-ps / 2 + 22, -ps / 2 + 22, ps - 44, ps - 44);
      // 字：笔画遮罩
      if (!maskC) maskC = D.makeCanvas(512, 512);
      const m = maskC.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, 512, 512);
      m.globalCompositeOperation = 'source-over';
      m.strokeStyle = '#000'; m.lineCap = 'round'; m.lineJoin = 'round'; m.lineWidth = 86;
      const per = 1 / AN.length;
      AN.forEach((st, i) => { const f = clamp((wr - i * per) / per); if (f <= 0) return; m.beginPath(); D.strokePart(m, st.map(p => [p[0] * 512, p[1] * 512]), 0, f); m.stroke(); });
      if (wr >= 1) m.fillRect(0, 0, 512, 512);
      m.globalCompositeOperation = 'source-in'; m.drawImage(glyph(), 0, 0);
      m.globalCompositeOperation = 'source-over';
      ctx.drawImage(maskC, -ps * 0.42, -ps * 0.44, ps * 0.84, ps * 0.84);
      // 毛笔尖跟着笔画走
      if (wr > 0 && wr < 1) {
        const i = Math.min(AN.length - 1, Math.floor(wr / per)), f = clamp((wr - i * per) / per);
        const st = AN[i], k = Math.min(st.length - 2, Math.floor(f * (st.length - 1))), u = f * (st.length - 1) - k;
        const bx = lerp(st[k][0], st[k + 1][0], u) * ps * 0.84 - ps * 0.42, by = lerp(st[k][1], st[k + 1][1], u) * ps * 0.84 - ps * 0.44;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.5);
        ctx.fillStyle = '#16100e'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, 30, 8, 0); ctx.lineTo(10, -40); ctx.lineTo(-10, -40); ctx.fill();
        ctx.fillStyle = '#c8a060'; ctx.fillRect(-9, -340, 18, 300); ctx.restore();
      }
      ctx.restore();
    });
  } });

  // ———— S40 门框刻度：门框上的身高线一拍一道，孩子长高，她慢慢老去 ————
  MV.shot({ id: 'S40', name: '门框刻度', at: At(168.6), tin: { type: 'fade', dur: 0.5 }, look: { vignette: 0.4 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    const g = clamp((t - t0) / (s.t1 - t0));
    const cam = { x: W / 2 - 40, y: H / 2 + 20, z: 1.05 };
    Wd.layer(ctx, cam, 1, () => {
      ctx.fillStyle = D.lin(ctx, 0, 0, 0, H, [[0, '#6a4a3a'], [1, '#4a3024']]); ctx.fillRect(-300, -300, W + 600, H + 600);
      ctx.fillStyle = '#2a1a14'; ctx.fillRect(-300, 990, W + 600, 400);
      // 门框
      ctx.fillStyle = '#3a2418'; ctx.fillRect(700, 80, 40, 910); ctx.fillRect(1060, 80, 40, 910); ctx.fillRect(700, 60, 400, 40);
      ctx.fillStyle = '#1e120c'; ctx.fillRect(740, 100, 320, 890);
      // 身高线：每拍一道，旁边一个小年份点
      const gk = g * 14, n = Math.floor(gk);
      // 每拍长一截：拍点后 0.4 拍内平滑长上去，之后停住（像延时摄影）
      const grow = Math.min(14, n + ease.outCubic(clamp((gk - n) / 0.4))) / 14;
      for (let i = 0; i <= n; i++) {
        const hgt = lerp(150, 560, Math.pow(i / 14, 0.85)), y = 990 - hgt;
        const a = i === n ? sstep(0, 0.3, g * 14 - n) : 1;
        ctx.strokeStyle = css('#e8d0a0', 0.85 * a); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(700, y); ctx.lineTo(668, y); ctx.stroke();
        ctx.fillStyle = css('#e8d0a0', 0.6 * a); ctx.beginPath(); ctx.arc(650, y, 4, 0, TAU); ctx.fill();
      }
      // 孩子靠着门框站，越来越高
      const P = grow < 0.5 ? F.grow('toddler', 'child', grow * 2) : F.grow('child', 'teen', (grow - 0.5) * 2);
      const hk = lerp(150, 560, Math.pow(grow, 0.85)) + 10;
      F.draw(ctx, { x: 640, y: 990, s: hk, P, age: 'child', hair: 'bob', outfit: 'pants', color: '#1e120c', pose: F.mixPose(F.idle(t), F.pose({ neck: -0.08, shoulderB: -0.1 }), 0.7), t, dir: 1 });
      // 她在门框另一边，慢慢变老
      const old = ease.inOutSine(clamp((grow - 0.15) / 0.85));
      F.draw(ctx, { x: 1240, y: 990, s: lerp(460, 440, old), P: F.grow('woman', 'old', old), age: 'woman', hair: 'bun', bun: old, hairColor: mix('#1e120c', '#a8a8a8', old), outfit: 'long', color: '#1e120c', dir: -1, pose: F.pose({ spine: old * 0.2, neck: 0.1 + old * 0.1 }), t, scarf: { color: RED, len: 0.28 } });
      // 日历纸一张张飞走
      for (let i = 0; i < 10; i++) { const tt = t0 + i * (s.t1 - t0) / 10, age = clamp((t - tt) / 1.2); if (age <= 0 || age >= 1) continue; ctx.save(); ctx.translate(1450 + age * 300, 300 - age * 200 + Math.sin(age * 6) * 30); ctx.rotate(age * 4); ctx.globalAlpha = 1 - age; ctx.fillStyle = '#f2ead8'; ctx.fillRect(-40, -50, 80, 100); ctx.fillStyle = RED; ctx.fillRect(-40, -50, 80, 20); ctx.restore(); }
    });
  } });

  // ———— S41 灯下读书：老了的她在灯下读书，金色的笔画从书页里飘出来 ————
  function strokesFromBook(ctx, t, bx, by, a, settle = 0) {
    for (let i = 0; i < 9; i++) {
      const pts = [];
      for (let k = 0; k <= 40; k++) { const u = k / 40; const r = 60 + u * (260 + 80 * hash(i, 2)) * (1 - settle); const an = hash(i, 3) * TAU + u * (2.5 + hash(i, 4) * 2) + t * 0.3; pts.push([bx + Math.cos(an) * r * 1.3, by - 40 - u * 320 * (1 - settle) + Math.sin(an) * r * 0.5]); }
      D.windLine(ctx, pts, t, { speed: 0.18 + hash(i, 5) * 0.1, offset: hash(i, 6), len: 0.45, width: 2.2, alpha: a, glowA: 0.3, color: '#ffd98a' });
    }
  }
  MV.shot({ id: 'S41', name: '灯下读书', at: At(172.5), tin: { type: 'dip', dur: 0.8, color: '#1a0f0a' }, look: { vignette: 0.5 }, draw(ctx, s) {
    const t = s.t, k = ease.inOutSine(inv(s.t0, s.t1, t));
    const cam = { x: lerp(1000, 960, k), y: lerp(560, 540, k), z: lerp(1.3, 1.15, k) };
    Wd.layer(ctx, cam, 1, () => {
      homeRoom(ctx, t, { papercut: { type: 'flower', color: '#c8281e', size: 0.38, seed: 6 } });
      // 窗台上一只猫
      ctx.fillStyle = '#20120c'; ctx.beginPath(); ctx.ellipse(1150, HWIN.y + HWIN.h / 2 - 8, 40, 26, 0, Math.PI, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(1188, HWIN.y + HWIN.h / 2 - 30, 16, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1178, HWIN.y + HWIN.h / 2 - 42); ctx.lineTo(1182, HWIN.y + HWIN.h / 2 - 58); ctx.lineTo(1190, HWIN.y + HWIN.h / 2 - 44); ctx.moveTo(1192, HWIN.y + HWIN.h / 2 - 44); ctx.lineTo(1200, HWIN.y + HWIN.h / 2 - 56); ctx.lineTo(1202, HWIN.y + HWIN.h / 2 - 40); ctx.fill();
      // 扶手椅
      ctx.fillStyle = '#5a2a22'; ctx.beginPath(); ctx.roundRect(780, 640, 70, 300, 30); ctx.fill(); ctx.beginPath(); ctx.roundRect(780, 820, 330, 90, 30); ctx.fill(); ctx.fillRect(800, 900, 16, 90); ctx.fillRect(1080, 900, 16, 90);
      const page = Math.sin(t * 0.8) * 0.5 + 0.5;
      F.draw(ctx, { x: 900, y: 990, s: 440, age: 'old', hair: 'oldbun', hairColor: '#b8b8b8', outfit: 'robe', color: '#24140e', pose: F.sit({ spine: 0.15, neck: 0.4, shoulderF: 0.9, elbowF: 1.5, shoulderB: 0.8, elbowB: 1.6 }), t, scarf: { color: RED, len: 0.26 }, rim: [2, -2, '#ffb070'],
        inHand: (c, J) => { const h = J.AF.hand; c.save(); c.translate(h[0] + 0.01, h[1] - 0.02); c.rotate(-0.5); c.fillStyle = '#f2e6cc'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0.09, -0.02); c.lineTo(0.09, 0.05); c.lineTo(0, 0.06); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, 0); c.lineTo(-0.08 + page * 0.02, -0.02); c.lineTo(-0.08, 0.05); c.lineTo(0, 0.06); c.fill(); c.restore(); } });
      strokesFromBook(ctx, t, 1020, 640, sstep(s.t0 + 0.4, s.t0 + 1.4, t));
      D.glow(ctx, 1020, 650, 120, '#ffe2a8', 0.4);
    });
  } });

  // ———— S42 雪夜一窗灯：笔画落回书里，镜头慢慢退出窗外，雪夜里一窗暖光 ————
  MV.shot({ id: 'S42', name: '雪夜一窗灯', at: At(176.15), tin: { type: 'fade', dur: 0.8 }, look: { vignette: 0.5 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, u = ease.inOutCubic(inv(t0 + 0.6, s.t1, t));
    const settle = ease.inOutSine(inv(t0, t0 + 1.6, t));
    // 屋里 → 窗外：屋里慢慢退后，同时叠化成从窗外看的雪夜一窗暖光（不经过黑场）
    const xf = sstep(0.3, 0.62, u);
    if (xf < 1) {
      const cam = { x: 960, y: 540, z: lerp(1.15, 1.0, Math.min(1, u * 2)) };
      Wd.layer(ctx, cam, 1, () => {
        homeRoom(ctx, t, { papercut: { type: 'flower', color: '#c8281e', size: 0.38, seed: 6 } });
        ctx.fillStyle = '#5a2a22'; ctx.beginPath(); ctx.roundRect(780, 640, 70, 300, 30); ctx.fill(); ctx.beginPath(); ctx.roundRect(780, 820, 330, 90, 30); ctx.fill(); ctx.fillRect(800, 900, 16, 90); ctx.fillRect(1080, 900, 16, 90);
        F.draw(ctx, { x: 900, y: 990, s: 440, age: 'old', hair: 'oldbun', hairColor: '#b8b8b8', outfit: 'robe', color: '#24140e', pose: F.sit({ spine: 0.1, neck: 0.55, shoulderF: 0.7, elbowF: 1.6, shoulderB: 0.6, elbowB: 1.7 }), t, scarf: { color: RED, len: 0.26 } });
        strokesFromBook(ctx, t, 1020, 640, 1 - settle, settle);
      });
    }
    if (xf > 0) {
      ctx.save(); ctx.globalAlpha = xf;
      const v = clamp((u - 0.3) / 0.7);
      D.sky(ctx, [[0, '#0a0e26'], [1, '#1e2450']]);
      D.stars(ctx, t, { n: 200, seed: 55, size: 0.9 });
      const cam = { x: 960, y: lerp(470, 560, v), z: lerp(2.4, 1.0, ease.outCubic(v)) };
      Wd.layer(ctx, cam, 1, () => {
        Wd.snowGround(ctx, 900, { t, amp: 20, seed: 9 });
        PR.house(ctx, 960, 905, 560, 460, { snow: 1, t, chimney: true, smoke: 1, seed: 7, papercut: { type: 'flower', seed: 6, size: 0.8, color: '#b8281e' }, lantern: true });
        Wd.pine(ctx, 560, 905, 280, '#141a3a', 1); Wd.pine(ctx, 1400, 905, 320, '#141a3a', 1);
      });
      D.snow(ctx, t, { n: 160, alpha: 0.8, speed: 0.35, seed: 57 });
      ctx.restore();
    }

  } });

  // —— 第 9～16 句的版式 ——
  const H9 = { y: 975, size: 52, weight: 300, spacing: 0.26, gap: 1.4, backdrop: 0.45, glowColor: '#2a1020' };
  const V2 = { layout: 'v', size: 60, weight: 400, spacing: 0.22, gap: 0.9, color: '#fbf3e4', accent: '#ffd88a', accentParts: [1], shadow: 0.7, rise: 0, dur: 0.5 };
  Object.assign(MV.LYRIC_STYLE, {
    9: Object.assign({}, H9), 10: Object.assign({}, H9), 11: Object.assign({}, H9, { gap: 1.6 }), 12: Object.assign({}, H9),
    13: Object.assign({}, V2, { x: 300, y: 150 }),
    14: Object.assign({}, V2, { x: 1680, y: 150 }),
    15: Object.assign({}, V2, { x: 300, y: 150 }),
    16: Object.assign({}, V2, { x: 1680, y: 150 }),
  });
})();

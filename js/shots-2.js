// 第二组：间奏过渡 + 第一段副歌（第 5～8 句）+ 间奏——夏夜虫鸣、雷雨、弯月、晚星、病与痊愈、空与满、世界在转
(() => {
  const { W, H, TAU, clamp, lerp, inv, ease, sstep, win, css, mix, mixc, hash, rng, noise1, fbm, bar: T, beatTime, pulse, beatAt } = MV;
  const D = MV.draw, F = MV.figure, PC = MV.papercut, PR = MV.props, Wd = MV.world;
  const fr = x => x - Math.floor(x);
  const INK = '#071417', GOLD = '#f2c46d', RED = '#d8352a';
  const B = MV.audioData.beatLen;

  // ———— 夏夜田野（S14～S18 共用） ————
  const SUMMER = [[0, '#050f22'], [0.5, '#0b2742'], [0.85, '#164558'], [1, '#2a6466']];
  const STORM = [[0, '#07060f'], [0.55, '#17142a'], [1, '#2a2440']];
  const CLEAR = [[0, '#061330'], [0.55, '#122c58'], [1, '#2c4c7c']];
  const POND = { x: 1260, y: 860, w: 620 };
  function grassBlade(ctx, x, y, h, lean, w) {
    ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.3 + lean * 0.4, y - h * 0.6, x + lean, y - h); ctx.quadraticCurveTo(x + w * 0.3 + lean * 0.4, y - h * 0.6, x + w, y); ctx.closePath();
  }
  function grass(ctx, t, o) {
    const { y, n = 120, h = 120, color = '#04161a', seed = 1, wind = 0.3, x0 = -200, x1 = W + 200, ox = 0 } = o;
    ctx.fillStyle = css(color); ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = x0 + fr(hash(i, seed) - ox / (x1 - x0)) * (x1 - x0), hh = h * (0.5 + hash(i, seed + 1) * 0.8);
      const lean = (Math.sin(t * (1.5 + wind * 3) + x * 0.01) * 0.3 + wind) * hh * 0.35 + (hash(i, seed + 2) - 0.5) * hh * 0.3;
      grassBlade(ctx, x, y + hash(i, seed + 3) * 20, hh, lean, 3 + 4 * hash(i, seed + 4));
    }
    ctx.fill();
    ctx.fillRect(x0, y + 10, x1 - x0, H + 400);
  }
  // 荷叶（侧看）：一片带缺口的圆
  function lotusLeaf(ctx, x, y, r, tilt = 0, color = '#0c3a32') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(1, 0.32);
    ctx.fillStyle = css(color); ctx.beginPath(); ctx.arc(0, 0, r, 0.18, TAU - 0.18); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,220,190,.18)'; ctx.lineWidth = 6; for (let i = 0; i < 6; i++) { const a = 0.4 + i * 1.0; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); ctx.stroke(); }
    ctx.restore();
  }
  function lotusFlower(ctx, x, y, s, open = 1) {
    ctx.save(); ctx.translate(x, y);
    for (let i = -2; i <= 2; i++) { ctx.save(); ctx.rotate(i * 0.32 * open); ctx.fillStyle = mix('#f2a7c0', '#ffe0ea', 0.3 + Math.abs(i) * 0.15); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-s * 0.32, -s * 0.55, 0, -s); ctx.quadraticCurveTo(s * 0.32, -s * 0.55, 0, 0); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  // 闪电：中点位移
  function boltPts(x0, y0, x1, y1, seed) {
    const r = rng(seed); let pts = [[x0, y0], [x1, y1]];
    for (let k = 0; k < 6; k++) {
      const out = [pts[0]];
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); out.push([(a[0] + b[0]) / 2 + (r() - 0.5) * d * 0.45, (a[1] + b[1]) / 2 + (r() - 0.5) * d * 0.12], b); }
      pts = out;
    }
    return pts;
  }
  function bolt(ctx, pts, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const [w, al, c] of [[30, 0.12, '#9a8cff'], [12, 0.35, '#c8c0ff'], [4, 0.9, '#ffffff']]) { ctx.strokeStyle = css(c, al * a); ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
    ctx.restore();
  }
  const cricketSpots = [[260, 900, 1], [520, 935, 2], [880, 920, 3], [1580, 930, 4], [1760, 905, 5]];
  function field(ctx, t, cam, o = {}) {
    const { storm = 0, clear = 0, flash = 0, moon = 0, rainA = 0, chirp = 1, wind = 0.25, stars = 1, skyDepth = 0.08 } = o;
    // 天：夏夜 → 雷雨 → 雨后
    const sky = [0, 0.55, 1].map((p, i) => [p, mixc(mixc(SUMMER[Math.min(i + (i ? 1 : 0), 3)][1], STORM[i][1], storm), CLEAR[i][1], clear)]);
    D.sky(ctx, sky, -600, H);
    Wd.layer(ctx, cam, skyDepth, () => D.stars(ctx, t, { n: 520, seed: 31, region: [-900, -700, W + 1800, 1250], alpha: stars * (1 - storm) + clear * 0.9, size: 0.9 }));
    if (flash > 0) { ctx.fillStyle = css('#d8d4ff', flash * 0.55); ctx.fillRect(-100, -100, W + 200, H + 200); }
    // 远山、村庄的灯
    Wd.layer(ctx, cam, 0.3, () => {
      D.ridge(ctx, { base: 760, amp: 170, freq: 0.0014, seed: 21, x0: -700, x1: W + 700, fill: mix(mix('#0b2a35', '#151228', storm), '#0d1f3a', clear) });
      for (let i = 0; i < 40; i++) { const x = 100 + hash(i, 81) * 900, y = 770 + hash(i, 82) * 40; D.glow(ctx, x, y, 9, '#ffc777', 0.6 * (0.6 + 0.4 * Math.sin(t * 2 + i))); }
    });
    Wd.layer(ctx, cam, 0.55, () => D.ridge(ctx, { base: 860, amp: 90, freq: 0.0024, seed: 22, x0: -700, x1: W + 700, fill: mix(mix('#082028', '#0f0d1e', storm), '#0a1730', clear) }));
    // 池塘
    Wd.layer(ctx, cam, 0.8, () => {
      const { x, y, w } = POND;
      ctx.fillStyle = D.lin(ctx, 0, y - 30, 0, y + 70, [[0, sky[2][1]], [1, sky[1][1]]]); ctx.beginPath(); ctx.ellipse(x, y + 20, w / 2, 46, 0, 0, TAU); ctx.fill();
      if (moon > 0) { ctx.save(); ctx.translate(x + 120, y + 20); ctx.scale(1, -0.35); D.moon(ctx, 0, 0, 34, 0.3, '#f6efd8', moon * 0.7, -0.5); ctx.restore(); }
      // 雨点打在水面
      if (rainA > 0) for (let i = 0; i < 26; i++) { const age = fr(t * 2 + hash(i, 5)); D.ring(ctx, x + (hash(i, 6) - 0.5) * w * 0.75, y + 20 + (hash(i, 7) - 0.5) * 40, age * 0.6, { dur: 0.6, r0: 2, r1: 22, color: '#c8d8ff', width: 1.5, alpha: rainA }); }
      for (let i = 0; i < 7; i++) lotusLeaf(ctx, x - w * 0.42 + i * w * 0.14, y + 16 + (i % 2) * 10, 52 + 18 * hash(i, 9), 0.05 * Math.sin(t * 2 + i) * (1 + wind * 3), mix('#0c3a32', '#0b1d24', storm));
      lotusFlower(ctx, x - 120, y + 6, 44); lotusFlower(ctx, x + 170, y + 12, 36, 0.8);
    });
    // 中景草
    Wd.layer(ctx, cam, 0.9, () => grass(ctx, t, { y: 900, n: 160, h: 90, color: mix(mix('#06221f', '#0b0a16', storm), '#071628', clear), seed: 3, wind }));
    // 蟋蟀：草尖上的小剪影，叫声是一圈圈金色的弧
    Wd.layer(ctx, cam, 1, () => {
      for (const [x, y, sd] of cricketSpots) {
        ctx.fillStyle = '#020a0c'; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.2);
        ctx.beginPath(); ctx.ellipse(0, 0, 13, 5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(12, -2, 4.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#020a0c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14, -4); ctx.quadraticCurveTo(30, -26, 44, -22); ctx.moveTo(-6, 2); ctx.lineTo(-14, 12); ctx.moveTo(4, 2); ctx.lineTo(10, 12); ctx.stroke();
        ctx.restore();
        if (chirp > 0) D.ripples(ctx, x + 10, y - 6, t + sd * 0.13, { n: 3, period: B / 2, speed: 120, maxR: 110, color: GOLD, width: 1.6, alpha: chirp * (0.5 + 0.5 * pulse(t, 3)), a0: -Math.PI * 0.95, a1: -Math.PI * 0.05 });
        ctx.fillStyle = css('#04161a'); ctx.fillRect(x - 2, y + 4, 4, 140);
      }
    });
  }
  const fireflies = (ctx, t, a = 1) => D.fireflies(ctx, t, { n: 50, seed: 9, alpha: a, region: [0, 300, W, 650], size: 1.2 });
  const kidSummer = { age: 'child', hair: 'bob', outfit: 'dress', scarf: { color: RED, len: 0.22 }, color: INK };

  // ———— S13 冬去夏来：梦里的团花散成花瓣，变成萤火，落进夏夜田野 ————
  MV.shot({ id: 'S13', name: '冬去夏来', at: 14, tin: { type: 'fade', dur: 0.5 }, look: { vignette: 0.5 }, draw(ctx, s) {
    const t = s.t, u = inv(T(14), T(15.4), t);
    const k = ease.inOutSine(inv(T(14) + 0.6, T(15.2), t));
    // 背景：红纸梦境渐变成夏夜
    D.sky(ctx, [[0, mixc('#5a0d12', SUMMER[0][1], k)], [0.6, mixc('#8e1a1c', SUMMER[2][1], k)], [1, mixc('#b8321f', SUMMER[3][1], k)]]);
    D.stars(ctx, t, { n: 300, seed: 31, alpha: k, size: 0.9 });
    const fade = 1 - sstep(0, 0.35, u);
    PC.draw(ctx, 'flower', W / 2, H / 2 + 20, 900, { seed: 2, N: 12, color: '#e0a640', alpha: fade, rot: (t - T(13)) * 0.05 });
    // 花瓣：从团花的位置飞散，金色 → 绿色 → 萤火
    for (let i = 0; i < 90; i++) {
      const a0 = hash(i, 3) * TAU, r0 = 120 + hash(i, 4) * 300;
      const sx = W / 2 + Math.cos(a0) * r0, sy = H / 2 + 20 + Math.sin(a0) * r0;
      const e = ease.outCubic(clamp(u * 1.4 - hash(i, 5) * 0.3));
      const swirl = a0 + e * (2 + hash(i, 6) * 2);
      const x = lerp(sx, W / 2 + Math.cos(swirl) * (r0 + 500 * e), e * 0.8) + Math.sin(t + i) * 20 * e;
      const y = lerp(sy, 500 + hash(i, 7) * 450, ease.inOutSine(e)) + Math.sin(t * 1.3 + i) * 14;
      const g = sstep(0.25, 0.7, e), fly = sstep(0.75, 1, e);
      if (fly < 1) D.petal(ctx, x, y, (9 + 7 * hash(i, 8)) * (1 - fly), t * 2 + i, Math.sin(t * 3 + i), mix(mix('#f0c060', '#7fcf8a', g), '#e9ff9e', fly), 1 - fly * 0.6);
      if (fly > 0) D.glow(ctx, x, y, 18, '#d8ff9a', fly * (0.6 + 0.4 * Math.sin(t * 3 + i)));
    }
    // 田野从下面升起
    const rise = ease.outCubic(inv(T(14) + 2.2, T(15.4), t));
    const cam = { x: W / 2, y: H / 2 + 260 * (1 - rise), z: 1 };
    ctx.save(); ctx.globalAlpha = sstep(0.4, 0.75, u);
    Wd.layer(ctx, cam, 0.55, () => D.ridge(ctx, { base: 860, amp: 90, freq: 0.0024, seed: 22, x0: -700, x1: W + 700, fill: '#082028' }));
    Wd.layer(ctx, cam, 1, () => grass(ctx, t, { y: 900, n: 160, h: 90, color: '#06221f', seed: 3, wind: 0.4 }));
    ctx.restore();
  } });

  // ———— S14 草尖萤火：草叶特写，一只萤火落在草尖 ————
  MV.shot({ id: 'S14', name: '草尖萤火', at: 15.4, tin: { type: 'fade', dur: 0.6 }, draw(ctx, s) {
    const t = s.t, u = inv(T(15.4), T(16), t);
    D.sky(ctx, SUMMER);
    D.stars(ctx, t, { n: 300, seed: 31, size: 1 });
    D.moon(ctx, 1500, 210, 40, 0.75, '#f6efd8', 0.9, -0.4);
    const cam = { x: W / 2, y: H / 2 - 40 * ease.inOutSine(u), z: 1 };
    Wd.layer(ctx, cam, 0.4, () => D.ridge(ctx, { base: 880, amp: 120, freq: 0.002, seed: 21, x0: -700, x1: W + 700, fill: '#0b2a35' }));
    // 远处虚化的萤火
    for (let i = 0; i < 26; i++) { const x = hash(i, 71) * W, y = 300 + hash(i, 72) * 600; D.glow(ctx, x + Math.sin(t + i) * 20, y + Math.cos(t * 0.8 + i) * 14, 30 + 30 * hash(i, 73), '#c8f08a', 0.25 + 0.2 * Math.sin(t * 2 + i)); }
    // 近处几根大草叶：弯的、带月光描边
    Wd.layer(ctx, cam, 1, () => {
      const blades = [[260, 900, -140, 30], [470, 1050, 60, 34], [720, 780, 160, 30], [1080, 960, -60, 32], [1380, 840, 90, 28], [1660, 1000, -120, 34]];
      blades.forEach(([x, h, l, w], i) => {
        const sw = Math.sin(t * 1.1 + i * 1.7) * 18, y = 1180, lean = l + sw;
        const tipX = x + lean, tipY = y - h;
        ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.6 + lean * 0.2, y - h * 0.55, tipX, tipY); ctx.quadraticCurveTo(x + w * 0.5 + lean * 0.25, y - h * 0.5, x + w, y); ctx.closePath();
        ctx.fillStyle = D.lin(ctx, 0, tipY, 0, y, [[0, '#123a3a'], [0.5, '#0a2628'], [1, '#04121a']]); ctx.fill();
        ctx.strokeStyle = 'rgba(190,230,255,.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w, y); ctx.quadraticCurveTo(x + w * 0.5 + lean * 0.25, y - h * 0.5, tipX, tipY); ctx.stroke();
        if (i === 2) MV.S14tip = [tipX, tipY];
      });
      const tip = MV.S14tip;
      D.glow(ctx, tip[0], tip[1] + 6, 16, '#bfe8ff', 0.9);
      const f = ease.inOutSine(clamp(u * 1.4));
      const fx = lerp(1250, tip[0] + 4, f) + Math.sin(t * 3) * 20 * (1 - f), fy = lerp(300, tip[1] - 12, f) + Math.cos(t * 2.4) * 16 * (1 - f);
      D.glow(ctx, fx, fy, 90, '#d8ff9a', 0.6 + 0.3 * Math.sin(t * 5)); D.glow(ctx, fx, fy, 14, '#fbffe6', 1);
    });
  } });

  // ———— S15 蟋蟀与声波：夏夜田野，她躺在坡上；蟋蟀的叫声是金色的波纹 ————
  MV.shot({ id: 'S15', name: '蟋蟀与声波', at: 16, chapter: '副歌一', tin: { type: 'iris', dur: 0.9, center: 0.3, get x() { return (MV.S14tip || [900, 560])[0]; }, get y() { return (MV.S14tip || [900, 560])[1]; }, ring: '#d8ff9a' }, draw(ctx, s) {
    const t = s.t, k = ease.inOutSine(inv(T(16), T(17), t));
    const kz = ease.inOutCubic(inv(T(16) - 0.2, T(16) + 2.6, t));
    const cam = { x: lerp(640, W / 2 + 40, kz), y: lerp(700, H / 2, kz), z: lerp(1.9, 1.08, kz) };
    field(ctx, t, cam, { storm: sstep(T(17) - 0.6, T(17), t) * 0.6, wind: 0.25, moon: 1 });
    Wd.layer(ctx, cam, 0.08, () => D.moon(ctx, 1500, 210, 40, 0.75, '#f6efd8', 1, -0.4));
    fireflies(ctx, t);
    Wd.layer(ctx, cam, 1, () => {
      // 前景的草坡：她躺在坡顶，剪影衬着天
      const moundY = x => 820 + Math.pow((x - 520) / 520, 2) * 120;
      ctx.beginPath(); ctx.moveTo(-200, H + 300); for (let x = -200; x <= 1200; x += 20) ctx.lineTo(x, moundY(x)); ctx.lineTo(1200, H + 300); ctx.closePath();
      ctx.fillStyle = D.lin(ctx, 0, 800, 0, 1100, [[0, '#0b2c2a'], [1, '#041214']]); ctx.fill();
      const p = F.pose({ spine: 0, neck: -0.1, thighF: 0.55, kneeF: 1.2, thighB: 0.05, kneeB: 0.05, shoulderF: 2.9, elbowF: 2.1, shoulderB: 2.8, elbowB: 2.2, ground: false, rot: -Math.PI / 2 + 0.05 });
      F.draw(ctx, Object.assign({}, kidSummer, { x: 700, y: moundY(520) - 4, s: 240, pose: p, t, wind: 0.1, rim: [0, -2, '#7fd0c0'] }));
      grass(ctx, t, { y: 850, n: 90, h: 46, color: '#041214', seed: 8, wind: 0.25, x0: -200, x1: 1150 });
      // 她身边也有一只蟋蟀
      D.ripples(ctx, 900, 850, t, { n: 3, period: B / 2, speed: 140, maxR: 140, color: GOLD, width: 1.8, alpha: 0.6 + 0.4 * pulse(t, 3), a0: -Math.PI * 0.95, a1: -Math.PI * 0.05 });
    });
  } });


  // ———— S16 闪电：乌云压过来，闪电劈下，雨来了 ————
  const BOLT1 = boltPts(1320, -40, 1180, 760, 7), BOLT2 = boltPts(520, -40, 640, 740, 11);
  const strike1 = () => T(17) + 0.02, strike2 = () => T(17) + 2 * B;
  MV.shot({ id: 'S16', name: '闪电', at: 17, draw(ctx, s) {
    const t = s.t;
    const st = sstep(T(17) - 0.6, T(17) + 0.4, t);
    const hit = q => (t >= q ? Math.exp(-(t - q) * 5) : 0);
    const flash = Math.min(1, hit(strike1()) * 1.4 + hit(strike2()) * 1.1 + (t >= strike1() && t < strike1() + 0.12 ? 0.6 : 0));
    const shake = (hit(strike1()) + hit(strike2()) * 0.7) * 10;
    const cam = { x: W / 2 + 40 + Math.sin(t * 60) * shake, y: H / 2 + Math.cos(t * 53) * shake, z: 1.12 };
    field(ctx, t, cam, { storm: st, flash, rainA: sstep(T(17), T(17) + 0.5, t), chirp: 1 - st, wind: 0.8, stars: 0 });
    // 乌云：一层层从右边压过来
    Wd.layer(ctx, cam, 0.2, () => {
      for (let i = 0; i < 9; i++) {
        const x = lerp(W + 600 + i * 200, -300 + i * 260, ease.outCubic(inv(T(17) - 0.8, T(17) + 0.6 + i * 0.08, t)));
        const y = 60 + (i % 3) * 110 + hash(i, 4) * 60;
        D.cloud(ctx, x, y, 520 + 200 * hash(i, 5), 150 + 40 * hash(i, 6), { seed: i + 30, top: mixc('#2a2645', '#c8c0ff', flash * 0.6), bottom: mixc('#141226', '#8a80d0', flash * 0.5), shade: 0.3 });
      }
    });
    Wd.layer(ctx, cam, 0.3, () => { bolt(ctx, BOLT1, hit(strike1()) * 1.6 * (t > strike1() ? 1 : 0)); bolt(ctx, BOLT2, hit(strike2()) * 1.5 * (t > strike2() ? 1 : 0)); });
    // 雷声：两道白环
    D.ring(ctx, 1180, 420, t - strike1(), { dur: 1.4, r0: 40, r1: 1100, color: '#e8e4ff', width: 5, alpha: 0.7 });
    D.ring(ctx, 640, 400, t - strike2(), { dur: 1.3, r0: 40, r1: 1000, color: '#e8e4ff', width: 4, alpha: 0.6 });
    D.rain(ctx, t, { n: 320, alpha: 0.55 * sstep(T(17), T(17) + 0.5, t), angle: 0.25, color: mix('#a8b8ff', '#ffffff', flash), len: 50 });
  } });

  // ———— S16b 荷叶当伞：她顶着一片大荷叶在雨里跑 ————
  MV.shot({ id: 'S16b', name: '荷叶当伞', at: 17.5, tin: { type: 'wipe', dur: 0.5, ang: Math.PI, soft: 260 }, draw(ctx, s) {
    const t = s.t, lt = t - T(17.5);
    const hit = q => (t >= q ? Math.exp(-(t - q) * 5) : 0);
    const flash = hit(strike2()) * 1.1;
    const dx = lt * 380;
    D.sky(ctx, STORM.map(([p, c]) => [p, mixc(c, '#8a80d0', flash * 0.4)]), -600, H);
    Wd.layer(ctx, { x: W / 2, y: H / 2, z: 1 }, 0.2, () => { for (let i = 0; i < 6; i++) D.cloud(ctx, ((i * 520 + dx * 0.2) % 2600) - 300, 120 + (i % 2) * 120, 640, 170, { seed: i + 40, top: '#2a2645', bottom: '#141226', shade: 0.3 }); });
    D.ridge(ctx, { base: 780, amp: 160, freq: 0.0014, seed: 21, ox: -dx * 0.25, x0: -300, x1: W + 300, fill: '#151228' });
    D.ridge(ctx, { base: 880, amp: 80, freq: 0.0024, seed: 22, ox: -dx * 0.5, x0: -300, x1: W + 300, fill: '#0f0d1e' });
    grass(ctx, t, { y: 930, n: 140, h: 80, color: '#0b0a16', seed: 4, wind: 0.9, ox: -dx * 0.8 });
    // 地上积水的反光
    ctx.fillStyle = 'rgba(160,170,230,.12)'; for (let i = 0; i < 6; i++) { const x = fr(hash(i, 3) + dx / 2400) * 2400 - 200; ctx.beginPath(); ctx.ellipse(x, 1000 + i * 8, 120, 8, 0, 0, TAU); ctx.fill(); }
    const gx = 1020, gy = 1000, gs = 300;
    F.draw(ctx, Object.assign({}, kidSummer, { x: gx, y: gy, s: gs, dir: -1, pose: Object.assign(F.run(t * 10, 0.85), { shoulderF: 2.7, elbowF: 0.3, shoulderB: 2.5, elbowB: 0.5 }), t, wind: 0.9,
      inHand: (c, J) => { const h = J.AF.hand; c.save(); c.scale(1 / gs, 1 / gs); const hx = h[0] * gs, hy = h[1] * gs;
        c.strokeStyle = '#0c2a26'; c.lineWidth = 5; c.beginPath(); c.moveTo(hx, hy + 20); c.lineTo(hx - 6, hy - 60); c.stroke();
        c.save(); c.translate(hx - 6, hy - 62); c.rotate(-0.15 + Math.sin(t * 9) * 0.05);
        c.fillStyle = '#123f36'; c.beginPath(); c.ellipse(0, 0, 150, 52, 0, Math.PI, TAU); c.quadraticCurveTo(0, 18, -150, 0); c.fill();
        c.strokeStyle = 'rgba(160,220,190,.25)'; c.lineWidth = 3; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(i * 46, -Math.sqrt(Math.max(0, 1 - (i * 46 / 150) ** 2)) * 50); c.stroke(); }
        // 从叶沿滴下的水
        for (let i = 0; i < 8; i++) { const age = fr(t * 2.2 + i / 8); c.fillStyle = css('#cfe0ff', 0.8 * (1 - age)); c.fillRect(-150 + i * 42, 4 + age * 120, 2, 10); }
        c.restore(); c.restore(); } }));
    for (let i = 0; i < 10; i++) { const age = fr(t * 2.4 + i / 10); D.ring(ctx, gx + 60 + age * 200, gy + 4, age * 0.5, { dur: 0.5, r0: 4, r1: 40, color: '#c8d8ff', width: 1.5, alpha: 0.6 }); }
    if (flash > 0) { ctx.fillStyle = css('#d8d4ff', flash * 0.5); ctx.fillRect(0, 0, W, H); }
    D.rain(ctx, t, { n: 340, alpha: 0.55, angle: -0.3, color: '#a8b8ff', len: 54, speed: 1.1 });
  } });

  // ———— S17 雨后新月：雨停，云幕拉开，金线描出一弯新月 ————
  MV.shot({ id: 'S17', name: '雨后新月', at: 17.88, tin: { type: 'fade', dur: 0.8 }, draw(ctx, s) {
    const t = s.t;
    const open = ease.inOutCubic(inv(T(17.88), T(17.88) + 2.0, t));
    const cam = { x: W / 2 + 60, y: lerp(H / 2 + 60, H / 2 - 20, ease.inOutSine(inv(T(17.88), T(19), t))), z: 1.05 };
    field(ctx, t, cam, { storm: 1 - open, clear: open, moon: sstep(0.5, 1, open), chirp: sstep(0.7, 1, open) * 0.6, wind: 0.2, stars: open });
    // 月：先描金边，再充满
    const mx = 1300, my = 230, mr = 90;
    const draw = ease.inOutSine(inv(T(17.88) + 0.6, T(17.88) + 2.2, t)), fill = sstep(T(17.88) + 1.8, T(17.88) + 2.8, t);
    Wd.layer(ctx, cam, 0.08, () => {
      if (fill > 0) D.moon(ctx, mx, my, mr, 0.32, '#f8f0d4', fill, -0.55);
      if (draw > 0) {
        ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.55);
        const d = 0.64 * mr, rb = mr * 1.02, ix = (rb * rb - mr * mr - d * d) / (2 * d), iy = Math.sqrt(Math.max(0, mr * mr - ix * ix));
        const al = Math.atan2(iy, ix), be = Math.atan2(iy, ix + d);
        const pts = [];
        for (let i = 0; i <= 40; i++) { const a = -al + (2 * al * i) / 40; pts.push([Math.cos(a) * mr, Math.sin(a) * mr]); }
        for (let i = 0; i <= 40; i++) { const a = be - (2 * be * i) / 40; pts.push([-d + Math.cos(a) * rb, Math.sin(a) * rb]); }
        ctx.strokeStyle = css(GOLD, 0.95 * (1 - fill * 0.6)); ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); D.strokePart(ctx, pts, 0, draw); ctx.stroke(); ctx.restore();
      }
    });
    // 两片云幕往两边拉开
    Wd.layer(ctx, cam, 0.2, () => {
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, y = 80 + Math.floor(i / 2) * 140;
        const x = W / 2 + side * (300 + open * 900 + i * 40);
        D.cloud(ctx, x, y + 80, 900, 200, { seed: i + 50, top: mixc('#2a2645', '#33406e', open), bottom: mixc('#141226', '#1c2850', open), shade: 0.25, a: 1 - open * 0.3 });
      }
    });
    fireflies(ctx, t, open * 0.8);
    // 她站在池边，荷叶还举在头上，抬头看月亮
    Wd.layer(ctx, cam, 1, () => {
      const gx = 980, gy = 935, gs = 260;
      const lower = sstep(T(17.88) + 1.6, T(17.88) + 2.6, t);
      F.draw(ctx, Object.assign({}, kidSummer, { x: gx, y: gy, s: gs, pose: F.mixPose(F.pose({ shoulderF: 2.6, elbowF: 0.4, shoulderB: 2.4, elbowB: 0.5, neck: -0.4 }), F.pose({ shoulderF: 1.2, elbowF: 0.6, shoulderB: -0.2, elbowB: 0.3, neck: -0.55 }), lower), t, wind: 0.1,
        inHand: (c, J) => { const h = J.AF.hand; c.save(); c.scale(1 / gs, 1 / gs); c.translate(h[0] * gs, h[1] * gs); c.rotate(lerp(0, 1.1, lower));
          c.strokeStyle = '#0c2a26'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 20); c.lineTo(-6, -60); c.stroke();
          c.translate(-6, -62); c.fillStyle = '#123f36'; c.beginPath(); c.ellipse(0, 0, 130, 46, 0, Math.PI, TAU); c.quadraticCurveTo(0, 16, -130, 0); c.fill();
          for (let i = 0; i < 6; i++) { const age = fr(t * 1.2 + i / 6); c.fillStyle = css('#cfe0ff', 0.8 * (1 - age)); c.beginPath(); c.arc(-120 + i * 46, 6 + age * 160, 2.5, 0, TAU); c.fill(); }
          c.restore(); } }));
    });
    // 檐角滴水
    for (let i = 0; i < 12; i++) { const age = fr(t * 0.9 + hash(i, 2)); ctx.fillStyle = css('#dfe8ff', 0.7 * (1 - age)); ctx.beginPath(); ctx.arc(hash(i, 3) * W, -20 + age * (H + 40), 2, 0, TAU); ctx.fill(); }
  } });

  // ———— S18 鱼形星座：星星按拍亮起，连成外婆剪的那条鱼 ————
  const FISH_STARS = [[0.82, 0], [0.42, -0.36], [0.0, -0.44], [-0.45, -0.16], [-0.98, -0.5], [-0.84, 0], [-0.98, 0.5], [-0.45, 0.16], [0.0, 0.42], [0.42, 0.34], [0.82, 0], [0.58, -0.07]];
  MV.FISH_STARS = FISH_STARS;
  MV.shot({ id: 'S18', name: '鱼形星座', at: 18.95, draw(ctx, s) {
    const t = s.t, t0 = T(18.95);
    const k = ease.inOutSine(inv(t0, T(20), t));
    const cam = { x: lerp(W / 2 + 60, W / 2 + 700, k), y: lerp(H / 2 - 20, H / 2 - 160, k), z: lerp(1.05, 0.95, k) };
    field(ctx, t, cam, { clear: 1, moon: 1, chirp: 0.5, wind: 0.2, skyDepth: 0.5 });
    Wd.layer(ctx, cam, 0.5, () => D.moon(ctx, 1300 + 30, 230 + 0, 90, 0.32, '#f8f0d4', 1, -0.55));
    // 星座：每拍点亮一颗（放在镜头摇向的右上方天空）
    Wd.layer(ctx, cam, 0.5, () => {
      const cx = 1930, cy = 240, sc = 270;
      const n = FISH_STARS.length;
      const lit = i => sstep(0, 0.25, (t - t0) / (B * 0.5) - 1 - i);
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 1; i < n - 1; i++) {
        const a = FISH_STARS[i - 1], b = FISH_STARS[i], u = lit(i);
        if (u <= 0) continue;
        ctx.strokeStyle = css(GOLD, 0.55); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(cx + a[0] * sc, cy + a[1] * sc); ctx.lineTo(cx + lerp(a[0], b[0], u) * sc, cy + lerp(a[1], b[1], u) * sc); ctx.stroke();
      }
      ctx.restore();
      FISH_STARS.forEach((p, i) => { if (i === n - 2) return; const u = lit(i); if (u <= 0) return; const x = cx + p[0] * sc, y = cy + p[1] * sc; D.glow(ctx, x, y, 40 + 30 * (1 - u), '#fff1c8', u * 0.8); D.flare(ctx, x, y, 34, '#fff6dc', u * 0.9, 0.3); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); });
      // 最亮的一颗：晚星
      const ev = sstep(t0, t0 + 0.6, t); D.glow(ctx, 1560, 130, 80, '#fff1c8', 0.8 * ev); D.flare(ctx, 1560, 130, 90, '#ffffff', 0.9 * ev, 0.2);
    });
    fireflies(ctx, t, 0.8);
    Wd.layer(ctx, cam, 1, () => {
      const gx = 1060, gy = 935, gs = 260;
      F.draw(ctx, Object.assign({}, kidSummer, { x: gx, y: gy, s: gs, pose: F.pose({ shoulderF: 2.8, elbowF: 0.15, shoulderB: -0.1, elbowB: 0.3, neck: -0.6, spine: -0.05 }), t, wind: 0.1 }));
    });
  } });

  // ———— 病房（S19、S20）：同一间屋，先灰后暖 ————
  const RWIN = { x: 1250, y: 380, w: 380, h: 340 };
  const dayView = (t, warm) => (c, x, y, w, h) => {
    const cyc = 0.5 + 0.5 * Math.cos((t - T(20)) * 2.6); // 窗外日夜交替（病中的几天）
    const day = warm > 0 ? 1 : cyc;
    c.fillStyle = D.lin(c, 0, y, 0, y + h, [[0, mixc(mixc('#1a2340', '#a9b8c8', day), '#ffd88a', warm)], [1, mixc(mixc('#2a3354', '#d5dde2', day), '#fff0c8', warm)]]); c.fillRect(x, y, w, h);
    if (warm > 0) { D.glow(c, x + w * 0.7, y + h * 0.3, 160, '#fff4d0', warm); }
    c.fillStyle = css(mixc('#5a6a7a', '#6a8a5a', warm)); c.beginPath(); for (let i = 0; i <= 8; i++) { const xx = x + (w * i) / 8; c.lineTo(xx, y + h * 0.72 - 30 * Math.sin(i * 1.3) - 20 * hash(i, 4)); } c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.fill();
    // 一枝树叶
    c.fillStyle = css(mixc('#4a5a5a', '#5a8a4a', warm)); for (let i = 0; i < 9; i++) D.petal(c, x + 40 + i * 22, y + 60 + Math.sin(i) * 20, 16, 0.6 + i * 0.3 + Math.sin(t * 2 + i) * 0.1 * (1 + warm * 3), 1, c.fillStyle);
  };
  function sickroom(ctx, t, o = {}) {
    const { warm = 0, wind = 0, chime = 0, sit = 0 } = o;
    const g = warm;
    Wd.room(ctx, t, { win: RWIN, view: dayView(t, warm), wall: [mix('#8a95a8', '#e8c49a', g), mix('#6a7488', '#c89a70', g)], floor: mix('#4a5266', '#8a5a40', g), curtain: mix('#a7b2c0', '#f2e2c4', g), sill: mix('#5a6274', '#a0703a', g), frame: mix('#4a5264', '#6a4026', g), light: [mix('#ffffff', '#fff0c0', g), 0.15 + 0.4 * g], wind });
    // 阳光斜射进来
    if (warm > 0) D.rays(ctx, RWIN.x + 60, RWIN.y - 120, Math.PI * 0.72, 0.5, 1500, t, { n: 7, color: '#fff0c0', alpha: 0.28 * warm });
    // 风铃挂在窗框上
    const sw = chime * (Math.sin(t * 4.2) * 0.6 + Math.sin(t * 7.3) * 0.25);
    PR.chime(ctx, RWIN.x - 110, RWIN.y - RWIN.h / 2 + 4, 34, sw, { t, paper: '#e8483a' });
    if (chime > 0) { for (let k = 0; k < 4; k++) { const q = beatTime(Math.floor(beatAt(t)) - k); D.ring(ctx, RWIN.x - 110, RWIN.y - RWIN.h / 2 + 40, t - q, { dur: 1.6, r0: 10, r1: 260, color: GOLD, width: 2, alpha: chime * 0.7 }); } D.glow(ctx, RWIN.x - 110, RWIN.y - RWIN.h / 2 + 30, 70, '#fff1c8', chime * 0.5); }
    // 床头凳上一碗药，冒着热气
    ctx.fillStyle = mix('#3a4256', '#5a3a2a', g); ctx.fillRect(1180, 820, 150, 18); ctx.fillRect(1192, 838, 14, 150); ctx.fillRect(1304, 838, 14, 150);
    ctx.fillStyle = mix('#e8ecf0', '#fff4e0', g); ctx.beginPath(); ctx.ellipse(1255, 812, 40, 12, 0, 0, TAU); ctx.fill(); ctx.fillRect(1218, 790, 74, 22); ctx.beginPath(); ctx.ellipse(1255, 790, 37, 9, 0, 0, TAU); ctx.fillStyle = mix('#6a4a3a', '#7a4a2a', g); ctx.fill();
    for (let i = 0; i < 3; i++) { const pts = []; for (let k = 0; k <= 20; k++) { const u = k / 20; pts.push([1240 + i * 14 + Math.sin(u * 7 + t * 2 + i) * 12 * u, 780 - u * 150]); } D.windLine(ctx, pts, t, { speed: 0.4, offset: i * 0.33, len: 0.6, width: 3, alpha: 0.5 * (1 - g * 0.5), glowA: 0, color: '#ffffff' }); }
    Wd.bed(ctx, 230, 990, 860, { t, quilt: [mix('#7a8aa0', '#e08a6a', g), mix('#5a6680', '#b8584a', g)], pattern: mix('#c8d0dc', '#ffd8a0', g), frame: mix('#3a4256', '#5a3a26', g), pillow: mix('#dfe3ea', '#fff4e4', g), kid: '#1a1f2c', headUp: sit, breathe: 1.6 - g });
    // 额头上的湿毛巾
    if (sit < 0.3) { ctx.fillStyle = css('#f4f6f8', 1 - sit * 3); ctx.save(); ctx.translate(348, 742); ctx.rotate(0.3); ctx.fillRect(-26, -10, 52, 20); ctx.restore(); }
  }

  // ———— S19 病中：灰蓝的屋子，窗外日夜交替，外婆守着打扇 ————
  MV.shot({ id: 'S19', name: '病中', at: 20, tin: { type: 'dip', dur: 0.8, color: '#0a0c18' }, look: { vignette: 0.5, grain: 0.08 }, draw(ctx, s) {
    const t = s.t, k = ease.inOutSine(inv(T(20), T(21), t));
    const cam = { x: lerp(W / 2 - 80, W / 2 - 20, k), y: H / 2 + 10, z: lerp(1.06, 1.12, k) };
    Wd.layer(ctx, cam, 1, () => {
      sickroom(ctx, t, {});
      // 外婆坐在床边慢慢打扇
      const fan = Math.sin(t * 2.4);
      const gx = 760, gy = 1000, gs = 470;
      ctx.fillStyle = '#2a3042'; ctx.fillRect(gx - 60, gy - 132, 120, 20); ctx.fillRect(gx - 50, gy - 122, 14, 122); ctx.fillRect(gx + 36, gy - 122, 14, 122);
      const pose = F.sit({ spine: 0.3, neck: 0.3, shoulderF: 1.3 + fan * 0.25, elbowF: 1.2 - fan * 0.2, shoulderB: 0.5, elbowB: 1.0 });
      F.draw(ctx, { x: gx, y: gy - 10, s: gs, age: 'old', hair: 'oldbun', outfit: 'robe', pose, t, color: '#2a3044', dir: -1,
        inHand: (c, J) => { const h = J.AF.hand; c.save(); c.translate(h[0], h[1]); c.rotate(-0.6 + fan * 0.35); c.fillStyle = '#c8b27a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0.02, -0.03); c.ellipse(0.02, -0.11, 0.07, 0.085, 0, Math.PI * 0.5, Math.PI * 2.5); c.fill(); c.restore(); } });
    });
    // 灰色的雾：低饱和
    ctx.fillStyle = 'rgba(150,160,180,.12)'; ctx.fillRect(0, 0, W, H);
  } });

  // ———— S20 阳光与风铃：阳光照进来，窗开了，风铃响，她坐起来 ————
  MV.shot({ id: 'S20', name: '阳光与风铃', at: 20.95, tin: { type: 'fade', dur: 1.2 }, look: { vignette: 0.35 }, draw(ctx, s) {
    const t = s.t, t0 = T(20.95);
    const warm = ease.inOutSine(inv(t0 - 0.3, t0 + 2.0, t));
    const sit = ease.inOutCubic(inv(t0 + 1.2, t0 + 2.8, t));
    const k = ease.inOutSine(inv(t0, T(22), t));
    const cam = { x: lerp(W / 2 - 20, W / 2 + 120, k), y: lerp(H / 2 + 10, H / 2 - 20, k), z: lerp(1.12, 1.2, k) };
    Wd.layer(ctx, cam, 1, () => {
      sickroom(ctx, t, { warm, wind: warm * 0.8, chime: sstep(t0 + 0.6, t0 + 1.4, t), sit });
      D.petals(ctx, t, { n: 26, seed: 14, colors: ['#ffd0dc', '#ffe8c8'], alpha: warm, wind: -160, fall: 40, region: [400, 100, 1300, 900] });
      D.dust(ctx, t, { n: 50, color: '#fff2d6', alpha: 0.6 * warm, region: [700, 150, 900, 800] });
    });
  } });

  // ———— S21 白色空间：大片留白，少女提着箱子站着，只有围巾是红的 ————
  const PAPER = '#f2eee6';
  MV.shot({ id: 'S21', name: '白色空间', at: 22, tin: { type: 'dip', dur: 0.9, color: '#ffffff' }, look: { vignette: 0.12, grain: 0.05 }, draw(ctx, s) {
    const t = s.t, k = ease.inOutSine(inv(T(22), T(22.93) + 0.5, t));
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    const cam = { x: W / 2 + 40, y: H / 2 + 20, z: lerp(1.0, 1.12, k) };
    Wd.layer(ctx, cam, 1, () => {
      // 地平线：一条极淡的线
      ctx.strokeStyle = 'rgba(60,60,80,.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-200, 780); ctx.lineTo(W + 200, 780); ctx.stroke();
      // 长长的影子
      ctx.save(); ctx.translate(1000, 780); ctx.transform(1, 0, -1.6, 0.18, 0, 0); ctx.globalAlpha = 0.16;
      F.draw(ctx, { x: 0, y: 0, s: 340, age: 'teen', hair: 'pony', outfit: 'dress', pose: F.idle(t), t, color: '#2a2a3a', scarf: { color: '#2a2a3a' }, wind: 0.1 });
      ctx.restore();
      F.draw(ctx, { x: 1000, y: 780, s: 340, age: 'teen', hair: 'pony', outfit: 'dress', pose: F.pose({ shoulderF: 0.05, elbowF: 0.1, shoulderB: -0.05, elbowB: 0.12, neck: 0.12 }), t, color: '#2b2b3b', scarf: { color: RED, len: 0.3 }, wind: 0.15,
        inHand: (c, J) => { const h = J.AF.hand; c.save(); c.translate(h[0], h[1]); c.fillStyle = '#2b2b3b'; c.fillRect(-0.02, 0.01, 0.04, 0.03); c.beginPath(); c.roundRect(-0.13, 0.035, 0.26, 0.19, 0.02); c.fill(); c.restore(); } });
    });
    D.dust(ctx, t, { n: 40, color: '#8a8a9a', alpha: 0.35, drift: 6, seed: 19 });
  } });

  // ———— S22 金线与水彩：金线从她心口牵出去，画出一样样东西，颜色晕开填满画面 ————
  const ICONS = (() => {
    const circle = (cx, cy, r, a0 = 0, a1 = TAU, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
    const heart = Array.from({ length: 61 }, (_, i) => { const a = i / 60 * TAU; return [16 * Math.sin(a) ** 3 * 4, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 4]; });
    const envelope = [[-70, -45], [70, -45], [70, 45], [-70, 45], [-70, -45], [0, 10], [70, -45]];
    const bike = [...circle(-55, 20, 34), [-55, 20], [-10, -20], [30, 20], [-55, 20], [-20, -30], [-10, -20], [40, -28], [55, 20], ...circle(55, 20, 34)];
    const cat = [[-40, 50], [-46, 10], [-30, -20], [-36, -56], [-14, -34], [14, -34], [36, -56], [30, -20], [46, 10], [40, 50], [70, 40], [84, 10]];
    const lantern = [...circle(0, 0, 50, -Math.PI * 0.42, Math.PI * 1.42), [-28, -48], [28, -48], [0, -48], [0, -78], [0, -48], [-30, 50], [30, 50], [0, 50], [0, 90]];
    const flower = Array.from({ length: 121 }, (_, i) => { const a = i / 120 * TAU, r = 40 + 18 * Math.cos(a * 6); return [Math.cos(a) * r, Math.sin(a) * r]; });
    const friends = [...circle(-36, -50, 16), [-36, -34], [-36, 20], [-56, 60], [-36, 20], [-16, 60], [-36, -20], [0, -4], [36, -20], [36, 20], [16, 60], [36, 20], [56, 60], [36, 20], [36, -34], ...circle(36, -50, 16)];
    const note = [[-20, 40], ...circle(-34, 40, 14), [-20, 40], [-20, -40], [30, -55], [30, 25], ...circle(16, 25, 14)];
    const star = Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 22 : 56; return [Math.cos(a) * r, Math.sin(a) * r]; });
    const win = [[-50, -60], [50, -60], [50, 60], [-50, 60], [-50, -60], [0, -60], [0, 60], [-50, 0], [50, 0]];
    return [
      { pts: heart, x: 640, y: 300, c: '#f28a8a' }, { pts: envelope, x: 1330, y: 270, c: '#f2c46d' }, { pts: bike, x: 400, y: 640, c: '#7ac0c8' },
      { pts: cat, x: 1560, y: 650, c: '#c8a0e0' }, { pts: lantern, x: 960, y: 170, c: '#e86a4a' }, { pts: flower, x: 1660, y: 330, c: '#f2a7c0' },
      { pts: friends, x: 300, y: 330, c: '#8ac88a' }, { pts: note, x: 1240, y: 520, c: '#f2c46d' }, { pts: star, x: 760, y: 560, c: '#ffd27a' }, { pts: win, x: 1820, y: 860, c: '#e8b04a' },
    ];
  })();
  MV.shot({ id: 'S22', name: '金线与水彩', at: 22.93, look: { vignette: 0.15, grain: 0.05 }, draw(ctx, s) {
    const t = s.t, t0 = T(22.93), dur = T(24.5) - t0;
    const u = clamp((t - t0) / dur);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    const heartP = [1000 + 18, 780 - 340 * 0.74];
    const cam = { x: W / 2 + 40, y: H / 2 + 20, z: lerp(1.12, 1.0, ease.inOutSine(u)) };
    Wd.layer(ctx, cam, 1, () => {
      // 水彩晕开：乘法混合，越来越大，最后铺满
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      ICONS.forEach((ic, i) => {
        const st = 0.1 + i * 0.055, g = ease.outCubic(clamp((u - st - 0.12) / 0.5));
        if (g <= 0) return;
        for (let k = 0; k < 4; k++) D.glow(ctx, ic.x + Math.cos(k * 1.7 + i) * 40 * g, ic.y + Math.sin(k * 2.3 + i) * 30 * g, (180 + 520 * g) * (0.7 + 0.15 * k), ic.c, 0.42 * g, 'multiply');
      });
      const all = ease.inOutSine(clamp((u - 0.62) / 0.38));
      if (all > 0) { ctx.globalAlpha = all * 0.7; ctx.fillStyle = D.lin(ctx, 0, 0, W, H, [[0, '#f6c9a8'], [0.5, '#f2a7a0'], [1, '#e8c47a']]); ctx.fillRect(-200, -200, W + 400, H + 400); }
      ctx.restore();
      // 金线：从心口牵出去，画出图标
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ICONS.forEach((ic, i) => {
        const st = 0.04 + i * 0.055;
        const th = ease.inOutSine(clamp((u - st) / 0.16)), dr = ease.inOutSine(clamp((u - st - 0.12) / 0.2));
        if (th <= 0) return;
        const thread = D.bez(heartP, [heartP[0] + (ic.x - heartP[0]) * 0.2, heartP[1] - 200], [ic.x, ic.y + 200 * Math.sign(heartP[1] - ic.y)], [ic.x, ic.y], 40);
        ctx.strokeStyle = css('#c8962e', 0.75 * (1 - sstep(0.75, 1, u) * 0.5)); ctx.lineWidth = 1.6; ctx.beginPath(); D.strokePart(ctx, thread, 0, th); ctx.stroke();
        if (dr > 0) { const pts = ic.pts.map(p => [ic.x + p[0], ic.y + p[1]]); ctx.strokeStyle = css('#a0701e', 0.95); ctx.lineWidth = 3; ctx.beginPath(); D.strokePart(ctx, pts, 0, dr); ctx.stroke(); }
        if (th < 1) { const p = thread[Math.floor(th * (thread.length - 1))]; D.glow(ctx, p[0], p[1], 14, '#ffd98a', 0.8, 'source-over'); }
      });
      D.glow(ctx, heartP[0], heartP[1], 70, '#ffcf7a', 0.5 + 0.3 * Math.sin(t * 4), 'source-over');
      F.draw(ctx, { x: 1000, y: 780, s: 340, age: 'teen', hair: 'pony', outfit: 'dress', pose: F.mixPose(F.pose({ shoulderF: 0.05, elbowF: 0.1, neck: 0.12 }), F.pose({ shoulderF: 0.9, elbowF: 0.9, shoulderB: 0.7, elbowB: 1.0, neck: -0.15 }), ease.inOutSine(clamp(u * 3))), t, color: '#2b2b3b', scarf: { color: RED, len: 0.3 }, wind: 0.2 + 0.4 * u });
    });
  } });

  // ———— S23～S25 世界在转：她走在转动的星球顶上，四季流转，长成大人；最后来到海边 ————
  const SEASONS = [ // 地面、树冠、天空（白天）
    { ground: '#a8d08a', crown: '#f6b8c8', sky: '#bfe0f2', blossom: 1 },
    { ground: '#5a9a5a', crown: '#2f7a4f', sky: '#8cc8ea', blossom: 0 },
    { ground: '#c8a05a', crown: '#e0803a', sky: '#f0c8a0', blossom: 0 },
    { ground: '#e8eef6', crown: '#c8d4e4', sky: '#c8d6ea', blossom: 0 },
  ];
  const seasonAt = t => { const u = clamp(inv(T(24.5), T(28) + 1, t)) * 4.2; const i = Math.floor(u) % 4, f = sstep(0.75, 1, u - Math.floor(u)); const A = SEASONS[i], Bs = SEASONS[(i + 1) % 4]; return { ground: mixc(A.ground, Bs.ground, f), crown: mixc(A.crown, Bs.crown, f), sky: mixc(A.sky, Bs.sky, f), blossom: lerp(A.blossom, Bs.blossom, f), snow: (i === 3 ? 1 - f : 0) + (i === 2 ? f : 0), leaves: i === 2 ? 1 - f : 0, idx: i }; };
  const WORLD = (() => {
    const it = [], r = rng(55);
    for (let i = 0; i < 46; i++) { const a = i / 46 * TAU + (r() - 0.5) * 0.06; const k = r(); it.push(k < 0.55 ? { a, type: 'tree', s: 0.1 + r() * 0.06, seed: i } : k < 0.8 ? { a, type: 'house', s: 0.11 + r() * 0.04, seed: i, chimney: r() > 0.5 } : { a, type: 'tower', s: 0.12 + r() * 0.12, seed: i }); }
    return it;
  })();
  const SEA_A = 3.83; // 海在星球上的角度：间奏快结束时正好从右边转上来
  function seasonPlanet(ctx, t, x, y, R, rot, o = {}) {
    const S = seasonAt(t);
    const { sea = 1, dusk = 0 } = o;
    D.glow(ctx, x, y, R * 1.35, mixc(S.sky, '#ffffff', 0.3), 0.35, 'lighter');
    ctx.fillStyle = D.rad(ctx, x - R * 0.3, y - R * 0.5, R * 0.1, R * 1.1, [[0, mixc(S.ground, '#ffffff', 0.25)], [0.7, S.ground], [1, mixc(S.ground, '#203040', 0.5)]]);
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    // 海：球面上的一段蓝
    if (sea > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, R * 1.003, 0, TAU); ctx.clip();
      const a = SEA_A + rot - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R * 1.004, a - 0.42, a + 0.42); ctx.closePath();
      ctx.fillStyle = D.rad(ctx, x, y, R * 0.82, R * 1.004, [[0, mixc('#1f4a8a', '#5a3a7a', dusk * 0.6)], [0.7, mixc('#3a7ac0', '#d86a6a', dusk * 0.6)], [1, mixc('#8ac8f0', '#ffc890', dusk * 0.8)]]); ctx.fill();
      for (let k = 0; k < 40; k++) { const aa = a - 0.4 + hash(k, 3) * 0.8, rr = R * (0.985 - hash(k, 4) * 0.05); const tw = Math.pow(0.5 + 0.5 * Math.sin(t * 3 + k * 1.7), 3); ctx.fillStyle = css('#fff0c8', 0.8 * tw); ctx.fillRect(x + Math.cos(aa) * rr - 6, y + Math.sin(aa) * rr, 12, 2); }
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = R * 0.006;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.arc(x, y, R * (1 - k * 0.012), a - 0.3 + Math.sin(t * 2 + k) * 0.01, a + 0.3); ctx.stroke(); }
      ctx.restore();
    }
    for (const it of WORLD) {
      const a = it.a + rot;
      if (Math.cos(a) < -0.2) continue;
      const da = Math.abs(((it.a - SEA_A + Math.PI) % TAU + TAU) % TAU - Math.PI);
      if (sea > 0 && da < 0.47) continue; // 海上不长树
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.translate(0, -R * 0.995);
      const s = it.s * R;
      if (it.type === 'tree') { Wd.roundTree(ctx, 0, 0, s, css(S.crown), '#3a2a2a', it.seed, S.blossom, t); if (S.snow > 0.05) { ctx.fillStyle = css('#ffffff', S.snow * 0.8); ctx.beginPath(); ctx.arc(0, -s * 0.82, s * 0.2, Math.PI, TAU); ctx.fill(); } }
      else if (it.type === 'house') PR.house(ctx, 0, 0, s, s * 0.85, { wall: '#e8dcc8', roof: '#5a4a5a', snow: S.snow, seed: it.seed, windowLit: 0.6, chimney: it.chimney, smoke: 0.6, t, festive: false, detail: 0.6 });
      else { ctx.fillStyle = '#d8d0c8'; ctx.fillRect(-s * 0.18, -s, s * 0.36, s); ctx.fillStyle = 'rgba(80,100,140,.5)'; for (let k = 0; k < 6; k++) ctx.fillRect(-s * 0.1, -s * 0.9 + k * s * 0.14, s * 0.2, s * 0.06); }
      ctx.restore();
    }
    if (S.leaves > 0) D.petals(ctx, t, { n: 30, seed: 41, colors: ['#e0803a', '#c8582a'], alpha: S.leaves, wind: 120, fall: 70, size: 10 });
    if (S.snow > 0) D.snow(ctx, t, { n: 90, alpha: S.snow * 0.8, speed: 0.6, seed: 44 });
    if (S.blossom > 0.05) D.petals(ctx, t, { n: 30, seed: 42, colors: ['#ffd0dc', '#ffe8ee'], alpha: S.blossom, wind: 90, fall: 40, size: 8 });
  }
  // 天：日夜交替（太阳、月亮绕着星球转）
  function cycleSky(ctx, t, cx, cy, R, o = {}) {
    const S = seasonAt(t);
    const { dusk = 0 } = o;
    const ph = (t - T(24.5)) / (T(28) - T(24.5)) * 2 + 0.25; // 两个日夜
    const day = 0.5 + 0.5 * Math.cos(ph * TAU);
    const top = mixc(mixc('#0c1438', S.sky, day), '#4a3a7a', dusk), mid = mixc(mixc('#1c2a5a', mixc(S.sky, '#ffffff', 0.4), day), '#ff9a7a', dusk), bot = mixc(mixc('#3a3a6a', '#ffe8d0', day * 0.8), '#ffcf8a', dusk);
    D.sky(ctx, [[0, top], [0.6, mid], [1, bot]]);
    D.stars(ctx, t, { n: 300, seed: 61, alpha: (1 - day) * (1 - dusk), size: 0.9 });
    const sa = ph * TAU + Math.PI;
    const sx = cx + Math.sin(sa) * R * 1.45, sy = cy - Math.cos(sa) * R * 1.45;
    D.glow(ctx, sx, sy, 300, '#fff1c8', 0.6); ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(sx, sy, 46, 0, TAU); ctx.fill();
    const mx = cx - Math.sin(sa) * R * 1.4, my = cy + Math.cos(sa) * R * 1.4;
    D.moon(ctx, mx, my, 34, 0.35, '#f6efd8', 1, sa);
  }
  const PR_C = 960, PR_Y = 1080 + 560, PR_R = 820;
  const worldRot = t => -(t - T(24.5)) * 0.22;
  // 长大：每过一季长一截（季节交替时用 1 秒左右平滑长上去），身形、发型、裙长都连续变化
  const growAt = t => {
    const k = clamp(inv(T(24.5) + 1.2, T(28), t)) * 4;
    const i = Math.min(3, Math.floor(k));
    return (i + ease.inOutCubic(clamp((k - i) * 3.2 - 2.2))) / 4;
  };
  MV.growAt = growAt;
  function walker(ctx, t, x, y, s, o = {}) {
    const u = growAt(t);
    const P = F.grow('teen', 'woman', u);
    F.draw(ctx, { x, y, s: s * lerp(0.92, 1, u), P, age: 'woman', hair: 'flow', hairMix: { len: lerp(0.7, 1, u), tie: 1 - u }, outfit: 'long', skirt: u, pose: F.walk(t * 4.6, lerp(0.85, 0.9, u), { stride: lerp(0.36, 0.38, u) }), t, wind: 0.5, color: o.color || '#1d2236', scarf: { color: RED, len: lerp(0.3, 0.32, u) } });
  }
  MV.shot({ id: 'S23', name: '四季星球', at: 24.5, chapter: '间奏', tin: { type: 'iris', dur: 1.2, center: 0.5, x: 1018, y: 520, r0: 40 }, look: { vignette: 0.35 }, draw(ctx, s) {
    const t = s.t;
    const pull = ease.inOutCubic(inv(T(24.5) - 0.6, T(25.5), t));
    const cam = { x: W / 2, y: lerp(H / 2 - 160, H / 2, pull), z: lerp(2.4, 1, pull) };
    cycleSky(ctx, t, PR_C, PR_Y, PR_R);
    Wd.layer(ctx, cam, 1, () => { seasonPlanet(ctx, t, PR_C, PR_Y, PR_R, worldRot(t)); walker(ctx, t, PR_C, PR_Y - PR_R + 2, 290); });
  } });
  MV.shot({ id: 'S24', name: '日夜流转', at: 26.5, look: { vignette: 0.35 }, draw(ctx, s) {
    const t = s.t, k = ease.inOutSine(inv(T(26.5), T(28), t));
    const cam = { x: W / 2 + 120 * k, y: H / 2 - 60 * k, z: lerp(1, 0.82, k) };
    cycleSky(ctx, t, PR_C, PR_Y, PR_R, { dusk: sstep(T(27.4), T(28.2), t) });
    Wd.layer(ctx, cam, 1, () => { seasonPlanet(ctx, t, PR_C, PR_Y, PR_R, worldRot(t), { dusk: sstep(T(27.4), T(28.2), t) }); walker(ctx, t, PR_C, PR_Y - PR_R + 2, 290); });
  } });
  MV.shot({ id: 'S25', name: '抵达海边', at: 28, look: { vignette: 0.35 }, draw(ctx, s) {
    const t = s.t;
    // 星球慢慢停住：海的左岸正好停在她脚下
    const tA = T(28) + 0.6, tB = T(28) + 2.4, rotStop = -(SEA_A - 0.47);
    const rot = t < tA ? worldRot(t) : lerp(worldRot(tA), rotStop, ease.outCubic(inv(tA, tB, t)));
    const walking = 1 - sstep(tA + 0.4, tB, t);
    const u = ease.inOutCubic(inv(T(28) + 1.0, T(29) + 0.2, t));
    // 镜头推向她右边的海平线
    const seaTop = [PR_C + 160, PR_Y - PR_R - 30];
    const cam = { x: lerp(W / 2 + 120, seaTop[0], u), y: lerp(H / 2 - 60, seaTop[1] - 60, u), z: Math.exp(lerp(Math.log(0.82), Math.log(2.2), u)) };
    cycleSky(ctx, t, PR_C, PR_Y, PR_R, { dusk: 1 });
    Wd.layer(ctx, cam, 1, () => {
      seasonPlanet(ctx, t, PR_C, PR_Y, PR_R, rot, { dusk: 1 });
      const P = F.grow('teen', 'woman', 1);
      F.draw(ctx, { x: PR_C, y: PR_Y - PR_R + 2, s: 290, P, age: 'woman', hair: 'long', outfit: 'long', pose: F.mixPose(F.idle(t), F.walk(t * 4.6, 0.9), walking), t, wind: 0.6, color: '#1d2236', scarf: { color: RED, len: 0.32 } });
    });
    // 最后半拍：暖光一亮，接海边
    const wash = sstep(T(29) - 0.6, T(29) + 0.1, t);
    if (wash > 0) { ctx.fillStyle = css('#ffd9a8', wash * 0.85); ctx.fillRect(0, 0, W, H); }
  } });

  // —— 第 5～8 句的版式：竖排，左右交替 ——
  const V = { layout: 'v', size: 60, weight: 400, spacing: 0.22, gap: 0.9, color: '#fbf3e4', accent: '#f6d48a', accentParts: [1], shadow: 0.7, rise: 0, dur: 0.5 };
  Object.assign(MV.LYRIC_STYLE, {
    5: Object.assign({}, V, { x: 1730, y: 150 }),
    6: Object.assign({}, V, { x: 300, y: 150 }),
    7: Object.assign({}, V, { x: 1730, y: 150, color: '#ffffff', glowColor: '#1a2030' }),
    8: Object.assign({}, V, { x: 300, y: 170, color: '#2b2b3b', accent: '#b8501e', glow: 0, shadow: 0, glowColor: '#ffffff' }),
  });
})();

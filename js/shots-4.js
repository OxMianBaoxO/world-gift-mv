// 第四组：尾声（第 17～18 句）+ 尾奏——相册、白云下的合影、红围巾传下去、孔明灯、星座、又一年、新的窗花、片尾
(() => {
  const { W, H, TAU, clamp, lerp, inv, ease, sstep, win, css, mix, mixc, hash, rng, bar: T, beatTime, beatAt, pulse } = MV;
  const D = MV.draw, F = MV.figure, PC = MV.papercut, PR = MV.props, Wd = MV.world;
  const fr = x => x - Math.floor(x);
  const B = MV.audioData.beatLen;
  const At = sec => (beatAt(sec) - 2) / 4;
  const GOLD = '#f2c46d', RED = '#d8352a';
  const OLD = { age: 'old', hair: 'oldbun', hairColor: '#c8c8c8', outfit: 'robe' };

  // ———— 相册：一页旧照片（之前镜头的定格） ————
  const PHOTOS = [['S05', 27.6, -0.08, 520, 330], ['S20', 85.8, 0.06, 1400, 300], ['S31', 136.2, 0.05, 560, 760], ['S33', 143.6, -0.05, 1380, 770]];
  function album(ctx, t, o = {}) {
    const { lift = 0, glow = -1 } = o;
    ctx.fillStyle = D.lin(ctx, 0, 0, W, H, [[0, '#efe4cc'], [1, '#e0d2b4']]); ctx.fillRect(-300, -300, W + 600, H + 600);
    // 纸纹
    ctx.fillStyle = 'rgba(120,90,50,.06)'; for (let i = 0; i < 60; i++) ctx.fillRect(hash(i, 2) * W, 0, 1, H);
    ctx.fillStyle = 'rgba(120,80,40,.25)'; ctx.fillRect(W / 2 - 3, -300, 6, H + 600);
    PHOTOS.forEach(([id, st, rot, x, y], i) => {
      const img = MV.director.snapshot(id, st, 448, 252);
      const up = lift > 0 ? ease.outCubic(clamp(lift * 1.5 - i * 0.12)) : 0;
      const px = x + Math.sin(t * 0.8 + i) * 6 * up, py = y - up * (80 + i * 20) + Math.sin(t * 1.1 + i * 2) * 8 * up;
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot + up * Math.sin(t + i) * 0.04);
      ctx.fillStyle = 'rgba(60,40,20,.25)'; ctx.fillRect(-236 + 10, -146 + 14, 472, 330);
      ctx.fillStyle = '#fbf8f0'; ctx.fillRect(-236, -146, 472, 330);
      if (img) ctx.drawImage(img, -224, -134, 448, 252);
      // 泛黄
      ctx.fillStyle = 'rgba(255,220,160,.12)'; ctx.fillRect(-224, -134, 448, 252);
      ctx.fillStyle = 'rgba(240,230,200,.7)'; ctx.save(); ctx.rotate(-0.6); ctx.fillRect(-250, -150, 90, 24); ctx.restore();
      if (glow === i) D.glow(ctx, 0, 0, 420, '#ffe0a0', 0.35 + 0.15 * Math.sin(t * 3));
      ctx.restore();
    });
  }

  // ———— S43 翻页：书页一翻，翻成一本相册 ————
  let pageSnap = null;
  MV.shot({ id: 'S43', name: '翻页', at: At(180.85), look: { vignette: 0.35 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    const u = ease.inOutCubic(inv(t0, t0 + 1.6, t));
    album(ctx, t);
    // 前一页：上一镜最后一帧，绕左边翻过去
    if (u < 1) {
      if (!pageSnap) pageSnap = MV.director.snapshot('S42', t0 - 0.02, 960, 540);
      const ang = u * Math.PI, c = Math.cos(ang);
      ctx.save(); ctx.translate(0, 0);
      if (c > 0) {
        ctx.transform(c, Math.sin(ang) * 0.12, 0, 1, 0, 0);
        ctx.drawImage(pageSnap, 0, 0, W, H);
        ctx.fillStyle = css('#000000', (1 - c) * 0.5); ctx.fillRect(0, 0, W, H);
      } else {
        ctx.transform(c, -Math.sin(ang) * 0.12, 0, 1, 0, 0);
        ctx.fillStyle = D.lin(ctx, 0, 0, W, 0, [[0, '#d8c8a8'], [1, '#f2e8d4']]); ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      // 翻页时投下的影子
      ctx.fillStyle = D.lin(ctx, Math.abs(c) * W, 0, Math.abs(c) * W + 160, 0, [[0, '#3a2a1a', 0.35 * Math.sin(ang)], [1, '#3a2a1a', 0]]); ctx.fillRect(Math.abs(c) * W * (c > 0 ? 1 : 0), 0, 160, H);
    }
  } });

  // ———— S44 浮起的旧照片：老了的她坐在窗下翻相册，照片一张张浮起来围着她 ————
  MV.shot({ id: 'S44', name: '浮起的旧照片', at: At(184.0), chapter: '尾声', tin: { type: 'fade', dur: 0.8 }, look: { vignette: 0.4 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, k = ease.inOutSine(inv(t0, s.t1, t));
    const cam = { x: lerp(960, 900, k), y: lerp(520, 560, k), z: lerp(1.1, 1.0, k) };
    Wd.layer(ctx, cam, 1, () => {
      Wd.room(ctx, t, { win: { x: 1320, y: 380, w: 380, h: 330 }, view: (c, x, y, w, h) => { c.fillStyle = D.lin(c, 0, y, 0, y + h, [[0, '#ffd9a0'], [1, '#ffe8c0']]); c.fillRect(x, y, w, h); D.glow(c, x + w * 0.3, y + h * 0.4, 160, '#fff4d8', 0.8); }, wall: ['#7a5a46', '#5a3e30'], floor: '#3a261c', curtain: '#b06a4a', papercut: { type: 'flower', seed: 6, color: '#c8281e', size: 0.38 }, light: ['#ffc070', 0.35] });
      D.rays(ctx, 1320, 260, Math.PI * 0.75, 0.45, 1300, t, { n: 6, color: '#fff0c8', alpha: 0.2 });
      ctx.fillStyle = '#6a3226'; ctx.beginPath(); ctx.roundRect(700, 640, 70, 300, 30); ctx.fill(); ctx.beginPath(); ctx.roundRect(700, 820, 330, 90, 30); ctx.fill(); ctx.fillRect(720, 900, 16, 90); ctx.fillRect(1000, 900, 16, 90);
      F.draw(ctx, Object.assign({ x: 820, y: 990, s: 440, color: '#2a1a12', pose: F.sit({ spine: 0.2, neck: 0.5, shoulderF: 0.9, elbowF: 1.4, shoulderB: 0.8, elbowB: 1.5 }), t, scarf: { color: RED, len: 0.26 }, rim: [2, -2, '#ffc890'],
        inHand: (c, J) => { const h = J.AF.hand; c.save(); c.translate(h[0] + 0.02, h[1] - 0.01); c.rotate(-0.15); c.fillStyle = '#e8dcc0'; c.fillRect(-0.12, -0.015, 0.24, 0.03); c.fillStyle = '#7a3a2a'; c.fillRect(-0.125, 0.012, 0.25, 0.012); c.restore(); } }, OLD));
      // 照片从相册里浮起来，围成一圈
      const rise = ease.outCubic(inv(t0 + 0.3, t0 + 2.4, t));
      PHOTOS.forEach(([id, st], i) => {
        const img = MV.director.snapshot(id, st, 448, 252);
        const a = -Math.PI * 0.85 + i * 0.5 + Math.sin(t * 0.5 + i) * 0.03;
        const r = lerp(20, 330, rise);
        const px = 960 + Math.cos(a) * r * 1.3, py = 640 + Math.sin(a) * r;
        const sc = lerp(0.12, 0.42, rise);
        ctx.save(); ctx.translate(px, py); ctx.rotate(Math.sin(t * 0.7 + i) * 0.06 + (i - 1.5) * 0.08); ctx.scale(sc, sc); ctx.globalAlpha = sstep(0, 0.2, rise);
        ctx.fillStyle = '#fbf8f0'; ctx.fillRect(-236, -146, 472, 330); if (img) ctx.drawImage(img, -224, -134, 448, 252);
        ctx.restore();
        D.glow(ctx, px, py, 120 * sc * 2, '#ffe8c0', 0.2 * rise);
      });
    });
  } });

  // ———— S45 窗边的孩子：孙辈趴在窗台上，看着外面明亮的天和云 ————
  const DAY = [[0, '#5aa8e8'], [0.6, '#9ad0f4'], [1, '#e4f4ff']];
  MV.shot({ id: 'S45', name: '窗边的孩子', at: At(187.9), tin: { type: 'wipe', dur: 0.8, ang: 0, soft: 360 }, look: { vignette: 0.25, grain: 0.05 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, k = ease.inOutSine(inv(t0, s.t1, t));
    // 从窗里往外看：前景窗框剪影，外面是大晴天
    D.sky(ctx, DAY);
    const cam = { x: lerp(980, 1060, k), y: 540, z: lerp(1.0, 1.06, k) };
    Wd.layer(ctx, cam, 0.3, () => {
      for (let i = 0; i < 5; i++) D.cloud(ctx, ((i * 520 + t * 22) % 2600) - 300, 220 + (i % 3) * 90, 420 + 120 * hash(i, 3), 120, { seed: i + 70, top: '#ffffff', bottom: '#d8e8f6', shade: 0.2 });
      D.ridge(ctx, { base: 860, amp: 160, freq: 0.0016, seed: 30, x0: -600, x1: W + 600, fill: '#8ac07a' });
      D.ridge(ctx, { base: 930, amp: 90, freq: 0.0026, seed: 31, x0: -600, x1: W + 600, fill: '#6aa86a' });
      for (let i = 0; i < 8; i++) Wd.roundTree(ctx, 200 + i * 230, 920 + (i % 2) * 10, 110 + 40 * hash(i, 5), '#4a8a5a', '#5a4038', i, 0, t);
    });
    // 一只纸飞机飞出去
    const pf = fr((t - t0) * 0.25);
    ctx.save(); ctx.translate(lerp(900, 1900, pf), lerp(600, 250, pf) + Math.sin(pf * 9) * 30); ctx.rotate(-0.3);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-24, -14); ctx.lineTo(-14, 0); ctx.lineTo(-24, 14); ctx.closePath(); ctx.fill(); ctx.restore();
    Wd.layer(ctx, cam, 1, () => {
      // 屋里：墙、窗框、窗台（窗台在 y=640）
      const SILL = 640;
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(-400, -400, 600, H + 800); ctx.fillRect(1720, -400, 800, H + 800); ctx.fillRect(-400, -400, W + 800, 520); ctx.fillRect(-400, SILL, W + 800, 800);
      ctx.fillRect(950, 120, 14, SILL - 120); ctx.fillRect(200, 372, 1520, 10);
      ctx.fillStyle = '#3a3a4c'; ctx.fillRect(160, SILL - 10, 1600, 26);
      // 窗光落在窗台和墙上
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,225,255,.08)'; ctx.fillRect(200, SILL + 16, 1520, 300); ctx.restore();
      // 孩子跪在窗前的椅子上，上身前倾，手臂叠在窗台上，抬头望着外面
      const gx = 760, gs = 560, gy = SILL + 204;
      const breathe = Math.sin(t * 1.6) * 0.012, look = Math.sin(t * 0.7) * 0.05;
      const pose = F.pose({ spine: 0.58 + breathe, neck: -0.42 + look, thighF: 0.18, kneeF: 1.62, thighB: 0.12, kneeB: 1.55, footF: 0.3, footB: 0.3 });
      pose.reachF = [175 / gs, (SILL - 6 - gy) / gs]; pose.reachB = [150 / gs, (SILL - 2 - gy) / gs];
      ctx.fillStyle = '#20202e'; ctx.fillRect(gx - 150, gy, 230, 26); ctx.fillRect(gx - 140, gy + 20, 18, 320); ctx.fillRect(gx + 52, gy + 20, 18, 320); ctx.fillRect(gx - 150, gy - 190, 18, 200);
      F.draw(ctx, { x: gx, y: gy, s: gs, age: 'child', hair: 'bob', outfit: 'dress', skirt: 0, color: '#262636', pose, t, wind: 0.12, scarf: null, rim: [2, -2, '#cfe4ff'] });
    });
  } });

  // ———— S46 白云下的一家人：青山坡上一朵很大的白云，一家人凑过来拍照 ————
  const FAMILY = [ // x, 年龄/造型
    { x: 760, o: Object.assign({ s: 380, color: '#2a3448', scarf: { color: RED, len: 0.26 } }, OLD) },
    { x: 870, o: { s: 410, age: 'man', hair: 'short', hairColor: '#c8c8c8', outfit: 'pants', color: '#2a3448' } },
    { x: 1010, o: { s: 440, age: 'woman', hair: 'pony', outfit: 'long', color: '#2a3448' } },
    { x: 1130, o: { s: 460, age: 'man', hair: 'short', outfit: 'pants', color: '#2a3448' } },
    { x: 940, o: { s: 220, age: 'child', hair: 'bob', outfit: 'dress', color: '#2a3448' } },
  ];
  function hillDay(ctx, t, cam, dusk = 0) {
    const sky = [[0, mixc('#5aa8e8', '#3a2a6a', dusk)], [0.6, mixc('#9ad0f4', '#e07a6a', dusk)], [1, mixc('#e4f4ff', '#ffc890', dusk)]];
    D.sky(ctx, sky, -600, H);
    Wd.layer(ctx, cam, 0.1, () => { D.stars(ctx, t, { n: 200, seed: 77, alpha: sstep(0.6, 1, dusk), size: 0.9 }); });
    Wd.layer(ctx, cam, 0.25, () => {
      D.ridge(ctx, { base: 800, amp: 150, freq: 0.0015, seed: 40, x0: -800, x1: W + 800, fill: mix('#9ac8a8', '#6a4a7a', dusk) });
      // 远处的海与村子
      ctx.fillStyle = mix('#7ab8e0', '#e09a8a', dusk); ctx.fillRect(1300, 760, 1400, 40);
    });
    Wd.layer(ctx, cam, 0.6, () => D.ridge(ctx, { base: 900, amp: 110, freq: 0.002, seed: 41, x0: -800, x1: W + 800, fill: mix('#7ab88a', '#4a3a5a', dusk) }));
    Wd.layer(ctx, cam, 1, () => {
      ctx.fillStyle = D.lin(ctx, 0, 880, 0, 1200, [[0, mixc('#6aaa6a', '#3a2c4a', dusk)], [1, mixc('#3a7a4a', '#24182e', dusk)]]);
      ctx.beginPath(); ctx.moveTo(-600, H + 400); ctx.lineTo(-600, 1000); ctx.quadraticCurveTo(900, 840, W + 600, 1000); ctx.lineTo(W + 600, H + 400); ctx.fill();
      for (let i = 0; i < 40; i++) { const x = hash(i, 9) * W, y = 960 + hash(i, 10) * 100; ctx.fillStyle = css(['#ffffff', '#ffe08a', '#ffb8c8'][i % 3], 0.9 * (1 - dusk)); ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
    });
  }
  const groundY = x => { const u = (x + 600) / (W + 1200); return lerp(1000, 1000, u) - 2 * u * (1 - u) * 160 * 1.0; };
  MV.shot({ id: 'S46', name: '白云下的一家人', at: At(191.9), tin: { type: 'fade', dur: 0.8 }, look: { vignette: 0.25, grain: 0.05 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, k = ease.inOutSine(inv(t0, s.t1, t));
    const cam = { x: lerp(980, 960, k), y: lerp(500, 540, k), z: lerp(0.95, 1.05, k) };
    hillDay(ctx, t, cam);
    // 大白云：慢慢飘到他们头顶
    Wd.layer(ctx, cam, 0.5, () => { const cx = lerp(700, 960, ease.inOutSine(inv(t0 - 1, s.t1 + 3, t))); D.cloud(ctx, cx, 420, 900, 230, { seed: 90, top: '#ffffff', bottom: '#dce8f6', shade: 0.25 }); });
    Wd.layer(ctx, cam, 1, () => {
      FAMILY.forEach((m, i) => {
        const arrive = ease.outCubic(inv(t0 + i * 0.25, t0 + 1.2 + i * 0.25, t));
        const x = lerp(m.x + (i % 2 ? 300 : -300), m.x, arrive);
        const walking = arrive < 0.98;
        F.draw(ctx, Object.assign({ x, y: groundY(x), pose: walking ? F.walk(t * 4 + i, 0.6) : F.idle(t + i), t: t + i, wind: 0.3, dir: i === 0 || i === 4 ? 1 : (x < 960 ? 1 : -1) }, m.o));
      });
      // 三脚架和相机
      const cx = 1500, cy = groundY(1500);
      ctx.strokeStyle = '#2a3448'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy - 230); ctx.lineTo(cx - 60, cy); ctx.moveTo(cx, cy - 230); ctx.lineTo(cx + 50, cy); ctx.moveTo(cx, cy - 230); ctx.lineTo(cx + 8, cy); ctx.stroke();
      ctx.fillStyle = '#2a3448'; ctx.beginPath(); ctx.roundRect(cx - 50, cy - 290, 100, 64, 8); ctx.fill(); ctx.beginPath(); ctx.arc(cx - 50, cy - 258, 22, 0, TAU); ctx.fill();
      const blink = Math.max(0, Math.sin((t - t0) * 9)) > 0.6 ? 1 : 0;
      D.glow(ctx, cx + 30, cy - 280, 16, '#ff4a3a', blink * 0.9);
    });
  } });

  // ———— S47 合影定格：闪光一亮，画面定格成一张照片 ————
  const flashT = () => At(196.75);
  MV.shot({ id: 'S47', name: '合影定格', at: At(195.7), look: { vignette: 0.25, grain: 0.05 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, tf = T(flashT());
    const frozen = Math.min(t, tf);
    const cam = { x: 960, y: 540, z: 1.05 };
    const shrink = ease.inOutCubic(inv(tf + 0.5, tf + 2.0, t));
    const drawScene = c => {
      hillDay(c, frozen, cam);
      Wd.layer(c, cam, 0.5, () => D.cloud(c, 960, 420, 900, 230, { seed: 90, top: '#ffffff', bottom: '#dce8f6', shade: 0.25 }));
      Wd.layer(c, cam, 1, () => {
        FAMILY.forEach((m, i) => {
          const pose = F.mixPose(F.idle(frozen + i), F.pose({ neck: -0.05, shoulderF: i === 4 ? 2.6 : 0.3, elbowF: i === 4 ? 0.3 : 0.5 }), sstep(t0, t0 + 0.6, frozen));
          F.draw(c, Object.assign({ x: m.x, y: groundY(m.x), pose, t: frozen + i, wind: 0.3, dir: i === 0 || i === 4 ? 1 : (m.x < 960 ? 1 : -1) }, m.o));
        });
      });
    };
    if (shrink <= 0) drawScene(ctx);
    else {
      // 定格的照片：缩小、加白边、微微转一下
      ctx.fillStyle = '#e8dcc4'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(120,90,50,.06)'; for (let i = 0; i < 60; i++) ctx.fillRect(hash(i, 2) * W, 0, 1, H);
      const sc = lerp(1, 0.62, shrink), rot = lerp(0, -0.05, shrink);
      ctx.save(); ctx.translate(W / 2, H / 2 - 20 * shrink); ctx.rotate(rot); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(60,40,20,.3)'; ctx.fillRect(-W / 2 - 40 + 24, -H / 2 - 40 + 30, W + 80, H + 180);
      ctx.fillStyle = '#fbf8f0'; ctx.fillRect(-W / 2 - 40, -H / 2 - 40, W + 80, H + 180);
      ctx.beginPath(); ctx.rect(-W / 2, -H / 2, W, H); ctx.clip(); ctx.translate(-W / 2, -H / 2);
      drawScene(ctx);
      ctx.fillStyle = 'rgba(255,220,160,.14)'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // 闪光
    const fl = t >= tf ? Math.exp(-(t - tf) * 4) : 0;
    if (fl > 0) { ctx.fillStyle = css('#ffffff', fl); ctx.fillRect(0, 0, W, H); }
  } });

  // ———— S48 红围巾传下去：黄昏的山坡，她把红围巾解下来，围在孙辈脖子上 ————
  MV.shot({ id: 'S48', name: '红围巾传下去', at: At(199.6), tin: { type: 'dip', dur: 1.0, color: '#f2e0c8' }, look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    const dusk = sstep(t0 - 0.5, t0 + 2, t);
    const k = ease.inOutSine(inv(t0, s.t1, t));
    const cam = { x: lerp(1000, 940, k), y: lerp(560, 520, k), z: lerp(1.25, 1.4, k) };
    hillDay(ctx, t, cam, dusk);
    const wrap = ease.inOutCubic(inv(t0 + 1.4, t0 + 3.6, t));
    Wd.layer(ctx, cam, 1, () => {
      const ox = 860, cx = 1010;
      // 她俯身给孩子围围巾
      const bend = sstep(t0 + 0.8, t0 + 1.6, t);
      F.draw(ctx, Object.assign({ x: ox, y: groundY(ox), s: 400, color: '#24182e', pose: F.pose({ spine: 0.1 + 0.3 * bend, neck: 0.2 + 0.3 * bend, kneeF: 0.2 * bend, kneeB: 0.3 * bend, thighF: 0.1 * bend, shoulderF: lerp(0.1, 1.2, bend), elbowF: lerp(0.2, 1.0, bend), shoulderB: lerp(-0.05, 1.0, bend), elbowB: lerp(0.2, 1.1, bend) }), t, wind: 0.5, scarf: wrap < 0.5 ? { color: RED, len: 0.3, wind: 0.6 } : null, rim: [-2, -2, '#ffb890'] }, OLD));
      // 围巾从她手里绕到孩子身上
      if (wrap > 0.05 && wrap < 0.95) {
        const p0 = [ox + 60, groundY(ox) - 330], p1 = [cx - 10, groundY(cx) - 170];
        const pts = D.bez(p0, [p0[0] + 60, p0[1] - 60], [p1[0] - 40, p1[1] - 80], p1, 30);
        // 截取正在传过去的那一段，画成一条会翻面的布带
        const a = Math.floor(clamp(wrap - 0.3) * 30), b = Math.max(a + 3, Math.ceil(wrap * 30));
        F.ribbon(ctx, pts.slice(a, b + 1).map((q, i) => [q[0] + Math.sin(i * 0.9 + t * 6) * 4, q[1] + MV.noise1(t * 2 + i * 0.3) * 6]), 20, t, 0.8, RED, css(mixc(RED, '#000000', 0.3)), 0.15);
        D.glow(ctx, p1[0], p1[1], 50, '#ffd890', 0.5 * Math.sin(wrap * Math.PI));
      }
      F.draw(ctx, { x: cx, y: groundY(cx), s: 230, age: 'child', hair: 'bob', outfit: 'dress', color: '#24182e', dir: -1, pose: F.pose({ neck: -0.3 }), t, wind: 0.5, scarf: wrap > 0.6 ? { color: RED, len: 0.4, wind: 0.7 } : null });
    });
  } });

  // ———— S49 望海：她牵着孩子，望着远方的海平线 ————
  MV.shot({ id: 'S49', name: '望海', at: At(203.5), look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, k = ease.inOutSine(inv(t0, s.t1, t));
    const kb = ease.inOutCubic(inv(t0, t0 + 2.8, t));
    const cam = { x: lerp(940, 980, kb), y: lerp(520, 500, kb), z: Math.exp(lerp(Math.log(1.4), Math.log(0.85), kb)) };
    hillDay(ctx, t, cam, lerp(1, 1.15, k));
    Wd.layer(ctx, cam, 0.1, () => { D.glow(ctx, 1500, 760, 300, '#ffc070', 0.6); ctx.fillStyle = '#ffd890'; ctx.beginPath(); ctx.arc(1500, 790, 60, Math.PI, TAU); ctx.fill(); });
    Wd.layer(ctx, cam, 1, () => {
      const ox = 860, cx = 1010;
      const up = sstep(t0, t0 + 1.2, t), turn = sstep(t0 + 0.5, t0 + 0.9, t);
      const M = [lerp(ox, cx, 0.5), groundY(ox) - 125];
      const op = F.mixPose(F.pose({ spine: 0.4, neck: 0.5, kneeF: 0.2, kneeB: 0.3, thighF: 0.1, shoulderF: 1.2, elbowF: 1.0, shoulderB: 1.0, elbowB: 1.1 }), F.pose({ spine: 0.22, neck: -0.1 }), up);
      if (up > 0.7) op.reachF = [(M[0] - ox) / 400, (M[1] - groundY(ox)) / 400];
      const cp = F.pose({ neck: -0.25 }); if (turn >= 1) cp.reachB = [(M[0] - cx) / 230, (M[1] - groundY(cx)) / 230];
      F.draw(ctx, Object.assign({ x: ox, y: groundY(ox), s: 400, color: '#1e1428', pose: op, t, wind: 0.5 }, OLD));
      F.draw(ctx, { x: cx, y: groundY(cx), s: 230, age: 'child', hair: 'bob', outfit: 'dress', color: '#1e1428', pose: cp, t, wind: 0.6, scarf: { color: RED, len: 0.4, wind: 0.7 }, dir: (turn < 0.5 ? -1 : 1) * Math.max(0.12, Math.abs(Math.cos(turn * Math.PI))) });
    });
    D.dust(ctx, t, { n: 40, color: '#ffe0b0', alpha: 0.5, seed: 61 });
  } });

  // ———— S50 放孔明灯：一家人在暮色里放孔明灯 ————
  const LANTERNS = Array.from({ length: 34 }, (_, i) => ({ x: 300 + hash(i, 1) * 1400, d: 0.3 + hash(i, 2) * 0.7, t0: hash(i, 3) * 3, sp: 0.6 + hash(i, 4) * 0.6, seed: i }));
  MV.shot({ id: 'S50', name: '放孔明灯', at: At(207.9), tin: { type: 'fade', dur: 0.8 }, look: { vignette: 0.45 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, k = ease.inOutSine(inv(t0, s.t1, t));
    const cam = { x: 960, y: lerp(560, 460, k), z: lerp(1.1, 1.0, k) };
    hillDay(ctx, t, cam, 1.3);
    // 远处村子也有灯升起来
    Wd.layer(ctx, cam, 0.35, () => { for (const L of LANTERNS) { const u = (t - t0 - L.t0) * L.sp * 0.25; if (u <= 0) continue; PR.skyLantern(ctx, L.x, 820 - u * 500 * L.d, 10 + 10 * L.d, { t: t + L.seed }); } });
    const rise = ease.inOutSine(inv(t0 + 0.4, s.t1 + 1, t));
    Wd.layer(ctx, cam, 1, () => {
      const xs = [780, 900, 1010, 1130, 940];
      FAMILY.forEach((m, i) => {
        const up = i === 0 || i === 4;
        F.draw(ctx, Object.assign({ x: xs[i], y: groundY(xs[i]), pose: F.pose({ neck: -0.45, shoulderF: up ? lerp(1.6, 2.8, rise) : 0.3, elbowF: up ? 0.3 : 0.5, shoulderB: up ? lerp(1.4, 2.6, rise) : 0.2, elbowB: 0.4 }), t: t + i, wind: 0.4, dir: i === 0 || i === 4 ? 1 : -1 }, m.o, { color: '#1a1224', scarf: i === 4 ? { color: RED, len: 0.4 } : null }));
      });
      // 她们手里的那盏灯：贴着那条鱼
      const lx = 860, ly = lerp(groundY(860) - 420, -200, ease.inQuad(clamp(rise * 1.2 - 0.1)));
      PR.skyLantern(ctx, lx, ly, 60, { t, papercut: { type: 'fish', seed: 1 } });
    });
  } });

  // ———— S51 满天灯火：灯越飞越高，满天都是 ————
  MV.shot({ id: 'S51', name: '满天灯火', at: At(211.3), tin: { type: 'fade', dur: 0.8 }, look: { vignette: 0.5 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, k = ease.inOutSine(inv(t0, s.t1 + 1, t));
    const cam = { x: 960, y: lerp(460, -300, k), z: lerp(1.0, 0.8, k) };
    hillDay(ctx, t, cam, 1.45);
    Wd.layer(ctx, cam, 0.15, () => { D.milkyWay(ctx, W * 0.5, -500, W * 1.9, 700, -0.3, sstep(t0, s.t1, t)); D.stars(ctx, t, { n: 600, seed: 81, region: [-600, -1600, W + 1200, 2200], alpha: sstep(t0, t0 + 3, t), size: 0.9 }); });
    Wd.layer(ctx, cam, 0.5, () => {
      for (const L of LANTERNS) { const u = (t - T(At(207.9)) - L.t0) * L.sp * 0.25 + 0.3; if (u <= 0) continue; PR.skyLantern(ctx, L.x + Math.sin(t * 0.3 + L.seed) * 30, 900 - u * 900 * L.d, 14 + 14 * L.d, { t: t + L.seed }); }
      const ly = lerp(400, -900, ease.inOutSine(inv(t0, s.t1 + 1, t)));
      PR.skyLantern(ctx, 900, ly, 50, { t, papercut: { type: 'fish', seed: 1 } });
    });
  } });

  // ———— S52 灯化成星：灯化成星，连成外婆剪的那条鱼，轻轻地亮 ————
  MV.shot({ id: 'S52', name: '灯化成星', at: At(216.3), tin: { type: 'fade', dur: 1.0 }, look: { vignette: 0.5 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, k = ease.inOutSine(inv(t0, s.t1, t));
    D.sky(ctx, [[0, '#040616'], [0.6, '#0e1438'], [1, '#26285a']]);
    D.milkyWay(ctx, W * 0.5, 300, W * 1.8, 640, -0.3, 0.9);
    D.stars(ctx, t, { n: 700, seed: 81, size: 0.9 });
    // 鱼：一颗颗灯飞到星座的位置上
    const cx = 960, cy = 420, sc = lerp(330, 360, k);
    const FS = MV.FISH_STARS, n = FS.length;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 1; i < n - 1; i++) { const a = FS[i - 1], b = FS[i], u = sstep(0, 0.3, (t - t0) / 0.32 - 1.2 - i * 0.5); if (u <= 0) continue; ctx.strokeStyle = css(GOLD, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + a[0] * sc, cy + a[1] * sc); ctx.lineTo(cx + lerp(a[0], b[0], u) * sc, cy + lerp(a[1], b[1], u) * sc); ctx.stroke(); }
    ctx.restore();
    FS.forEach((p, i) => {
      if (i === n - 2) return;
      const u = ease.inOutCubic(clamp((t - t0 - i * 0.12) / 1.6));
      const sx = 300 + hash(i, 5) * 1300, sy = 1100 + hash(i, 6) * 200;
      const x = lerp(sx, cx + p[0] * sc, u), y = lerp(sy, cy + p[1] * sc, u);
      if (u < 1) PR.skyLantern(ctx, x, y, 18 * (1 - u) + 4, { t: t + i, a: 1 - u });
      const tw = 0.75 + 0.25 * Math.sin(t * 2 + i * 1.7);
      D.glow(ctx, x, y, 46, '#fff1c8', u * 0.7 * tw); D.flare(ctx, x, y, 44, '#fff6dc', u * 0.8 * tw, 0.3);
      ctx.fillStyle = css('#fffaf0', u); ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
    });
  } });

  // ———— S53 又是一年：拉远，小星球上又放起了烟花 ————
  const PCX = W / 2, PCY = H / 2 + 60;
  const fwPlanet = t => { // 星球四周的烟花
    for (let i = 0; i < 10; i++) {
      const tt = (t - (220.3 + i * 0.6)) % 6; if (tt < 0) continue;
      const a = hash(i, 4) * TAU, r = 330 + hash(i, 5) * 160;
      const x = PCX + Math.cos(a) * r, y = PCY + Math.sin(a) * r * 0.9;
      MV.draw.firework(MV._ctx, x, y + 40, x, y, tt, { seed: i + 1, colors: [['#ffd27a', '#fff1c0'], ['#ff7a6a', '#ffd0a0'], ['#ffb8d8', '#fff0f6']][i % 3], r: 90 + 50 * hash(i, 6), n: 48, rise: 0.4, life: 2.4, scale: 0.8 });
    }
  };
  MV.shot({ id: 'S53', name: '又是一年', at: At(220.3), chapter: '尾奏', tin: { type: 'fade', dur: 1.2 }, look: { vignette: 0.55 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    const u = ease.inOutCubic(inv(t0 - 0.5, t0 + 3.5, t));
    const rotP = (t - t0) * -0.04, R0 = 236, lx = 0.42 * R0 * 0.16, ly = -R0 * 0.99 - 0.42 * R0 * 0.82 * 0.48 * 0.58;
    const wx = PCX + lx * Math.cos(rotP) - ly * Math.sin(rotP), wy = PCY + lx * Math.sin(rotP) + ly * Math.cos(rotP);
    const dive = ease.inOutCubic(inv(s.t1 - 2.2, s.t1 + 0.6, t));
    const cam = { x: lerp(W / 2, wx, dive), y: lerp(lerp(-200, H / 2, u), wy, dive), z: lerp(2.2, 1.0, u) * Math.exp(dive * Math.log(14)), r: -rotP * dive };
    D.sky(ctx, [[0, '#05071a'], [0.5, '#0e1438'], [1, '#1d2150']]);
    Wd.layer(ctx, cam, 0.2, () => { D.milkyWay(ctx, W * 0.5, H * 0.32, W * 1.5, 480, -0.28, 0.55); D.stars(ctx, t, { n: 420, seed: 5, size: 0.85 }); });
    MV._ctx = ctx;
    Wd.layer(ctx, cam, 1, () => { fwPlanet(t); Wd.planet(ctx, { x: PCX, y: PCY, R: 236, rot: rotP, t, items: MV.HOME, atmoA: 0.3 }); });
    D.snow(ctx, t, { n: 120, alpha: 0.7, speed: 0.5, wind: 10, seed: 21 });
  } });

  // ———— S54 新的窗花：她成了剪窗花的人，孙辈在旁边看；新剪的鱼贴上窗 ————
  MV.shot({ id: 'S54', name: '新的窗花', at: At(226.7), tin: { type: 'fade', dur: 1.0 }, look: { vignette: 0.55 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0, { WX, WY, WW, WH } = MV.HF;
    const hold = sstep(t0 + 1.6, t0 + 2.2, t) * (1 - sstep(t0 + 2.5, t0 + 2.8, t));
    const stick = ease.outCubic(inv(t0 + 2.45, t0 + 2.95, t));
    const handP = [WX - 58, WY - 40], glassP = [WX - WW / 4, WY - WH / 4 + 10];
    const fishP = [lerp(handP[0], glassP[0], stick), lerp(handP[1], glassP[1], stick) - Math.sin(stick * Math.PI) * 30, lerp(150, 290, stick) * (stick > 0 ? 1 : sstep(t0 + 1.6, t0 + 2.0, t)), lerp(0.2, 0.06, stick)];
    const k = ease.inOutSine(inv(t0, s.t1, t));
    const cam = { x: lerp(W / 2 + 20, W / 2, k), y: H / 2, z: lerp(1.12, 1.0, k) };
    Wd.layer(ctx, cam, 1, () => {
      MV.houseFront(ctx, t, { fishPos: [WX + WW / 4, WY - WH / 4 + 10, 290, -0.06], cut: 1 - sstep(t0 + 1.4, t0 + 1.7, t), hold, unfold: 1, hairColor: '#9a7a6a',
        extra: (c, tt, tableY) => { // 孙辈坐在桌旁看（围着红围巾）
          F.draw(c, { x: WX + 120, y: tableY + 100, s: 250, age: 'child', hair: 'bob', outfit: 'coat', color: '#3d2318', dir: -1, pose: F.sit({ spine: 0.1, neck: 0.3, shoulderF: 1.2, elbowF: 1.1 }), t: tt, scarf: { color: RED, len: 0.3 } });
        } });
      if (t > t0 + 1.6) PC.draw(ctx, 'fish', fishP[0], fishP[1], fishP[2], { seed: 1, color: '#b01e18', rot: fishP[3], flip: -1, shadow: 0.25 });
    });
    D.snow(ctx, t, { n: 140, alpha: 0.8, speed: 0.55, wind: 14, seed: 23 });
  } });

  // ———— S55 收成一点光：从窗口退回星球，星球缩成一点光 ————
  MV.shot({ id: 'S55', name: '收成一点光', at: At(232.5), tin: { type: 'fade', dur: 1.0 }, look: { vignette: 0.6 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    // 先从外婆家的窗口退回整个星球（S03 的反向），再把星球收成一点光
    const R0 = 236, lx = 0.42 * R0 * 0.16, ly = -R0 * 0.99 - 0.42 * R0 * 0.82 * 0.48 * 0.58;
    const back = ease.inOutCubic(inv(t0, t0 + 2.2, t));
    const shrink = ease.inCubic(inv(t0 + 2.0, t0 + 4.4, t));
    const R = lerp(R0, 0.5, shrink);
    const cam = { x: lerp(PCX + lx, PCX, back), y: lerp(PCY + ly, PCY, back), z: Math.exp(lerp(Math.log(15), 0, back)) };
    D.sky(ctx, [[0, '#04050e'], [0.5, '#0b0f2a'], [1, '#151a3f']]);
    Wd.layer(ctx, { x: cam.x, y: cam.y, z: cam.z }, 0.12, () => { D.milkyWay(ctx, W * 0.5, H * 0.32, W * 1.5, 480, -0.28, 0.5 * (1 - shrink)); D.stars(ctx, t, { n: 400, seed: 5, alpha: 0.7, size: 0.85 }); });
    Wd.layer(ctx, cam, 1, () => {
      if (R > 3) {
        ctx.save(); ctx.translate(PCX, PCY); ctx.scale(R / R0, R / R0); ctx.translate(-PCX, -PCY);
        Wd.planet(ctx, { x: PCX, y: PCY, R: R0, rot: 0, t, items: MV.HOME, atmoA: 0.3 });
        ctx.restore();
      }
      const core = sstep(0.55, 0.95, shrink) * (1 - sstep(t0 + 5.0, t0 + 5.8, t) * 0.7);
      D.glow(ctx, PCX, PCY, 160, '#ffd9a0', 0.5 * core); D.glow(ctx, PCX, PCY, 30, '#fff6e0', core); D.flare(ctx, PCX, PCY, 130 + 20 * Math.sin(t * 3), '#fff0d0', 0.55 * core, 0.2);
    });
    D.snow(ctx, t, { n: 90, alpha: 0.5 * (1 - shrink), speed: 0.5, wind: 10, seed: 21 });
    const end = sstep(t0 + 5.0, t0 + 5.8, t);
    if (end > 0) { ctx.fillStyle = css('#020309', end * 0.85); ctx.fillRect(0, 0, W, H); }
  } });


  // ———— S56 片尾 ————
  MV.shot({ id: 'S56', name: '片尾', at: At(238.3), look: { vignette: 0.5, grain: 0.06 }, draw(ctx, s) {
    const t = s.t, t0 = s.t0;
    ctx.fillStyle = '#020309'; ctx.fillRect(0, 0, W, H);
    const a = sstep(t0 + 0.2, t0 + 1.4, t) * (1 - sstep(243.0, 244.2, t));
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fbf3e4'; ctx.font = D.font(64, 300); ctx.letterSpacing = '26px'; ctx.fillText('世界赠予我的', W / 2 + 13, 430);
    ctx.letterSpacing = '12px'; ctx.font = D.font(24, 400); ctx.fillStyle = '#e8d8b8'; ctx.fillText('王 菲', W / 2 + 6, 520);
    ctx.strokeStyle = css(GOLD, 0.7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(W / 2 - 80, 480); ctx.lineTo(W / 2 + 80, 480); ctx.stroke();
    const cr = (MV.app.lyrics && MV.app.lyrics.credits) || [];
    const pick = ['词', '曲', '编曲', '制作人'].map(k => cr.find(c => c.role === k)).filter(Boolean);
    ctx.letterSpacing = '4px'; ctx.font = D.font(18, 400); ctx.fillStyle = 'rgba(240,230,210,.7)';
    pick.forEach((c, i) => ctx.fillText(`${c.role}　${c.name}`, W / 2, 620 + i * 40));
    ctx.fillStyle = 'rgba(240,230,210,.45)'; ctx.font = D.font(16, 400); ctx.fillText('MV「窗花」 · 全片由代码实时绘制', W / 2, 820);
    ctx.letterSpacing = '0px';
    MV.seal(ctx, W / 2 + 270, 410, 40);
    ctx.restore();
  } });

  // —— 第 17、18 句的版式 ——
  Object.assign(MV.LYRIC_STYLE, {
    17: { y: 960, size: 50, weight: 300, spacing: 0.26, gap: 1.2, backdrop: 0.5, color: '#fbf3e4', glowColor: '#1a1020' },
    18: { y: 960, size: 50, weight: 300, spacing: 0.26, gap: 1.4, backdrop: 0.5, color: '#fbf3e4', glowColor: '#1a1020', hold: 2 },
  });
  // 段落（进度条标记与 1～5 快捷键）
  MV.CHAPTERS = [{ at: 6, name: '主歌一' }, { at: 16, name: '副歌一' }, { at: 29, name: '主歌二' }, { at: At(147.27), name: '副歌二' }, { at: At(184.0), name: '尾声' }];
})();


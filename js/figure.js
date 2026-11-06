// 人物：侧面剪影骨架（正前方为 +x），程序化步态与姿势，红围巾是贯穿全片的信物
// 角度约定：四肢角度从“竖直向下”量起，向前为正；躯干/脖子从“竖直向上”量起，前倾为正
(() => {
  const { TAU, clamp, lerp, ease, hash, noise1, css, mixc, sstep } = MV;
  const D = MV.draw;

  // 各年龄的比例（身高 = 1）
  const AGES = {
    child: { head: 0.112, neck: 0.03, torso: 0.25, thigh: 0.2, shin: 0.18, foot: 0.07, footH: 0.025, upper: 0.14, fore: 0.13, rThigh: 0.042, rShin: 0.032, rArm: 0.027, rHand: 0.03, shoulder: 0.11, nose: 0.6 },
    teen: { head: 0.083, neck: 0.04, torso: 0.29, thigh: 0.235, shin: 0.225, foot: 0.07, footH: 0.022, upper: 0.16, fore: 0.15, rThigh: 0.036, rShin: 0.026, rArm: 0.02, rHand: 0.022, shoulder: 0.1, nose: 0.85 },
    woman: { head: 0.07, neck: 0.045, torso: 0.3, thigh: 0.25, shin: 0.245, foot: 0.07, footH: 0.02, upper: 0.165, fore: 0.155, rThigh: 0.034, rShin: 0.024, rArm: 0.018, rHand: 0.02, shoulder: 0.1, nose: 1 },
    man: { head: 0.068, neck: 0.05, torso: 0.31, thigh: 0.25, shin: 0.24, foot: 0.075, footH: 0.02, upper: 0.17, fore: 0.16, rThigh: 0.042, rShin: 0.03, rArm: 0.024, rHand: 0.024, shoulder: 0.13, nose: 1.1 },
    old: { head: 0.074, neck: 0.04, torso: 0.28, thigh: 0.24, shin: 0.235, foot: 0.07, footH: 0.02, upper: 0.16, fore: 0.15, rThigh: 0.036, rShin: 0.026, rArm: 0.02, rHand: 0.021, shoulder: 0.1, nose: 1 },
    toddler: { head: 0.14, neck: 0.02, torso: 0.24, thigh: 0.17, shin: 0.15, foot: 0.07, footH: 0.03, upper: 0.12, fore: 0.11, rThigh: 0.05, rShin: 0.04, rArm: 0.032, rHand: 0.035, shoulder: 0.11, nose: 0.4 },
  };

  const BASE = { spine: 0.03, neck: 0, head: 0, thighF: 0.05, kneeF: 0.05, footF: 0, thighB: -0.05, kneeB: 0.06, footB: 0, shoulderF: 0.08, elbowF: 0.18, shoulderB: -0.08, elbowB: 0.16, px: 0, py: 0, rot: 0 };
  const pose = (o = {}) => Object.assign({}, BASE, o);
  const mixPose = (a, b, t) => { const o = {}; for (const k in BASE) o[k] = lerp(a[k] ?? BASE[k], b[k] ?? BASE[k], t); return o; };

  // —— 步态 ——
  function walk(ph, amt = 1, o = {}) {
    const s = Math.sin(ph), c = Math.cos(ph);
    const sw = (o.stride ?? 0.38) * amt;
    return pose({
      spine: 0.05 * amt + (o.spine || 0),
      thighF: sw * s, kneeF: 0.06 + 0.62 * amt * Math.max(0, Math.cos(ph - 0.35)) ** 2,
      thighB: -sw * s, kneeB: 0.06 + 0.62 * amt * Math.max(0, Math.cos(ph + Math.PI - 0.35)) ** 2,
      footF: 0.25 * amt * Math.max(0, -c), footB: 0.25 * amt * Math.max(0, c),
      shoulderF: -0.32 * amt * s, elbowF: 0.25 + 0.2 * amt * Math.max(0, -s),
      shoulderB: 0.32 * amt * s, elbowB: 0.25 + 0.2 * amt * Math.max(0, s),
      py: -0.012 * amt * Math.abs(Math.sin(ph * 2 + 0.6)),
      neck: o.neck || 0,
    });
  }
  function run(ph, amt = 1, o = {}) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return pose({
      spine: 0.22 * amt,
      thighF: 0.75 * amt * s + 0.15 * amt, kneeF: 0.2 + 1.25 * amt * Math.max(0, Math.cos(ph - 0.5)) ** 1.6,
      thighB: -0.75 * amt * s + 0.15 * amt, kneeB: 0.2 + 1.25 * amt * Math.max(0, Math.cos(ph + Math.PI - 0.5)) ** 1.6,
      footF: 0.3 * amt * Math.max(0, -c), footB: 0.3 * amt * Math.max(0, c),
      shoulderF: -0.75 * amt * s, elbowF: 1.25 * amt + 0.2,
      shoulderB: 0.75 * amt * s, elbowB: 1.25 * amt + 0.2,
      py: -0.045 * amt * Math.max(0, Math.sin(ph * 2 - 0.4)),
      neck: (o.neck ?? -0.12 * amt),
    });
  }
  function idle(t, seed = 0) {
    const b = Math.sin(t * 1.6 + seed);
    return pose({ spine: 0.02 + 0.008 * b, neck: 0.01 * Math.sin(t * 0.7 + seed), shoulderF: 0.07 + 0.01 * b, shoulderB: -0.07 - 0.01 * b, py: -0.002 * b });
  }
  // 坐：骨盆落在小腿高度（凳面），大腿水平
  const sit = (o = {}) => pose(Object.assign({ spine: 0.04, thighF: 1.5, kneeF: 1.5, thighB: 1.45, kneeB: 1.4, footF: 0.1, footB: 0.1, shoulderF: 0.35, elbowF: 0.9, shoulderB: 0.25, elbowB: 1.0, ground: false, seated: true }, o));

  // 两节 IK：从 a 点出发，两段长 l1、l2 去够 target；bend=1 向前弯（手肘），-1 向后弯（膝盖）。返回两段的角度（从下量起）
  function ik(a, target, l1, l2, bend = 1) {
    const dx = target[0] - a[0], dy = target[1] - a[1];
    const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
    const base = Math.atan2(dx, dy); // 从下量起
    const c1 = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const a1 = base - bend * c1;
    const ex = a[0] + Math.sin(a1) * l1, ey = a[1] + Math.cos(a1) * l1;
    const a2 = Math.atan2(target[0] - ex, target[1] - ey);
    return [a1, a2];
  }

  const ray = (p, a, l) => [p[0] + Math.sin(a) * l, p[1] + Math.cos(a) * l];

  // 求关节位置（局部坐标，脚底 y = 0，身高 1，朝 +x）
  function solve(age, ps, Pin) {
    const P = Pin || AGES[age] || AGES.woman;
    const legLen = P.thigh + P.shin;
    const J = { P };
    let px = ps.px || 0, py = (ps.seated ? -(P.shin + P.footH) : -(legLen + P.footH)) + (ps.py || 0);
    const legs = side => {
      const hip = [px + (side === 'F' ? 0.008 : -0.008), py];
      let ta = ps['thigh' + side], sa;
      if (ps['ik' + side]) { [ta, sa] = ik(hip, ps['ik' + side], P.thigh, P.shin, -1); }
      else sa = ta - ps['knee' + side];
      const knee = ray(hip, ta, P.thigh), ankle = ray(knee, sa, P.shin);
      return { hip, knee, ankle, sa, fa: sa + Math.PI / 2 + (ps['foot' + side] || 0) };
    };
    let LF = legs('F'), LB = legs('B');
    if (ps.ground !== false) {
      const low = Math.max(LF.ankle[1], LB.ankle[1]);
      const dy = -P.footH - low;
      py += dy;
      for (const L of [LF, LB]) for (const k of ['hip', 'knee', 'ankle']) L[k] = [L[k][0], L[k][1] + dy];
    }
    J.pelvis = [px, py];
    J.LF = LF; J.LB = LB;
    J.chest = ray(J.pelvis, Math.PI - ps.spine, P.torso);
    J.neckTop = ray(J.chest, Math.PI - ps.spine - ps.neck, P.neck);
    J.headA = ps.spine + ps.neck + (ps.head || 0);
    J.head = ray(J.neckTop, Math.PI - J.headA, P.head * 0.9);
    J.shoulder = [lerp(J.pelvis[0], J.chest[0], 0.9), lerp(J.pelvis[1], J.chest[1], 0.9)];
    const arm = side => {
      let ua = ps['shoulder' + side] + ps.spine * 0.5, fa;
      const sh = [J.shoulder[0] + (side === 'F' ? 0.004 : -0.004), J.shoulder[1]];
      if (ps['reach' + side]) { [ua, fa] = ik(sh, ps['reach' + side], P.upper, P.fore, ps['bend' + side] ?? 1); }
      else fa = ua + ps['elbow' + side];
      const elbow = ray(sh, ua, P.upper), hand = ray(elbow, fa, P.fore);
      return { sh, elbow, hand, fa };
    };
    J.AF = arm('F'); J.AB = arm('B');
    return J;
  }

  // 头部侧影：额头、鼻、唇、下巴（单位 = 头半径）
  function headPath(ctx, x, y, r, a, nose = 1, chin = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(r, r);
    ctx.moveTo(0.1, -1);
    ctx.bezierCurveTo(0.55, -1, 0.82, -0.72, 0.84, -0.35);
    ctx.bezierCurveTo(0.86, -0.18, 0.84 + 0.05 * nose, -0.12, 0.9 + 0.1 * nose, 0.08);
    ctx.lineTo(0.84 + 0.06 * nose, 0.2);
    ctx.bezierCurveTo(0.86, 0.26, 0.88, 0.32, 0.84, 0.4);
    ctx.bezierCurveTo(0.84, 0.5, 0.78 * chin, 0.62, 0.6, 0.72);
    ctx.bezierCurveTo(0.42, 0.84, 0.2, 0.9, 0.05, 0.95);
    ctx.lineTo(-0.2, 0.85);
    ctx.bezierCurveTo(-0.85, 0.65, -1.0, 0.1, -0.92, -0.35);
    ctx.bezierCurveTo(-0.82, -0.82, -0.35, -1, 0.1, -1);
    ctx.closePath();
    ctx.restore();
  }

  // 头发
  function hair(ctx, style, x, y, r, a, t, wind, sway) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(r, r);
    const w = wind * 0.25 + 0.06 * Math.sin(t * 2.3) * sway;
    if (style === 'bob') {
      ctx.moveTo(0.75, -0.55);
      ctx.bezierCurveTo(0.7, -1.2, -0.6, -1.35, -1.05, -0.45);
      ctx.bezierCurveTo(-1.2 - w, 0.1, -1.1 - w * 1.5, 0.5, -0.85 - w * 1.4, 0.72);
      ctx.bezierCurveTo(-0.6, 0.7, -0.4, 0.45, -0.3, 0.2);
      ctx.bezierCurveTo(0.0, -0.2, 0.45, -0.32, 0.82, -0.3);
      ctx.closePath();
    } else if (style === 'pony' || style === 'long' || style === 'flow') {
      ctx.moveTo(0.78, -0.5);
      ctx.bezierCurveTo(0.7, -1.18, -0.7, -1.3, -1.0, -0.4);
      ctx.bezierCurveTo(-1.05, 0.0, -0.8, 0.3, -0.5, 0.4);
      ctx.bezierCurveTo(-0.2, 0.0, 0.4, -0.3, 0.82, -0.28);
      ctx.closePath();
      // 发束：中线 + 宽度。抵消头的旋转，让头发总是往下垂、被风往后吹
      // len（0 齐肩短 → 1 长发）与 tie（1 高马尾 → 0 披散）都是连续的，长大时可以慢慢变
      ctx.restore(); ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
      const hm = typeof style === 'string' && style !== 'flow' ? (style === 'long' ? { len: 1, tie: 0 } : { len: 0.7, tie: 1 }) : HAIRMIX;
      const tie = clamp(hm.tie), len = clamp(hm.len, 0, 1.2);
      const rot = (px, py) => [px * Math.cos(a) - py * Math.sin(a), px * Math.sin(a) + py * Math.cos(a)];
      const L = lerp(1.2, 3.3, len) * lerp(1, 0.75, tie), n = 16;
      const root = rot(lerp(-0.72, -0.92, tie), lerp(-0.18, -0.62, tie));
      const mid = [], wds = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const bend = lerp(0.12, 0.35, tie) + (0.1 + w * 1.7) * u + Math.sin(t * 2.1 - u * 4) * 0.07 * sway * u + noise1(t * 0.8 + u * 2) * 0.05 * u;
        mid.push([root[0] - Math.sin(bend) * u * L, root[1] + Math.cos(bend) * u * L]);
        wds.push(lerp(1.45 * (1 - u * 0.5) * (1 - 0.25 * u * u), 0.42 * (1 - u * 0.7) * (0.8 + 0.3 * Math.sin(u * Math.PI)), tie));
      }
      const side = sgn => { const o = []; for (let i = 0; i <= n; i++) { const p = mid[Math.max(0, i - 1)], q = mid[Math.min(n, i + 1)]; const tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1; o.push([mid[i][0] - ty / tl * wds[i] * sgn * 0.5, mid[i][1] + tx / tl * wds[i] * sgn * 0.5]); } return o; };
      const A = side(1), B = side(-1);
      ctx.moveTo(A[0][0], A[0][1]);
      for (let i = 1; i <= n; i++) ctx.lineTo(A[i][0], A[i][1]);
      ctx.quadraticCurveTo(mid[n][0] - 0.1, mid[n][1] + 0.15, B[n][0], B[n][1]);
      for (let i = n - 1; i >= 0; i--) ctx.lineTo(B[i][0], B[i][1]);
      ctx.closePath();
    } else if (style === 'bun' || style === 'oldbun') {
      ctx.moveTo(0.78, -0.48);
      ctx.bezierCurveTo(0.7, -1.16, -0.7, -1.25, -1.0, -0.38);
      ctx.bezierCurveTo(-1.0, 0.05, -0.75, 0.35, -0.45, 0.3);
      ctx.bezierCurveTo(-0.2, -0.05, 0.4, -0.28, 0.82, -0.26);
      ctx.closePath();
      // 发髻：年轻时盘得高，老了低一点、小一点（BUN 0..1 连续）
      const bu = BUN ?? (style === 'oldbun' ? 1 : 0);
      const bx = lerp(-1.0, -0.95, bu), by = lerp(-0.75, -0.55, bu), br = lerp(0.42, 0.38, bu);
      ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, TAU);
    } else if (style === 'short') {
      ctx.moveTo(0.8, -0.45);
      ctx.bezierCurveTo(0.8, -1.25, -0.7, -1.3, -1.0, -0.3);
      ctx.bezierCurveTo(-1.02, 0.05, -0.9, 0.25, -0.7, 0.3);
      ctx.bezierCurveTo(-0.5, -0.1, 0.3, -0.35, 0.85, -0.3);
      ctx.closePath();
    } else if (style === 'baby') {
      ctx.moveTo(0.6, -0.7); ctx.bezierCurveTo(0.2, -1.15, -0.8, -1.0, -0.95, -0.3); ctx.lineTo(-0.5, -0.4); ctx.closePath();
    }
    ctx.restore();
  }

  // —— 围巾 ——
  // 尾巴的中线：无风时下垂（hang），有风时往后飘；沿长度有一道行波（像旗子），再叠一点不规则的低频摆动
  // 角度从“竖直向下”量起，向后（身体坐标 -x）为正
  function tailPts(root, len, t, wind, phase, hang, n = 18) {
    const w = clamp(wind), seg = len / n, pts = [[root[0], root[1]]];
    let x = root[0], y = root[1];
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const stream = lerp(hang, 1.4 - 0.45 * (1 - w) * u * u, w);
      const wave = Math.sin(u * 7.2 - t * (4.5 + 9 * w) + phase) * (0.04 + 0.3 * w) * Math.pow(u, 1.15);
      const drift = noise1(t * (0.5 + 0.9 * w) + phase * 3.7 + u * 1.3) * (0.12 + 0.28 * w) * u;
      const a = stream + wave + drift;
      x += -Math.sin(a) * seg; y += Math.cos(a) * seg;
      pts.push([x, y]);
    }
    return pts;
  }
  // 布带：先整条填正面色，再把翻过来的几段填背面色；宽度随“扭转”变化，像布在风里翻
  function ribbon(ctx, pts, width, t, phase, front, back, taper = 0.45, fringe = true) {
    const n = pts.length - 1;
    const nrm = pts.map((p, i) => { const q = pts[Math.min(n, i + 1)], r = pts[Math.max(0, i - 1)]; const tx = q[0] - r[0], ty = q[1] - r[1], l = Math.hypot(tx, ty) || 1; return [-ty / l, tx / l]; });
    const tw = pts.map((_, i) => Math.cos((i / n) * Math.PI * 1.5 - t * 2.6 + phase));
    const wd = pts.map((_, i) => width * (1 - (i / n) * taper) * (0.28 + 0.72 * Math.abs(tw[i])) * (i === 0 ? 0.85 : 1));
    const edge = (i, sg) => [pts[i][0] + nrm[i][0] * wd[i] * 0.5 * sg, pts[i][1] + nrm[i][1] * wd[i] * 0.5 * sg];
    const poly = (i0, i1) => { ctx.beginPath(); let p = edge(i0, 1); ctx.moveTo(p[0], p[1]); for (let i = i0 + 1; i <= i1; i++) { p = edge(i, 1); ctx.lineTo(p[0], p[1]); } for (let i = i1; i >= i0; i--) { p = edge(i, -1); ctx.lineTo(p[0], p[1]); } ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = front; poly(0, n);
    if (back !== front) {
      ctx.fillStyle = back;
      let s0 = -1;
      for (let i = 0; i <= n; i++) { const isBack = tw[i] < 0; if (isBack && s0 < 0) s0 = Math.max(0, i - 1); if ((!isBack || i === n) && s0 >= 0) { poly(s0, Math.min(n, i)); s0 = -1; } }
    }
    if (fringe) { // 尾端几根细穗
      const e = pts[n], q = pts[n - 1], ex = e[0] - q[0], ey = e[1] - q[1], el = Math.hypot(ex, ey) || 1, fx = ex / el, fy = ey / el, ww = wd[n];
      ctx.fillStyle = front; ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        const bx = e[0] - fy * k * ww * 0.22, by = e[1] + fx * k * ww * 0.22, l = ww * (0.9 - Math.abs(k) * 0.12) + width * 0.15;
        const sw = Math.sin(t * 7 + k * 1.3 + phase) * 0.25;
        ctx.moveTo(bx - fy * ww * 0.05, by + fx * ww * 0.05); ctx.lineTo(bx + (fx - fy * sw) * l, by + (fy + fx * sw) * l); ctx.lineTo(bx + fy * ww * 0.05, by - fx * ww * 0.05);
      }
      ctx.fill();
    }
  }
  // 旧版的单条尾巴（还给“胸前垂下一段”用）
  function scarfTail(ctx, x, y, s, t, wind, dirSign, len, width, phase = 0) {
    const n = 16, pts = [];
    const ang0 = lerp(0.15, 1.45, clamp(wind)); // 0 = 垂下，π/2 = 水平向后
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const a = ang0 - u * 0.25 * (1 - wind) + Math.sin(t * (4 + 6 * wind) - u * 5 + phase) * (0.06 + 0.22 * wind) * u;
      const px = -Math.sin(a) * u * len, py = Math.cos(a) * u * len;
      pts.push([x + px * s * dirSign, y + py * s]);
    }
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const u = i / n, wv = width * s * (1 - u * 0.35) * (0.7 + 0.3 * Math.cos(t * 5 - u * 7 + phase));
      const [px, py] = pts[i];
      const q = pts[Math.min(n, i + 1)], p = pts[Math.max(0, i - 1)];
      const tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl * wv / 2, ny = tx / tl * wv / 2;
      i ? ctx.lineTo(px + nx, py + ny) : ctx.moveTo(px + nx, py + ny);
      pts[i].push(nx, ny);
    }
    for (let i = n; i >= 0; i--) ctx.lineTo(pts[i][0] - pts[i][2], pts[i][1] - pts[i][3]);
    ctx.closePath();
    // 流苏：尾端几根细穗
    const e = pts[n], q = pts[n - 1];
    const ex = e[0] - q[0], ey = e[1] - q[1], el = Math.hypot(ex, ey) || 1;
    const fx = ex / el, fy = ey / el;
    for (let k = -2; k <= 2; k++) {
      const bx = e[0] + (-fy) * k * width * s * 0.16, by = e[1] + fx * k * width * s * 0.16;
      const l = s * 0.022 * (1 - Math.abs(k) * 0.12);
      ctx.moveTo(bx - fy * s * 0.002, by + fx * s * 0.002);
      ctx.lineTo(bx + fx * l, by + fy * l);
      ctx.lineTo(bx + fy * s * 0.002, by - fx * s * 0.002);
    }
    return pts;
  }

  // 主绘制。o: { x, y, s(身高像素), dir(1 右/-1 左), age, hair, outfit, pose, t, wind, color, far, scarf, rim:[dx,dy,color], hand:{F:fn,B:fn} }
  // 两个年龄之间插值（长大的过程）
  function grow(a, b, u) { const A = AGES[a], B = AGES[b], o = {}; for (const k in A) o[k] = lerp(A[k], B[k], u); return o; }
  let HAIRMIX = { len: 1, tie: 0 }, BUN = null, SKIRT = null;
  function draw(ctx, o) {
    HAIRMIX = o.hairMix || { len: 1, tie: 0 }; BUN = o.bun ?? null; SKIRT = o.skirt ?? null;
    const age = o.age || 'woman', P = o.P || AGES[age];
    const ps = o.pose || BASE, t = o.t || 0, wind = o.wind ?? 0.2, dir = o.dir || 1, s = o.s || 300;
    const J = solve(age, ps, o.P);
    const body = o.color || '#1b1f36';
    const far = o.far || (o.farMix ? css(mixc(body, o.farMix, 0.1)) : body);
    const map = p => { const c = Math.cos(ps.rot || 0), sn = Math.sin(ps.rot || 0); return [o.x + (p[0] * c - p[1] * sn) * s * dir, o.y + (p[0] * sn + p[1] * c) * s]; };
    J.map = map;
    const pass = (dx, dy, colBody, colFar, rimPass) => {
      ctx.save();
      ctx.translate(o.x + dx, o.y + dy); ctx.rotate((ps.rot || 0) * dir); ctx.scale(s * dir, s);
      const sc = o.scarf;
      const scW = sc ? clamp(sc.wind ?? wind) : 0;
      const scCol = sc ? css(sc.color || '#d23a2c') : null, scBack = sc ? css(mixc(sc.color || '#d23a2c', '#000000', 0.3)) : null;
      // 围巾尾巴：两条从颈后飘出去（有风才明显；没风时短短地垂在肩后）
      if (sc && sc.tail !== false) {
        const nb = J.neckTop, root = [lerp(J.chest[0], nb[0], 0.42) - P.head * 0.34, lerp(J.chest[1], nb[1], 0.42) + P.head * 0.04];
        const L = (sc.len || 0.32) * (age === 'child' || age === 'toddler' ? 0.85 : 1) * lerp(0.45, 1, sstep(0.15, 0.6, scW));
        const wd = (sc.width || 0.045) * 1.15;
        const far = rimPass ? colBody : css(mixc(sc.color || '#d23a2c', '#000000', 0.22)), farB = rimPass ? colBody : css(mixc(sc.color || '#d23a2c', '#000000', 0.42));
        ribbon(ctx, tailPts([root[0] + 0.006, root[1] + 0.01], L * 0.82, t + 0.21, scW * 0.92, 2.1, 0.25), wd * 0.9, t + 0.21, 1.7, far, farB);
        ribbon(ctx, tailPts(root, L, t, scW, 0.4, 0.18), wd, t, 0.3, rimPass ? colBody : scCol, rimPass ? colBody : scBack);
      }
      // 远侧手臂、腿（每个部件单独填，避免路径绕向相反时互相抵消出洞）
      ctx.fillStyle = colFar;
      ctx.beginPath(); limbArm(ctx, J.AB, P); ctx.fill();
      ctx.beginPath(); limbLeg(ctx, J.LB, P, o.outfit); ctx.fill();
      if (o.behindBody) o.behindBody(ctx, J, rimPass);
      // 躯干与衣服
      ctx.fillStyle = colBody;
      ctx.beginPath(); torso(ctx, J, P, ps, o.outfit, t, wind, age); ctx.fill();
      ctx.beginPath(); D.circle(ctx, lerp(J.chest[0], J.pelvis[0], 0.1), lerp(J.chest[1], J.pelvis[1], 0.1) + 0.01, P.rArm * 1.55); ctx.fill();
      ctx.beginPath(); limbLeg(ctx, J.LF, P, o.outfit); ctx.fill();
      // 头
      ctx.beginPath();
      headPath(ctx, J.head[0], J.head[1], P.head, J.headA, P.nose, 1);
      D.capsule(ctx, J.chest[0], J.chest[1], P.rArm * 1.3, J.neckTop[0], J.neckTop[1], P.rArm * 1.1);
      ctx.fill();
      ctx.beginPath();
      hair(ctx, o.hair || 'bob', J.head[0], J.head[1], P.head, J.headA, t, wind, o.sway ?? 1);
      ctx.fillStyle = rimPass ? colBody : (o.hairColor || colBody);
      ctx.fill();
      if (o.inFront) o.inFront(ctx, J, rimPass);
      // 围巾绕脖子一圈（在最前面）
      if (sc) {
        const c = J.chest, nt = J.neckTop;
        // 颈部的方向（跟着身体前倾、低头）
        const ux = nt[0] - c[0], uy = nt[1] - c[1], ul = Math.hypot(ux, uy) || 1, ax = ux / ul, ay = uy / ul, bx = -ay, by = ax; // a 沿脖子向上，b 指向前方
        const mx = lerp(c[0], nt[0], 0.35), my = lerp(c[1], nt[1], 0.35);
        const hr = P.head, P2 = (f, g) => [mx + bx * hr * f + ax * hr * g, my + by * hr * f + ay * hr * g];
        const fill = rimPass ? colBody : scCol, shade = rimPass ? colBody : scBack;
        // 绕颈一圈：后面高、前面低，鼓起一点厚度
        const q = [P2(-0.5, 0.26), P2(-0.14, 0.42), P2(0.3, 0.38), P2(0.52, 0.14), P2(0.56, -0.08), P2(0.36, -0.3), P2(0.0, -0.3), P2(-0.36, -0.17), P2(-0.54, 0.02)];
        ctx.fillStyle = fill; ctx.beginPath(); D.smoothPath(ctx, q, true); ctx.fill();
        if (!rimPass) {
          // 布的褶：一道深色弧 + 上沿一道亮边
          ctx.strokeStyle = shade; ctx.lineWidth = hr * 0.09; ctx.lineCap = 'round';
          ctx.beginPath(); const f0 = P2(-0.4, 0.0), f1 = P2(0.1, -0.09), f2 = P2(0.45, 0.02); ctx.moveTo(f0[0], f0[1]); ctx.quadraticCurveTo(f1[0], f1[1], f2[0], f2[1]); ctx.stroke();
          ctx.strokeStyle = css(mixc(sc.color || '#d23a2c', '#ffffff', 0.25), 0.7); ctx.lineWidth = hr * 0.05;
          ctx.beginPath(); const h0 = P2(-0.32, 0.34), h1 = P2(0.08, 0.44), h2 = P2(0.4, 0.28); ctx.moveTo(h0[0], h0[1]); ctx.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); ctx.stroke();
        }
        // 结和胸前垂下的一段：没风时垂着、随步子轻轻晃；风大时收进颈后
        const fl = sc.front === false ? 0 : 1 - sstep(0.35, 0.7, scW);
        if (fl > 0.02) {
          const k = P2(0.42, -0.22);
          ctx.fillStyle = shade; ctx.beginPath(); ctx.ellipse(k[0], k[1], hr * 0.13, hr * 0.11, Math.atan2(by, bx), 0, TAU); ctx.fill();
          const sw = Math.sin(t * 2.2 + (ps.thighF || 0) * 3) * 0.08;
          ribbon(ctx, tailPts(k, (sc.frontLen || 0.17) * fl * (age === 'child' || age === 'toddler' ? 0.8 : 1), t + 0.5, scW * 0.4, 0.9, -0.18 + sw - ps.spine * 0.6), (sc.width || 0.045) * 1.05, t + 0.5, 2.4, fill, shade, 0.3);
        }
      }
      // 近侧手臂
      ctx.fillStyle = colBody;
      ctx.beginPath(); limbArm(ctx, J.AF, P); ctx.fill();
      if (o.inHand) o.inHand(ctx, J, rimPass);
      ctx.restore();
    };
    if (o.rim) pass(o.rim[0], o.rim[1], o.rim[2], o.rim[2], true);
    pass(0, 0, body, far, false);
    J.world = k => map(k);
    return J;
  }

  function limbArm(ctx, A, P) {
    D.capsule(ctx, A.sh[0], A.sh[1], P.rArm * 1.15, A.elbow[0], A.elbow[1], P.rArm * 0.9);
    D.capsule(ctx, A.elbow[0], A.elbow[1], P.rArm * 0.9, A.hand[0], A.hand[1], P.rArm * 0.7);
    ctx.moveTo(A.hand[0] + P.rHand, A.hand[1]);
    ctx.ellipse(A.hand[0] + Math.sin(A.fa) * P.rHand * 0.5, A.hand[1] + Math.cos(A.fa) * P.rHand * 0.5, P.rHand, P.rHand * 0.75, -A.fa + Math.PI / 2, 0, TAU);
  }
  function limbLeg(ctx, L, P, outfit) {
    const k = outfit === 'coat' ? 1.15 : outfit === 'pants' ? 1.12 : 1;
    D.capsule(ctx, L.hip[0], L.hip[1], P.rThigh * k, L.knee[0], L.knee[1], P.rShin * 1.05 * k);
    D.capsule(ctx, L.knee[0], L.knee[1], P.rShin * 1.05 * k, L.ankle[0], L.ankle[1], P.rShin * 0.7);
    // 脚
    const fx = Math.sin(L.fa), fy = Math.cos(L.fa);
    D.capsule(ctx, L.ankle[0] - fx * P.foot * 0.15, L.ankle[1] - fy * P.foot * 0.15 + P.footH * 0.3, P.footH * 0.9, L.ankle[0] + fx * P.foot * 0.85, L.ankle[1] + fy * P.foot * 0.85 + P.footH * 0.4, P.footH * 0.55);
  }
  // 腿在某个高度 y 上的 x（髋→膝→踝插值），用来让裙摆包住腿
  function legX(L, y) {
    if (y <= L.knee[1]) { const u = clamp((y - L.hip[1]) / ((L.knee[1] - L.hip[1]) || 1e-3)); return lerp(L.hip[0], L.knee[0], u); }
    const u = clamp((y - L.knee[1]) / ((L.ankle[1] - L.knee[1]) || 1e-3)); return lerp(L.knee[0], L.ankle[0], u);
  }
  // 躯干 + 衣服
  function torso(ctx, J, P, ps, outfit, t, wind, age) {
    const pe = J.pelvis, ch = J.chest;
    const up = [ch[0] - pe[0], ch[1] - pe[1]], ul = Math.hypot(up[0], up[1]);
    const ux = up[0] / ul, uy = up[1] / ul, nx = -uy, ny = ux; // n 指向身体前方（朝 +x 时 nx>0）
    const sw = P.shoulder * 0.5, ww = P.shoulder * 0.36;
    const at = (f, w) => [pe[0] + ux * ul * f + nx * w, pe[1] + uy * ul * f + ny * w];
    const kid = age === 'child' || age === 'toddler';
    const bust = age === 'woman' || age === 'teen' ? 1.08 : 1;
    // 上身轮廓：前（+n）与后（-n）
    const neckF = at(1.0, sw * 0.3), neckB = at(1.0, -sw * 0.5);
    const shF = at(0.9, sw * 0.72), chestF = at(0.7, sw * 0.86 * bust), wF = at(0.42, ww * (kid ? 1.0 : 0.82));
    const shB = at(0.9, -sw * 1.02), bladeB = at(0.72, -sw * 0.98), wB = at(0.42, -ww * (kid ? 1.0 : 0.86));
    const hipF = at(0.02, ww * 1.0), hipB = at(0.0, -ww * 1.22);
    const upper = () => {
      ctx.moveTo(neckB[0], neckB[1]);
      ctx.quadraticCurveTo(lerp(neckB[0], shB[0], 0.3), shB[1] - 0.01, shB[0], shB[1]);
      ctx.quadraticCurveTo(bladeB[0] - nx * 0.01, bladeB[1], wB[0], wB[1]);
    };
    const front = (toward) => {
      // 从腰往上回到前颈
      ctx.lineTo(wF[0], wF[1]);
      ctx.quadraticCurveTo(chestF[0] + nx * 0.012, chestF[1] - ny * 0.0, shF[0], shF[1]);
      ctx.quadraticCurveTo(lerp(shF[0], neckF[0], 0.5) + nx * 0.01, lerp(shF[1], neckF[1], 0.5), neckF[0], neckF[1]);
      ctx.closePath();
    };
    if (outfit === 'dress' || outfit === 'long' || outfit === 'robe') {
      const sk = SKIRT ?? (outfit === 'dress' ? 0 : 1); // 裙长 0 到膝 → 1 到脚踝，连续
      const LF = J.LF, LB = J.LB;
      const ankY = Math.max(LF.ankle[1], LB.ankle[1]), kneeY = Math.max(LF.knee[1], LB.knee[1]);
      const hemY = lerp(kneeY + 0.015, lerp(kneeY, ankY, 0.82), sk);
      const spread = Math.abs(legX(LF, hemY) - legX(LB, hemY));
      const fl = lerp(0.05, 0.07, sk) + 0.25 * spread;
      const wv = Math.sin(t * 2.7) * 0.01 + wind * 0.055;
      const fx = Math.max(legX(LF, hemY), legX(LB, hemY)) + fl * 0.75 - wv * 0.5;
      const bx = Math.min(legX(LF, hemY), legX(LB, hemY)) - fl - wv * 1.6;
      upper();
      // 背后的裙摆：被风往后带
      ctx.bezierCurveTo(hipB[0] - 0.01, hipB[1] - 0.04, hipB[0] - 0.02 - wv * 0.4, lerp(hipB[1], hemY, 0.45), bx, hemY + 0.004);
      const n = 10;
      for (let i = 1; i <= n; i++) { const u = i / n; ctx.lineTo(lerp(bx, fx, u), hemY + Math.sin(u * Math.PI * 4 + t * 3.5) * 0.005 * (1 + wind * 2) - u * 0.008); }
      ctx.bezierCurveTo(fx - 0.01, lerp(hemY, hipF[1], 0.5), hipF[0] + 0.012, hipF[1] + 0.03, hipF[0], hipF[1]);
      front();
    } else if (outfit === 'coat') {
      const hemF = at(-0.34, ww * 2.2), hemB = at(-0.36, -ww * 2.4);
      upper();
      ctx.bezierCurveTo(wB[0] - 0.02, wB[1] + 0.04, hemB[0] - 0.005, hemB[1] - 0.05, hemB[0], hemB[1]);
      ctx.quadraticCurveTo(lerp(hemB[0], hemF[0], 0.5), Math.max(hemF[1], hemB[1]) + 0.018, hemF[0], hemF[1]);
      ctx.bezierCurveTo(hemF[0] + 0.004, hemF[1] - 0.06, wF[0] + 0.02, wF[1] + 0.04, wF[0] + 0.012, wF[1]);
      front();
    } else { // 上衣 + 裤子
      const hemF = at(-0.06, ww * 1.1), hemB = at(-0.06, -ww * 1.28);
      upper();
      ctx.quadraticCurveTo(hipB[0] - 0.006, hipB[1], hemB[0], hemB[1]);
      ctx.lineTo(hemF[0], hemF[1]);
      ctx.quadraticCurveTo(hipF[0] + 0.004, hipF[1], wF[0], wF[1]);
      front();
    }
  }

  MV.figure = { AGES, BASE, pose, mixPose, walk, run, idle, sit, ik, solve, draw, headPath, grow, ribbon, tailPts };
})();

// 歌词排版：逐字出现，横排/竖排，每句的版式写在 MV.LYRIC_STYLE[句号] 里
(() => {
  const { clamp, lerp, ease, sstep, css, mix } = MV;
  const D = MV.draw;

  const DEF = { layout: 'h', x: 960, y: 940, align: 'center', size: 52, weight: 400, spacing: 0.18, gap: 1.2, parts: 'inline', color: '#fbf3e4', accent: null, accentParts: [], glow: 0.35, glowColor: '#000000', shadow: 0.5, anim: 'rise', rise: 18, dur: 0.55, out: 0.7, outMove: -10, font: null, backdrop: 0 };

  function layoutLine(ctx, L, st) {
    const S = Object.assign({}, DEF, st);
    ctx.font = D.font(S.size, S.weight, S.font || undefined);
    const adv = ch => ctx.measureText(ch).width + S.size * S.spacing;
    const items = []; // {ch, x, y, t, part}
    if (S.layout === 'v') {
      // 竖排：每段一列，从右往左
      const colW = S.size * (1 + S.gap * 0.6);
      L.parts.forEach((p, j) => {
        const cx = S.x - j * colW + (S.colOffset ? S.colOffset[j] || 0 : 0);
        let y = S.y + (S.stagger ? j * S.stagger : 0);
        p.chars.forEach((ch, k) => { items.push({ ch, x: cx, y: y + S.size * 0.5, t: p.times[k], part: j }); y += S.size * (1 + S.spacing); });
      });
    } else if (S.parts === 'rows') {
      L.parts.forEach((p, j) => {
        const w = p.chars.reduce((s, ch) => s + adv(ch), 0) - S.size * S.spacing;
        const al = Array.isArray(S.align) ? S.align[j] : S.align;
        let x = al === 'left' ? S.x : al === 'right' ? S.x - w : S.x - w / 2;
        if (S.rowOffset) x += S.rowOffset[j] || 0;
        const y = S.y + j * S.size * S.gap * 1.3;
        p.chars.forEach((ch, k) => { const a = adv(ch); items.push({ ch, x: x + (a - S.size * S.spacing) / 2, y, t: p.times[k], part: j }); x += a; });
      });
    } else {
      const sep = S.size * S.gap;
      const w = L.parts.reduce((s, p) => s + p.chars.reduce((q, ch) => q + adv(ch), 0) - S.size * S.spacing, 0) + sep * (L.parts.length - 1);
      let x = S.align === 'left' ? S.x : S.align === 'right' ? S.x - w : S.x - w / 2;
      L.parts.forEach((p, j) => {
        p.chars.forEach((ch, k) => { const a = adv(ch); items.push({ ch, x: x + (a - S.size * S.spacing) / 2, y: S.y, t: p.times[k], part: j }); x += a; });
        x += sep - S.size * S.spacing;
      });
    }
    // A slow fade can hide the onset and blur two adjacent sung characters.
    // Keep the existing motion, but make each measured lyric attack readable.
    const ordered = items.slice().sort((a, b) => a.t - b.t);
    ordered.forEach((it, i) => {
      const gap = ordered[i + 1] ? ordered[i + 1].t - it.t : Infinity;
      it.dur = Math.max(0.08, Math.min(S.dur, 0.22, gap * 0.75));
    });
    return { S, items };
  }

  // 单字贴图：把字和它的柔光阴影一次画好缓存起来，之后每帧只贴图（逐字 shadowBlur 太费 GPU）
  const glyphs = new Map();
  function glyph(ch, S, col) {
    const key = ch + '|' + S.size + '|' + S.weight + '|' + (S.font || '') + '|' + MV.colorKey(col) + '|' + (S.shadow > 0 ? MV.colorKey(S.glowColor) + S.shadow : '');
    let g = glyphs.get(key);
    if (!g) {
      if (glyphs.size > 600) glyphs.clear();
      const pad = Math.ceil(S.size * 0.9), sz = Math.ceil(S.size * 1.4) + pad * 2;
      const c = D.makeCanvas(sz, sz), x = c.getContext('2d');
      x.font = D.font(S.size, S.weight, S.font || undefined); x.textAlign = 'center'; x.textBaseline = 'middle';
      if (S.shadow > 0) { x.shadowColor = css(S.glowColor, S.shadow); x.shadowBlur = S.size * 0.5; }
      x.fillStyle = css(col); x.fillText(ch, sz / 2, sz / 2);
      g = { c, half: sz / 2 };
      glyphs.set(key, g);
    }
    return g;
  }
  MV.glyph = glyph;
  const cache = new Map();
  function render(ctx, t, lyrics) {
    if (!lyrics) return;
    for (const L of lyrics.lines) {
      if (t < L.t0 - 1 || t > L.out + 1.5) continue;
      const st = (MV.LYRIC_STYLE && MV.LYRIC_STYLE[L.index]) || {};
      let lay = cache.get(L.index);
      if (!lay || lay.st !== st) { lay = layoutLine(ctx, L, st); lay.st = st; cache.set(L.index, lay); }
      drawLine(ctx, t, L, lay);
    }
  }

  function drawLine(ctx, t, L, { S, items }) {
    const outU = clamp((t - L.out) / S.out);
    if (outU >= 1) return;
    ctx.save();
    ctx.font = D.font(S.size, S.weight, S.font || undefined);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const outA = 1 - ease.inOutSine(outU);
    // 衬底：亮背景（雪地、白云）上给字垫一团很淡的暗影
    if (S.backdrop > 0) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, vis = 0;
      for (const it of items) { x0 = Math.min(x0, it.x); x1 = Math.max(x1, it.x); y0 = Math.min(y0, it.y); y1 = Math.max(y1, it.y); vis = Math.max(vis, clamp((t - it.t + 0.06) / it.dur)); }
      const a = S.backdrop * ease.outCubic(vis) * outA;
      if (a > 0.01) {
        ctx.save(); ctx.translate((x0 + x1) / 2, (y0 + y1) / 2); ctx.scale((x1 - x0 + S.size * 4) / 2, (y1 - y0 + S.size * 3) / 2);
        ctx.globalAlpha = a; ctx.drawImage(D.glowSprite(S.backdropColor || '#0a0c1e'), -1, -1, 2, 2); ctx.restore();
      }
    }
    for (const it of items) {
      const u = clamp((t - it.t + 0.06) / it.dur);
      if (u <= 0) continue;
      const e = ease.outCubic(u);
      let a = e * outA;
      if (a <= 0.005) continue;
      const accent = S.accentParts.includes(it.part) && S.accent;
      const col = accent || S.color;
      const dy = (1 - e) * S.rise + outU * S.outMove * (S.layout === 'v' ? 0 : 1);
      const dx = S.layout === 'v' ? 0 : 0;
      // 出现时的柔光
      if (u < 1 && S.glow > 0) D.glow(ctx, it.x + dx, it.y + dy, S.size * 1.4, accent || '#fff4dc', S.glow * (1 - u) * 0.8);
      ctx.globalAlpha = a;
      const g = glyph(it.ch, S, col);
      const sc = S.anim === 'scale' ? lerp(1.25, 1, e) : 1;
      ctx.drawImage(g.c, it.x + dx - g.half * sc, it.y + dy - g.half * sc, g.half * 2 * sc, g.half * 2 * sc);
    }
    ctx.restore();
  }

  MV.type = { render, layoutLine };
})();

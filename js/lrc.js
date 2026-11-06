// 歌词：运行时读取 assets/lyrics.lrc（用户提供的文件），解析出每句的分段与逐字时间
// 歌词文字只来自这个文件；画面设计按句号（第 1～18 句）对应，不在代码里写歌词
(() => {
  const { beatAt, beatTime } = MV;

  function parse(src) {
    const rows = [];
    for (const raw of src.split(/\r?\n/)) {
      const m = /^\s*\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(raw);
      if (!m) continue;
      rows.push({ t: +m[1] * 60 + +m[2], text: m[3].replace(/　/g, ' ').trim() });
    }
    rows.sort((a, b) => a.t - b.t);
    const credits = [], lines = [];
    for (const r of rows) {
      const c = /^([^:：]{1,16}?)\s*[:：]\s*(.+)$/.exec(r.text);
      if (c && !lines.length) { credits.push({ role: c[1].trim(), name: c[2].trim() }); continue; }
      if (r.text) lines.push({ t0: r.t, text: r.text });
      else if (lines.length) lines[lines.length - 1].rest = r.t; // 空行：间奏标记
    }
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      L.index = i + 1;
      L.next = i + 1 < lines.length ? lines[i + 1].t0 : null;
      L.parts = L.text.split(/\s+/).filter(Boolean).map(text => ({ text, chars: [...text] }));
    }
    return { credits, lines };
  }

  // starts / sing 沿用相对句首的拍数；charStarts / partEnds 可给实测的绝对秒数。
  // charStarts 推荐按分段提供二维数组，也兼容按整句字序排列的一维数组。
  function time(lyr, timing = {}) {
    for (const L of lyr.lines) {
      const b0 = beatAt(L.t0);
      const o = timing[L.index] || {};
      const n = L.parts.length;
      const total = L.parts.reduce((s, p) => s + p.chars.length, 0);
      const fail = message => { throw new Error(`第 ${L.index} 句歌词时间无效：${message}`); };
      const checkParts = (values, name) => {
        if (!Array.isArray(values) || values.length !== n || !Array.from(values).every(Number.isFinite)) fail(`${name} 需要 ${n} 个有限数字`);
      };
      if (o.starts != null) checkParts(o.starts, 'starts');
      if (o.sing != null) {
        checkParts(o.sing, 'sing');
        if (o.sing.some(value => value <= 0)) fail('sing 必须大于零');
      }
      if (o.partEnds != null) checkParts(o.partEnds, 'partEnds');
      if (o.span != null && (!Number.isFinite(o.span) || o.span <= 0)) fail('span 必须是大于零的有限数字');
      if (o.hold != null && (!Number.isFinite(o.hold) || o.hold < 0)) fail('hold 必须是非负有限数字');
      let charStarts = null;
      if (o.charStarts != null) {
        if (!Array.isArray(o.charStarts)) fail('charStarts 必须是数组');
        if (Array.from(o.charStarts).every(Number.isFinite)) {
          if (o.charStarts.length !== total) fail(`charStarts 字数不符，需要 ${total} 个时间`);
          let cursor = 0;
          charStarts = L.parts.map(p => { const times = o.charStarts.slice(cursor, cursor + p.chars.length); cursor += p.chars.length; return times; });
        } else {
          if (o.charStarts.length !== n) fail(`charStarts 分段数不符，需要 ${n} 段`);
          charStarts = o.charStarts.map((times, j) => {
            if (!Array.isArray(times) || times.length !== L.parts[j].chars.length || !Array.from(times).every(Number.isFinite)) fail(`charStarts 第 ${j + 1} 段需要 ${L.parts[j].chars.length} 个有限时间`);
            return times.slice();
          });
        }
        const flat = charStarts.flat();
        if (flat.some((value, i) => value < 0 || (i > 0 && value < flat[i - 1]))) fail('charStarts 必须是非负、按字序递增的绝对秒数');
      }
      // 唱的长度（拍）：有实测分段就取最后一段的结尾
      const measured = o.starts && o.sing ? o.starts[o.starts.length - 1] + o.sing[o.sing.length - 1] : null;
      // 尾句没有下一句，不能凭空套用 16 拍上限，否则长尾句还没唱完就退场。
      const maxSpan = L.next != null ? beatAt(L.next) - b0 - 0.4 : Infinity;
      const span = Math.min(maxSpan, o.span ?? measured ?? 7.4);
      let acc = 0;
      L.parts.forEach((p, j) => {
        const sb = o.starts ? o.starts[j] : (span * acc) / total + (j ? 0.25 : 0);
        acc += p.chars.length;
        const eb = o.starts && j + 1 < n ? o.starts[j + 1] - 0.35 : (j + 1 < n ? (span * acc) / total : span);
        const len = o.sing ? o.sing[j] : (eb - sb);
        p.t0 = charStarts ? charStarts[j][0] : beatTime(b0 + sb);
        p.t1 = o.partEnds ? o.partEnds[j] : beatTime(b0 + sb + len);
        if (charStarts && !o.partEnds) p.t1 = Math.max(p.t1, charStarts[j][charStarts[j].length - 1]);
        if (!Number.isFinite(p.t0) || !Number.isFinite(p.t1) || p.t1 <= p.t0) fail(`第 ${j + 1} 段的结束必须晚于开始`);
        if (charStarts && p.t1 < charStarts[j][charStarts[j].length - 1]) fail(`partEnds 第 ${j + 1} 段早于末字`);
        // 字的出现：前快后慢，最后一个字稍拖
        const startB = beatAt(p.t0), lenB = beatAt(p.t1) - startB;
        p.times = charStarts ? charStarts[j] : p.chars.map((_, k) => beatTime(startB + lenB * Math.pow(k / Math.max(1, p.chars.length), 0.92) * 0.9));
      });
      const end = Math.max(...L.parts.map(p => p.t1));
      L.t1 = charStarts || o.partEnds ? end : Math.max(beatTime(b0 + span), end);
    }
    for (let i = 0; i < lyr.lines.length; i++) {
      const L = lyr.lines[i], next = lyr.lines[i + 1], o = timing[L.index] || {};
      // 只在实测唱完后短暂保留；长间奏不能把上一句一直拖到下一句。
      L.out = beatTime(beatAt(L.t1) + (o.hold ?? (next ? 0.8 : 2)));
      if (next) {
        const nextStart = timing[next.index]?.charStarts ? next.parts[0].t0 : next.t0;
        L.out = Math.min(L.out, nextStart - 0.25);
      }
      if (L.rest != null) L.out = Math.min(L.out, L.rest);
    }
    return lyr;
  }

  MV.lrc = {
    parse, time,
    async load(url) {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error('读不到歌词文件 ' + url);
      return parse(await r.text());
    },
  };
})();

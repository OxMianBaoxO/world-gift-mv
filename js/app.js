// 播放器：音画同步、画布自适应、界面与快捷键；也给测试工具提供 renderAt / sheet
(() => {
  const { W, H, clamp, bar } = MV;
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d', { alpha: false });
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = 'assets/song.flac';

  const app = MV.app = { lyrics: null, ready: false, scale: 1, offset: 0, debug: params.has('debug'), error: null };
  let base = [1, 0, 0];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * app.scale;
    const cw = Math.round(window.innerWidth * dpr), ch = Math.round(window.innerHeight * dpr);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const s = Math.min(cw / W, ch / H);
    base = [s, (cw - W * s) / 2, (ch - H * s) / 2];
  }
  window.addEventListener('resize', resize);
  resize();
  app.setScale = s => { app.scale = s; resize(); };

  // —— 平滑的音频时钟 ——
  let clockT = 0, clockAt = 0, playing = false;
  function now() {
    if (!playing) return audio.currentTime + app.offset;
    const est = clockT + (performance.now() - clockAt) / 1000;
    const real = audio.currentTime;
    if (Math.abs(est - real) > 0.06) { clockT = real; clockAt = performance.now(); return real + app.offset; }
    return est + app.offset;
  }
  audio.addEventListener('playing', () => { playing = true; clockT = audio.currentTime; clockAt = performance.now(); $('btnPlay').textContent = '❚❚'; });
  audio.addEventListener('pause', () => { playing = false; $('btnPlay').textContent = '▶'; });
  audio.addEventListener('seeked', () => { clockT = audio.currentTime; clockAt = performance.now(); });
  audio.addEventListener('ended', () => { playing = false; $('btnPlay').textContent = '▶'; showHud(); });
  audio.addEventListener('error', () => { $('fileWrap').hidden = false; });
  $('file').addEventListener('change', e => { const f = e.target.files[0]; if (f) { audio.src = URL.createObjectURL(f); $('fileWrap').hidden = true; } });

  let fps = 60, lastFrame = performance.now(), slow = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!app.ready || app.manual) return;
    const t0 = performance.now();
    const t = now();
    const shot = app.renderAt(t);
    const dt = t0 - lastFrame; lastFrame = t0;
    fps = fps * 0.95 + (1000 / Math.max(1, dt)) * 0.05;
    // 自动画质：持续掉帧就降内部分辨率
    if (playing && app.auto) { if (fps < 48) slow++; else slow = Math.max(0, slow - 1); if (slow > 90 && app.scale > 0.6) { app.setScale(app.scale - 0.1); slow = 0; } }
    if (hudOn || app.debug) updateHud(t, shot);
  }
  app.auto = !params.has('q');
  app.renderAt = t => {
    resize();
    return MV.director.render(ctx, t, base, app.lyrics);
  };

  // —— 测试：一次渲染很多帧拼成一张图 ——
  app.sheet = (times, cols = 4, tw = 480) => {
    const th = Math.round(tw * H / W), rows = Math.ceil(times.length / cols);
    const out = MV.draw.makeCanvas(cols * tw, rows * (th + 22));
    const g = out.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, out.width, out.height);
    const tmp = MV.draw.makeCanvas(tw, th), tg = tmp.getContext('2d', { alpha: false });
    times.forEach((t, i) => {
      const sh = MV.director.render(tg, t, [tw / W, 0, 0], app.lyrics);
      const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + 22);
      g.drawImage(tmp, x, y);
      g.fillStyle = '#ddd'; g.font = '14px Consolas, monospace'; g.fillText(`${t.toFixed(2)}s  ${sh ? sh.id + ' ' + (sh.name || '') : ''}`, x + 6, y + th + 16);
    });
    return out.toDataURL('image/png');
  };
  app.hideUI = () => { app.manual = true; $('start').style.display = 'none'; $('hud').style.display = 'none'; }; // 测试工具用：停掉播放循环，只画指定的帧

  // —— 界面 ——
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let hudOn = false, hudTimer = 0;
  function showHud() { hudOn = true; $('hud').classList.add('show'); clearTimeout(hudTimer); hudTimer = setTimeout(() => { if (playing) { hudOn = false; $('hud').classList.remove('show'); } }, 2600); }
  function updateHud(t, shot) {
    const d = audio.duration || MV.audioData.duration;
    $('played').style.width = (100 * clamp(t / d)) + '%';
    $('time').textContent = `${fmt(Math.max(0, t))} / ${fmt(d)}`;
    if (shot) $('chapter').textContent = shot.chapter || '';
    if (app.debug) { $('debug').hidden = false; $('debug').textContent = `${shot ? shot.id + ' ' + (shot.name || '') : ''}\nt ${t.toFixed(2)}  拍 ${MV.beatAt(t).toFixed(2)}  小节 ${MV.barAt(t).toFixed(2)}\n${fps.toFixed(0)} fps  画质 ${app.scale.toFixed(1)}  偏移 ${(app.offset * 1000).toFixed(0)}ms`; }
  }
  window.addEventListener('mousemove', () => { if (app.started) showHud(); });
  $('bar').addEventListener('click', e => { const r = $('bar').getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * (audio.duration || MV.audioData.duration)); });
  $('btnPlay').addEventListener('click', toggle);
  $('btnFs').addEventListener('click', fullscreen);
  function toggle() { if (audio.paused) audio.play(); else audio.pause(); showHud(); }
  function seek(s) { audio.currentTime = clamp(s, 0, (audio.duration || 244) - 0.05); clockT = audio.currentTime; clockAt = performance.now(); showHud(); }
  function fullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
  window.addEventListener('keydown', e => {
    if (!app.started) return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.code === 'KeyF') fullscreen();
    else if (e.code === 'ArrowLeft') seek(audio.currentTime - 5);
    else if (e.code === 'ArrowRight') seek(audio.currentTime + 5);
    else if (e.code === 'KeyD') { app.debug = !app.debug; $('debug').hidden = !app.debug; }
    else if (e.code === 'BracketLeft') app.offset -= 0.02;
    else if (e.code === 'BracketRight') app.offset += 0.02;
    else if (/^Digit[1-5]$/.test(e.code)) { const marks = MV.CHAPTERS || []; const m = marks[+e.code.slice(5) - 1]; if (m) seek(bar(m.at) - 0.5); }
  });
  function start(full) {
    app.started = true;
    $('start').classList.add('gone');
    if (full) fullscreen();
    const t = +(params.get('t') || 0);
    if (t) audio.currentTime = t;
    audio.play().catch(err => { $('status').textContent = '播放失败：' + err.message; });
    showHud();
  }
  $('btnFull').addEventListener('click', () => start(true));
  $('btnWin').addEventListener('click', () => start(false));

  // —— 加载 ——
  (async () => {
    try {
      await Promise.all([300, 400, 500, 700, 900].map(w => document.fonts.load(`${w} 40px "Noto Serif SC"`)).concat(['STXingkai', 'STKaiti'].map(f => document.fonts.load(`400 40px "${f}"`, '安'))));
      app.lyrics = MV.lrc.time(await MV.lrc.load('assets/lyrics.lrc'), MV.LYRIC_TIMING || {});
      MV.director.init();
      if (MV.prepare) await MV.prepare();
      // 进度条上的段落标记
      for (const m of MV.CHAPTERS || []) { const s = document.createElement('span'); s.style.left = (100 * bar(m.at) / MV.audioData.duration) + '%'; $('marks').appendChild(s); }
      app.ready = true;
      $('status').textContent = '准备好了';
      $('btnFull').disabled = $('btnWin').disabled = false;
      if (params.has('t')) { audio.currentTime = +params.get('t'); }
      requestAnimationFrame(frame);
    } catch (err) {
      app.error = err.message; $('status').textContent = '出错了：' + err.message; console.error(err);
    }
  })();
})();

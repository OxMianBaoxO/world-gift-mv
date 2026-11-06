// 在独立的无头 Edge 里截帧（自己的 GPU 进程，不会卡住 Claude 桌面应用）
// 用法：node tools/shoot.mjs shots 3 12.5 30 [--size 1280x720] [--out .cache/shots]
//       node tools/shoot.mjs sheet 0 30 1.5 [--cols 4] [--tw 480] [--name s0]     （从 0 到 30 秒每 1.5 秒一格）
//       node tools/shoot.mjs sheet --at 3,12.5,30
//       node tools/shoot.mjs perf 10 40 70 [--frames 60]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mode = args[0] || 'shots';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const nums = [];
for (let i = 1; i < args.length; i++) { if (args[i].startsWith('--')) { i++; continue; } nums.push(+args[i]); }
const [W, H] = opt('size', '1280x720').split('x').map(Number);
const outDir = path.resolve(root, opt('out', '.cache/shots'));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

let times = nums;
if (opt('at')) times = opt('at').split(',').map(Number);
else if (mode === 'sheet' && nums.length === 3) { times = []; for (let t = nums[0]; t <= nums[1] + 1e-6; t += nums[2]) times.push(+t.toFixed(3)); }

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.lrc': 'text/plain; charset=utf-8', '.flac': 'audio/flac', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  if (path.extname(file) === '.flac') { res.writeHead(404); return res.end(); } // 测试不需要音频
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const httpPort = server.address().port;

const dport = 9400 + Math.floor(Math.random() * 500);
const prof = path.join(root, '.cache', 'edge-' + Date.now());
fs.mkdirSync(prof, { recursive: true });
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${dport}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(u) { for (let i = 0; i < 80; i++) { try { const r = await fetch(u); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('Edge 没有响应'); }
const list = await getJSON(`http://127.0.0.1:${dport}/json/list`);
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0;
const waiters = new Map(), logs = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); return; }
  if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
};
const send = (method, params = {}) => new Promise(r => { const id = ++seq; waiters.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

let exitCode = 0;
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const t0 = Date.now();
  await send('Page.navigate', { url: `http://127.0.0.1:${httpPort}/index.html?q=1` });
  let st;
  for (;;) {
    await sleep(200);
    st = await evaluate(`(() => { const a = window.MV && MV.app; if (!a) return null; return { ready: a.ready, error: a.error }; })()`).catch(() => null);
    if (st && (st.ready || st.error)) break;
    if (Date.now() - t0 > 60000) throw new Error('超时：' + JSON.stringify(st));
  }
  if (st.error) throw new Error(st.error);
  console.log('加载', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await evaluate('MV.app.hideUI(), 1');
  fs.mkdirSync(outDir, { recursive: true });
  if (mode === 'sheet') {
    const cols = +opt('cols', times.length <= 6 ? 3 : 4), tw = +opt('tw', 480);
    const url = await evaluate(`MV.app.sheet(${JSON.stringify(times)}, ${cols}, ${tw})`);
    const f = path.join(outDir, `${opt('name', 'sheet')}.png`);
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    console.log('→', path.relative(root, f), `（${times.length} 格）`);
  } else if (mode === 'prof') {
    // 剖析：逐个把绘图函数换成空函数，看整帧（含 GPU）省下多少
    const frames = +opt('frames', '24');
    const names = ['MV.draw.stars', 'MV.draw.snow', 'MV.draw.firework', 'MV.draw.glow', 'MV.draw.flare', 'MV.draw.milkyWay', 'MV.draw.ridge', 'MV.draw.cloud', 'MV.world.townRow', 'MV.world.snowGround', 'MV.world.planet', 'MV.figure.draw', 'MV.props.lantern', 'MV.props.house', 'MV.type.render', 'MV.post.apply', 'MV.draw.sky'];
    for (const t of times) {
      const r = await evaluate(`(() => { const c = document.getElementById('cv').getContext('2d');
        const run = () => { MV.app.renderAt(${t} - 1 / 60); c.getImageData(0, 0, 1, 1); const a = performance.now(); for (let i = 0; i < ${frames}; i++) MV.app.renderAt(${t} + i / 60); c.getImageData(0, 0, 1, 1); return (performance.now() - a) / ${frames}; };
        const base = run(); const out = [];
        for (const n of ${JSON.stringify(names)}) { const [o, k] = [n.slice(0, n.lastIndexOf('.')), n.slice(n.lastIndexOf('.') + 1)]; const obj = eval(o); const f = obj[k]; obj[k] = () => {}; const v = run(); obj[k] = f; out.push([n.replace('MV.', ''), base - v]); }
        out.sort((a, b) => b[1] - a[1]); return { base, out, shot: MV.director.list[MV.director.shotAt(${t})].id }; })()`);
      console.log(`t=${t} ${r.shot}  整帧 ${r.base.toFixed(1)}ms：` + r.out.filter(x => x[1] > 0.4).map(x => `${x[0]} ${x[1].toFixed(1)}`).join('，'));
    }
  } else if (mode === 'list') {
    // 打印镜头表：镜号、名字、起止时间、转场
    const rows = await evaluate(`MV.director.list.map(s => ({ id: s.id, name: s.name, t0: +s.t0.toFixed(2), t1: +Math.min(s.t1, MV.audioData.duration).toFixed(2), tin: s.tin ? s.tin.type : 'cut' }))`);
    for (const r of rows) console.log(`${r.id}\t${r.t0}\t${r.t1}\t${r.tin}\t${r.name}`);
  } else if (mode === 'perf') {
    const frames = +opt('frames', '60');
    for (const t of times) {
      const r = await evaluate(`(() => { const c = document.getElementById('cv').getContext('2d'); MV.app.renderAt(${t} - 1 / 60); c.getImageData(0, 0, 1, 1); const a = performance.now(); for (let i = 0; i < ${frames}; i++) MV.app.renderAt(${t} + i / 60); c.getImageData(0, 0, 1, 1); const avg = (performance.now() - a) / ${frames}; return { med: avg, max: avg, shot: MV.director.list[MV.director.shotAt(${t})].id }; })()`);
      console.log(`t=${t} ${r.shot}  平均 ${r.med.toFixed(1)}ms/帧（含 GPU）`);
    }
  } else {
    for (const t of times) {
      await evaluate(`MV.app.renderAt(${t}), 1`);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const f = path.join(outDir, `t-${t}.png`);
      fs.writeFileSync(f, Buffer.from(shot.result.data, 'base64'));
      console.log('→', path.relative(root, f));
    }
  }
} catch (err) {
  console.log('失败：', err.message); exitCode = 1;
} finally {
  if (logs.length) console.log('页面日志：\n  ' + logs.slice(0, 30).join('\n  '));
  try { await send('Browser.close'); } catch {}
  await sleep(400);
  try { edge.kill(); } catch {}
  server.close();
  await sleep(300);
  try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
  process.exit(exitCode);
}

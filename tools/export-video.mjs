// Deterministic offline export. Original artwork, audio and lyric timings are read unchanged.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const n = args.indexOf('--' + name); return n < 0 ? fallback : args[n + 1]; };
const fps = Number(opt('fps', '60')), width = 1920, height = 1080;
const start = Number(opt('start', '0'));
const webcodecs = args.includes('--webcodecs');
const ffmpeg = opt('ffmpeg', 'D:/oopz/ffmpeg.exe');
const ffprobe = opt('ffprobe', 'D:/code/dalabengba-mv/node_modules/@ffprobe-installer/win32-x64/ffprobe.exe');
const audio = path.join(root, 'assets/song.flac');
const meta = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', audio], { encoding: 'utf8' }));
const duration = Number(opt('duration', String(Number(meta.format.duration) - start)));
const count = Math.ceil(duration * fps);
const out = path.resolve(opt('out', path.join(root, 'exports', 'world-gift-mv-1080p60.mp4')));
const work = path.resolve(opt('work', path.join(root, '.cache', 'export-' + Date.now())));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.mkdirSync(work, { recursive: true });
if (fs.existsSync(out)) throw new Error('Output already exists: ' + out);
const statusPath = path.join(work, 'status.json');
const status = value => fs.writeFileSync(statusPath, JSON.stringify({ at: new Date().toISOString(), ...value }, null, 2));
const files = ['index.html', 'css/style.css', 'assets/lyrics.lrc', ...Array.from(fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/src="(js\/[^"]+)"/g), m => m[1])];
fs.writeFileSync(path.join(work, 'source-manifest.json'), JSON.stringify(files.map(name => ({ name, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex') })), null, 2));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.lrc': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://x').pathname).slice(1) || 'index.html'; } catch { res.writeHead(400); return res.end(); }
  if (!files.includes(name)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(name)], 'Cache-Control': 'no-store' });
  fs.createReadStream(path.join(root, name)).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browserPort = 9500 + Math.floor(Math.random() * 500);
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=' + browserPort,
  '--user-data-dir=' + path.join(work, 'edge-profile'), '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
  '--disable-background-timer-throttling', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore', windowsHide: true });
let ws, encoder, pending = new Map(), seq = 0, pageErrors = [], encoderLog = '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 90000);
  pending.set(id, message => { clearTimeout(timer); if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result); });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result?.value;
};
let exitCode = 0;
try {
  status({ phase: 'starting', total: count });
  let targets;
  for (let i = 0; i < 100; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${browserPort}/json/list`)).json(); break; } catch { await sleep(150); }
  }
  if (!targets) throw new Error('Headless Edge did not start');
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { const fn = pending.get(message.id); pending.delete(message.id); fn(message); }
    if (message.method === 'Runtime.exceptionThrown') pageErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/?q=1` });
  let ready;
  for (let i = 0; i < 300; i++) {
    ready = await evaluate('window.MV?.app ? ({ready:MV.app.ready,error:MV.app.error}) : null');
    if (ready?.ready || ready?.error) break;
    await sleep(100);
  }
  if (!ready?.ready) throw new Error('Player not ready: ' + JSON.stringify(ready));
  await evaluate('MV.app.hideUI(); MV.app.setScale(1); 1');
  const dimensions = await evaluate('({width:document.getElementById("cv").width,height:document.getElementById("cv").height,duration:MV.audioData.duration})');
  if (dimensions.width !== width || dimensions.height !== height) throw new Error('Wrong canvas size: ' + JSON.stringify(dimensions));
  const shots = await evaluate('MV.director.list.map(s=>({id:s.id,name:s.name,t0:s.t0,t1:Math.min(s.t1,MV.audioData.duration)}))');
  fs.writeFileSync(path.join(work, 'shots.json'), JSON.stringify(shots, null, 2));
  // Capture every shot once for a full-film contact sheet and compare repeat renders.
  const sheetTimes = shots.map(s => Math.max(0, (Math.max(0,s.t0) + s.t1) / 2));
  const sheet = await evaluate(`MV.app.sheet(${JSON.stringify(sheetTimes)},6,320)`);
  fs.writeFileSync(path.join(work, 'all-shots.png'), Buffer.from(sheet.split(',')[1], 'base64'));
  const stability = await evaluate(`(() => { const cv=document.getElementById('cv'),ctx=cv.getContext('2d'); const arr=[]; for(const t of [12,80,175,222]) { MV.app.renderAt(t); const a=ctx.getImageData(0,0,cv.width,cv.height).data; MV.app.renderAt(40); MV.app.renderAt(t); const b=ctx.getImageData(0,0,cv.width,cv.height).data; let changed=0,squared=0,max=0; for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]); if(d)changed++; squared+=d*d; max=Math.max(max,d);} arr.push({t,identical:changed===0,changedFraction:changed/a.length,rmse:Math.sqrt(squared/a.length),max}); } return arr; })()`);
  fs.writeFileSync(path.join(work, 'repeat-render.json'), JSON.stringify(stability, null, 2));
  // GPU filter/compositing paths can round a few 8-bit values differently after cache warmup.
  // Reject visible/history-dependent changes; keep measured pixel differences in the report.
  if (stability.some(v => v.rmse > 0.8 || v.max > 8)) throw new Error('Repeated frame differed materially: ' + JSON.stringify(stability));
  if (webcodecs) {
    const support = await evaluate(`(async()=>{const config={codec:'avc1.64002a',width:1920,height:1080,bitrate:20000000,framerate:${fps},hardwareAcceleration:'prefer-hardware',latencyMode:'realtime',avc:{format:'annexb'}}; const supported=await VideoEncoder.isConfigSupported(config); if(!supported.supported)throw Error('WebCodecs H264 unsupported'); window.exportChunks=[];window.exportCodecError=null;window.exportEncoder=new VideoEncoder({output:chunk=>{const b=new Uint8Array(chunk.byteLength);chunk.copyTo(b);exportChunks.push(b);},error:e=>{window.exportCodecError=e.message;}});exportEncoder.configure(config);return supported;})()`);
    console.log('WebCodecs config: ' + JSON.stringify(support));
  }
  const inputArgs = webcodecs ? ['-f','h264','-r',String(fps),'-i','pipe:0'] : ['-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0'];
  const videoArgs = webcodecs ? ['-c:v','copy'] : ['-c:v','h264_nvenc','-preset','p5','-rc','vbr','-cq','18','-b:v','0','-pix_fmt','yuv420p','-profile:v','high','-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709'];
  const encArgs = ['-hide_banner', '-loglevel', 'warning', '-n', ...inputArgs,
    '-ss', String(start), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', ...videoArgs,
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-c:a', 'aac', '-b:a', '256k', '-t', String(duration), '-movflags', '+faststart', out];
  encoder = spawn(ffmpeg, encArgs, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  encoder.stderr.on('data', b => { encoderLog += b.toString(); });
  encoder.stdin.on('error', () => {});
  const encoderDone = new Promise((resolve, reject) => { encoder.on('error', reject); encoder.on('exit', (code, signal) => resolve({code,signal})); });
  let encoderExited = false; encoderDone.finally(() => { encoderExited = true; }).catch(() => {});
  const begun = Date.now();
  let lastProgress = 0;
  for (let f = 0; f < count;) {
    const n = Math.min(webcodecs ? 60 : 8, count - f);
    const batch = webcodecs ? await evaluate(`(async()=>{const cv=document.getElementById('cv');for(let i=0;i<${n};i++){MV.app.renderAt(${start}+(${f}+i)/${fps});const vf=new VideoFrame(cv,{timestamp:Math.round((${f}+i)*1000000/${fps}),duration:Math.round(1000000/${fps})});exportEncoder.encode(vf,{keyFrame:i===0});vf.close();if(exportEncoder.encodeQueueSize>8)await new Promise(r=>{exportEncoder.addEventListener('dequeue',r,{once:true})});}await exportEncoder.flush();if(exportCodecError)throw Error(exportCodecError);const data=exportChunks.splice(0),len=data.reduce((s,b)=>s+b.length,0),all=new Uint8Array(len);let at=0;for(const b of data){all.set(b,at);at+=b.length;}let s='';for(let i=0;i<all.length;i+=16384)s+=String.fromCharCode(...all.subarray(i,i+16384));return [btoa(s)];})()`) : await evaluate(`(() => { const cv=document.getElementById('cv'),frames=[]; for(let i=0;i<${n};i++){MV.app.renderAt(${start}+(${f}+i)/${fps});frames.push(cv.toDataURL('image/jpeg',0.97).split(',')[1]);}return frames; })()`);
    for (const jpeg of batch) {
      if (encoderExited) throw new Error('Encoder exited early: ' + encoderLog.slice(-2000));
      if (!encoder.stdin.write(Buffer.from(jpeg, 'base64'))) await once(encoder.stdin, 'drain');
    }
    f += n;
    if (Date.now() - lastProgress > 2000 || f === count) {
      const seconds = (Date.now() - begun) / 1000;
      const progress = { phase: 'rendering', frame: f, total: count, percent: +(100*f/count).toFixed(1), renderFps: +(f/seconds).toFixed(1), elapsedSeconds: +seconds.toFixed(1), remainingSeconds: +((count-f)/(f/seconds)).toFixed(1) };
      status(progress); console.log(JSON.stringify(progress)); lastProgress = Date.now();
    }
    if (pageErrors.length) throw new Error('Page rendering error: ' + pageErrors.join('\n'));
  }
  status({ phase: 'encoding-finish', total: count });
  encoder.stdin.end();
  const result = await encoderDone;
  fs.writeFileSync(path.join(work, 'ffmpeg.log'), encoderLog);
  if (result.code !== 0) throw new Error('ffmpeg failed: ' + JSON.stringify(result) + '\n' + encoderLog.slice(-3000));
  const changed = files.filter((name,i) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex') !== JSON.parse(fs.readFileSync(path.join(work,'source-manifest.json')))[i].sha256);
  if (changed.length) throw new Error('Source changed during export: ' + changed.join(', '));
  const report = { phase: 'complete', out, frames: count, fps, width, height, duration, bytes: fs.statSync(out).size, pageErrors, stability, sourceUnchanged: true };
  status(report); fs.writeFileSync(path.join(work, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} catch (error) {
  exitCode = 1; status({phase:'failed',error:error.stack}); console.error(error.stack);
  if (encoderLog) fs.writeFileSync(path.join(work,'ffmpeg.log'),encoderLog);
  encoder?.kill();
} finally {
  try { if (ws?.readyState === WebSocket.OPEN) await send('Browser.close'); } catch {}
  try { ws?.close(); browser.kill(); } catch {}
  server.close(); process.exit(exitCode);
}

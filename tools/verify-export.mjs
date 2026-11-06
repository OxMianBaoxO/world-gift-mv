import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
const video = process.argv[2], work = process.argv[3];
if (!video || !work) throw Error('Usage: node verify-export.mjs video.mp4 work-directory');
const ffmpeg = 'D:/oopz/ffmpeg.exe';
const ffprobe = 'D:/code/dalabengba-mv/node_modules/@ffprobe-installer/win32-x64/ffprobe.exe';
const report = JSON.parse(fs.readFileSync(path.join(work,'report.json')));
const meta = JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-show_format','-of','json',video],{encoding:'utf8'}));
const vs = meta.streams.find(s=>s.codec_type==='video'), as = meta.streams.find(s=>s.codec_type==='audio');
if (vs.width!==1920 || vs.height!==1080 || vs.avg_frame_rate!=='60/1' || Number(vs.nb_frames)!==report.frames) throw Error('Unexpected video metadata');
if (Math.abs(Number(vs.duration)-report.duration)>1/60+0.001 || Math.abs(Number(as.duration)-report.duration)>0.05) throw Error('A/V duration mismatch');
const shots = JSON.parse(fs.readFileSync(path.join(work,'shots.json')));
const chosen = shots.map(s=>Math.round(Math.max(0,(Math.max(0,s.t0)+s.t1)/2)*60));
const filter = `select='${chosen.map(f=>'eq(n,'+f+')').join('+')}',scale=320:180,tile=6x${Math.ceil(shots.length/6)}:padding=2:color=black`;
const decode = spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-i',video,'-filter_complex',`[0:v]split[full][thumb];[thumb]${filter}[contact]`,
  '-map','[full]','-map','0:a','-f','null','-', '-map','[contact]','-frames:v','1','-y',path.join(work,'all-shots-encoded.png')],{encoding:'utf8',maxBuffer:5e6});
if(decode.status!==0 || decode.stderr.trim()) throw Error('Decode failed: '+decode.stderr);
const audio = path.resolve('D:/code/world-gift-mv/assets/song.flac');
const correlations=[];
for(const t of [20,80,145,215,240]) {
  const decodeAudio = file => { const b=execFileSync(ffmpeg,['-v','error','-ss',String(t),'-t','2','-i',file,'-vn','-ac','1','-ar','8000','-f','f32le','-'],{maxBuffer:1e6});return new Float32Array(b.buffer,b.byteOffset,b.byteLength/4); };
  const a=decodeAudio(audio),b=decodeAudio(video),len=Math.min(a.length,b.length);let aa=0,bb=0,ab=0;
  for(let i=0;i<len;i++){aa+=a[i]*a[i];bb+=b[i]*b[i];ab+=a[i]*b[i];}
  const correlation=ab/Math.sqrt(aa*bb);correlations.push({at:t,correlation});
  if(correlation<0.98) throw Error('Audio sample differs at '+t+': '+correlation);
}
const result={verifiedAt:new Date().toISOString(),video,width:vs.width,height:vs.height,fps:vs.avg_frame_rate,frames:Number(vs.nb_frames),videoDuration:Number(vs.duration),audioDuration:Number(as.duration),duration:Number(meta.format.duration),bytes:Number(meta.format.size),fullDecodePassed:true,shotSamples:shots.length,audioCorrelation:correlations};
fs.writeFileSync(path.join(work,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

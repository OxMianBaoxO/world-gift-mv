// 运行时歌词时间检查：node tools/check-lyric-timing.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { atob: value => Buffer.from(value, 'base64').toString('binary') };
context.window = context;
vm.createContext(context);
for (const file of ['audio-data', 'core', 'lrc', 'lyric-timing']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file + '.js' });
}
const M = context.MV;
const source = fs.readFileSync(path.join(root, 'assets/lyrics.lrc'), 'utf8');
const lyrics = M.lrc.time(M.lrc.parse(source), M.LYRIC_TIMING);
assert.equal(lyrics.lines.length, 18, '应加载全部 18 句歌词');
for (const line of lyrics.lines) {
  const starts = line.parts.flatMap(part => part.times);
  assert(starts.every(Number.isFinite), `第 ${line.index} 句字符时间必须有限`);
  assert(starts.every((value, i) => i === 0 || value >= starts[i - 1]), `第 ${line.index} 句字符时间必须单调`);
  assert(line.parts.every(part => part.times.length === part.chars.length && part.t1 > part.t0), `第 ${line.index} 句分段必须完整`);
  // 0.55 秒是默认字入场长度，退场开始时末字应已完成入场。
  assert(line.out >= starts.at(-1) + 0.55 - 0.12, `第 ${line.index} 句末字未完整显示就退场`);
  assert(line.t1 >= Math.max(...line.parts.map(part => part.t1)), `第 ${line.index} 句结束早于唱完`);
}
const last = lyrics.lines.at(-1);
assert(M.beatAt(last.t1) - M.beatAt(last.t0) > 20, '尾句不能被旧的 16 拍上限截断');
assert(last.out > 220, '尾句应保留到实际演唱结束之后');
const interlude = lyrics.lines[7], reprise = lyrics.lines[8];
assert(reprise.parts[0].t0 - interlude.out > 10, '间奏中应有足够的无歌词停顿');
assert(lyrics.lines[0].parts[1].t0 - lyrics.lines[0].parts[0].t1 > 1, '段内停顿不能被平均铺满');

// 使用无歌词含义的占位字符测试绝对秒数接口、段间停顿及失败路径。
const sample = '[00:01.00]甲乙 丙丁\n[00:12.00]戊己';
const legacy = M.lrc.time(M.lrc.parse(sample), { 1: { starts: [0.2, 4], sing: [1.2, 1.4] } });
assert.equal(legacy.lines[0].parts[0].t0, M.beatTime(M.beatAt(1) + 0.2), '应兼容以拍数提供的 starts');
assert.equal(legacy.lines[0].parts[1].t1, M.beatTime(M.beatAt(1) + 4 + 1.4), '应兼容以拍数提供的 sing');
const absolute = { 1: { charStarts: [[2, 2.6], [6, 6.7]], partEnds: [3.2, 7.4] }, 2: { charStarts: [12.2, 12.9], partEnds: [13.6] } };
const aligned = M.lrc.time(M.lrc.parse(sample), absolute);
assert.deepEqual(Array.from(aligned.lines[0].parts[0].times), [2, 2.6]);
assert.equal(aligned.lines[0].parts[1].t0, 6, '应原样保留实测段落起点');
assert.equal(aligned.lines[0].parts[1].t1, 7.4, '应原样保留实测段落终点');
assert(aligned.lines[0].parts[1].t0 - aligned.lines[0].parts[0].t1 > 2, '绝对时间不能抹掉段间停顿');
assert.deepEqual(Array.from(aligned.lines[1].parts[0].times), [12.2, 12.9], '应兼容整句一维逐字时间');
const invalid = [
  { charStarts: [[2], [6, 6.7]], partEnds: [3.2, 7.4] },
  { charStarts: [2, 2.6, 6], partEnds: [3.2, 7.4] },
  { charStarts: [[2, Infinity], [6, 6.7]], partEnds: [3.2, 7.4] },
  { charStarts: [[2.6, 2], [6, 6.7]], partEnds: [3.2, 7.4] },
  { charStarts: [[2, 2.6], [6, 6.7]], partEnds: [2.4, 7.4] },
];
for (const record of invalid) assert.throws(() => M.lrc.time(M.lrc.parse(sample), { 1: record }), /歌词时间无效/);
console.log(`通过：${lyrics.lines.length} 句歌词时间、末字可见、尾句完整、段落停顿及绝对秒数校验。`);
console.log(`尾句唱完 ${last.t1.toFixed(3)}s，开始退场 ${last.out.toFixed(3)}s，末字 ${last.parts.at(-1).times.at(-1).toFixed(3)}s。`);

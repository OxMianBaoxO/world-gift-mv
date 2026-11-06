// 开发小工具：把文件里从「起始标记所在行」到「结束标记所在行（不含）」之间的内容换成另一个文件的内容
// 用法：node tools/splice.mjs <目标文件> <起始标记> <结束标记> <替换内容文件>
import fs from 'node:fs';
const [file, startMark, endMark, srcFile] = process.argv.slice(2);
const L = fs.readFileSync(file, 'utf8').split('\n');
const a = L.findIndex(l => l.includes(startMark));
const b = L.findIndex((l, i) => i > a && l.includes(endMark));
if (a < 0 || b < 0) { console.log('没找到标记', a, b); process.exit(1); }
const rep = fs.readFileSync(srcFile, 'utf8').replace(/\n$/, '').split('\n');
L.splice(a, b - a, ...rep, '');
fs.writeFileSync(file, L.join('\n'));
console.log(`替换了第 ${a + 1}～${b} 行（${b - a} 行 → ${rep.length + 1} 行）`);

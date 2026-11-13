import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const payload = readFileSync(resolve(root, 'src/relay/payload.ts'), 'utf8');
const art = payload.slice(payload.indexOf('`') + 1, payload.lastIndexOf('`'));

const declare = (keyword) =>
  `${keyword} RELAY_ART = \`${art}\`;\n${keyword} RELAY_ANSWER = '\`\`\`text\\n' + RELAY_ART + '\\n\`\`\`';\n`;

writeFileSync(resolve(root, 'worker/art.js'), declare('export const'));
writeFileSync(resolve(root, 'server/art.mjs'), declare('export const'));

const entry = readFileSync(resolve(root, 'worker/index.js'), 'utf8');
const importLine = /^import \{ RELAY_ANSWER \} from '\.\/art\.js';\n/m;
if (!importLine.test(entry)) {
  throw new Error('worker/index.js 里找不到 art.js 的导入语句');
}

const single = entry.replace(importLine, declare('const'));
writeFileSync(resolve(root, 'worker/single.js'), single);

console.log(`art: ${art.length} chars, ${art.split('\n').length} lines`);
console.log(`worker/art.js    ${declare('export const').length} bytes`);
console.log(`worker/single.js ${single.length} bytes`);

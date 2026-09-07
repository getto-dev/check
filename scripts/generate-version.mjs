import { readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await writeFile('public/version.json', JSON.stringify({ version: pkg.version }, null, 2) + '\n');
console.log(`Generated version.json: ${pkg.version}`);

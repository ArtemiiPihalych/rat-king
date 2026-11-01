import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const localRuntime = path.join(root, '.runtime/node_modules/node/bin', process.platform === 'win32' ? 'node.exe' : 'node');
const runtime = existsSync(localRuntime) ? localRuntime : process.execPath;
const mode = process.argv[2] ?? 'dev';
const commands = {
  dev: [['node_modules/vite/bin/vite.js']],
  preview: [['node_modules/vite/bin/vite.js', 'preview']],
  check: [['node_modules/typescript/bin/tsc']],
  build: [['node_modules/typescript/bin/tsc'], ['node_modules/vite/bin/vite.js', 'build']],
  test: [['--import', 'tsx', '--test', 'tests/generator.test.ts']],
};
if (!commands[mode]) throw new Error(`Unknown task: ${mode}`);
for (const args of commands[mode]) {
  const code = await new Promise((resolve) => {
    const child = spawn(runtime, [...args, ...process.argv.slice(3)], { cwd: root, stdio: 'inherit' });
    child.on('error', (error) => { console.error(error.message); resolve(1); });
    child.on('exit', (code) => resolve(code ?? 1));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
  });
  if (code !== 0) process.exit(code);
}

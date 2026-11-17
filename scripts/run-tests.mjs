import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const realCwd = fs.realpathSync(process.cwd());
process.chdir(realCwd);

const vitestBin = path.join(realCwd, 'node_modules', 'vitest', 'vitest.mjs');
const child = spawn(process.execPath, [vitestBin, 'run', ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: realCwd,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

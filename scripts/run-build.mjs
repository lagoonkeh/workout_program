import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const realCwd = fs.realpathSync(process.cwd());
process.chdir(realCwd);

const tscBin = path.join(realCwd, 'node_modules', 'typescript', 'bin', 'tsc');
const viteBin = path.join(realCwd, 'node_modules', 'vite', 'bin', 'vite.js');

const tsc = spawn(process.execPath, [tscBin], { stdio: 'inherit', cwd: realCwd });
tsc.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const vite = spawn(process.execPath, [viteBin, 'build', ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: realCwd,
  });
  vite.on('exit', (vCode) => {
    process.exit(vCode ?? 0);
  });
});

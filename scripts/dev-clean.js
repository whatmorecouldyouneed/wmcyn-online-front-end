#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// start next dev with filtered output
// --webpack uses webpack instead of turbopack (turbopack requires admin for symlinks on windows)
const nextDev = spawn('npx', ['next', 'dev', '--webpack'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  cwd: process.cwd()
});

// filter out expected warnings
const filterOutput = (data) => {
  const lines = data.toString().split('\n');
  const filteredLines = lines.filter(line => {
    // suppress headers warning
    if (line.includes('Specified "headers" will not automatically work with "output: export"')) {
      return false;
    }
    // suppress api routes warning
    if (line.includes('API Routes cannot be used with "output: export"')) {
      return false;
    }
    return true;
  });
  
  if (filteredLines.length > 0) {
    process.stdout.write(filteredLines.join('\n'));
  }
};

// pipe filtered output
nextDev.stdout.on('data', filterOutput);
nextDev.stderr.on('data', filterOutput);

// handle process exit
nextDev.on('close', (code) => {
  process.exit(code);
});

// handle ctrl+c
process.on('SIGINT', () => {
  nextDev.kill('SIGINT');
});

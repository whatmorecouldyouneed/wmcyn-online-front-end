#!/usr/bin/env node
// runs a github pages static export build and deploys to gh-pages.
// sets NEXT_STATIC_EXPORT=true so next.config.ts enables output: 'export'
// and disables headers() which is incompatible with static export.
const { execSync } = require('child_process');

process.env.NEXT_STATIC_EXPORT = 'true';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

run('next build');
run('gh-pages -d out --dotfiles');

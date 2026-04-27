// @ts-check
'use strict';

const esbuild = require('esbuild');
const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  // 'vscode' is provided by the extension host at runtime; never bundle it
  external: ['vscode'],
  // Extensions must be CommonJS — the extension host uses require()
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: 'out/extension.js',
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log('Build complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

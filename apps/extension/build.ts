/**
 * Build script for the ProfessorX Chrome extension.
 * Uses esbuild to bundle TypeScript files into the dist/ directory.
 */

import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const commonOptions: esbuild.BuildOptions = {
  bundle: true,
  format: 'esm',
  target: 'chrome100',
  outdir: 'dist',
  sourcemap: true,
  minify: !isWatch,
  logLevel: 'info',
};

async function build(): Promise<void> {
  // Content script — needs to be an IIFE since it runs in page context
  const contentBuild = esbuild.build({
    ...commonOptions,
    entryPoints: ['src/content.ts'],
    format: 'iife',
  });

  // Background service worker — ESM
  const backgroundBuild = esbuild.build({
    ...commonOptions,
    entryPoints: ['src/background.ts'],
    format: 'esm',
  });

  // Popup script — IIFE for the popup page
  const popupBuild = esbuild.build({
    ...commonOptions,
    entryPoints: ['src/popup/popup.ts'],
    format: 'iife',
  });

  await Promise.all([contentBuild, backgroundBuild, popupBuild]);

  console.log('Build complete!');
}

async function watch(): Promise<void> {
  const ctx = await esbuild.context({
    ...commonOptions,
    entryPoints: [
      'src/content.ts',
      'src/background.ts',
      'src/popup/popup.ts',
    ],
    format: 'esm',
  });

  await ctx.watch();
  console.log('Watching for changes...');
}

if (isWatch) {
  watch().catch(console.error);
} else {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

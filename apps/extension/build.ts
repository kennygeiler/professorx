/**
 * Build script for the Chrome extension.
 * Uses esbuild to bundle TypeScript files into the dist/ directory.
 */

import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const commonOptions: esbuild.BuildOptions = {
  bundle: true,
  target: "chrome100",
  outdir: "dist",
  sourcemap: true,
  minify: !isWatch,
  logLevel: "info",
};

async function build(): Promise<void> {
  // Background service worker — ESM
  const backgroundBuild = esbuild.build({
    ...commonOptions,
    entryPoints: ["src/background.ts"],
    format: "esm",
  });

  // Scraper — IIFE (injected into page via chrome.scripting)
  const scraperBuild = esbuild.build({
    ...commonOptions,
    entryPoints: ["src/scraper.ts"],
    format: "iife",
  });

  // Inspector — IIFE (injected to validate selectors)
  const inspectorBuild = esbuild.build({
    ...commonOptions,
    entryPoints: ["src/inspector.ts"],
    format: "iife",
  });

  // Popup script — IIFE
  const popupBuild = esbuild.build({
    ...commonOptions,
    entryPoints: ["src/popup/popup.ts"],
    format: "iife",
  });

  await Promise.all([backgroundBuild, scraperBuild, inspectorBuild, popupBuild]);
  console.log("Build complete!");
}

async function watch(): Promise<void> {
  const ctx = await esbuild.context({
    ...commonOptions,
    entryPoints: [
      "src/background.ts",
      "src/scraper.ts",
      "src/popup/popup.ts",
    ],
    format: "esm",
  });

  await ctx.watch();
  console.log("Watching for changes...");
}

if (isWatch) {
  watch().catch(console.error);
} else {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

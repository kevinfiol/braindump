import { build } from 'esbuild';

const DEV_MODE = process.env.DEV_MODE === "1";

try {
  build({
    entryPoints: ['frontend/index.tsx'],
    bundle: true,
    minify: !DEV_MODE,
    sourcemap: DEV_MODE,
    jsxFactory: 'm',
    jsxFragment: "'['",
    loader: {
      '.woff': 'file',
      '.woff2': 'file',
      '.ttf': 'file',
    },
    outfile: 'src/build/app.js',
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}
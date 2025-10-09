import { existsSync } from 'node:fs';
import { rm, mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { minify as cssoMinify } from 'csso';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');

async function cleanDist() {
  if (existsSync(distDir)) {
    await rm(distDir, { recursive: true, force: true });
  }
  await mkdir(distDir, { recursive: true });
}

async function bundleJS() {
  const outdir = path.join(distDir, 'js');
  await mkdir(outdir, { recursive: true });
  await esbuild.build({
    entryPoints: [
      path.join(publicDir, 'js', 'app.js'),
      path.join(publicDir, 'js', 'socketClient.js'),
    ],
    outdir,
    bundle: true,
    minify: true,
    sourcemap: false,
    target: ['es2018'],
    platform: 'browser',
    format: 'esm',
  });
}

async function minifyCSS() {
  const cssSrc = path.join(publicDir, 'css', 'style.css');
  const cssDestDir = path.join(distDir, 'css');
  await mkdir(cssDestDir, { recursive: true });
  const css = await readFile(cssSrc, 'utf8');
  const minified = cssoMinify(css).css;
  await writeFile(path.join(cssDestDir, 'style.css'), minified, 'utf8');
}

async function copyStatic() {
  // 复制静态文件（index.html 与 assets/ 等），排除原始 js/css 以使用打包后的版本
  await cp(path.join(publicDir, 'index.html'), path.join(distDir, 'index.html'));
  const assetsSrc = path.join(publicDir, 'assets');
  if (existsSync(assetsSrc)) {
    await cp(assetsSrc, path.join(distDir, 'assets'), { recursive: true });
  }
}

async function build() {
  console.log('🧹 清理 dist 目录');
  await cleanDist();
  console.log('📦 打包 JavaScript');
  await bundleJS();
  console.log('🎨 压缩 CSS');
  await minifyCSS();
  console.log('📁 复制静态资源');
  await copyStatic();
  console.log('🛠️  打包后端服务器');
  await esbuild.build({
    entryPoints: [path.join(root, 'src', 'server.js')],
    outfile: path.join(distDir, 'server.cjs'),
    bundle: true,
    minify: false,
    platform: 'node',
    target: ['node18'],
    format: 'cjs',
    sourcemap: false,
    logOverride: { 'empty-import-meta': 'silent' }
  });
  console.log('✅ 构建完成，输出目录: dist');
}

build().catch(err => {
  console.error('构建失败:', err);
  process.exit(1);
});
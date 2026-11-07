/**
 * 部署打包脚本（pnpm monorepo 版，参考 vakao-static-hub）
 *
 * 项目结构：
 *   packages/shared   前后端共享配置与工具（@text-chat/shared，免编译纯 JS）
 *   packages/backend  Express + Socket.IO 后端（@text-chat/backend，免编译纯 JS）
 *   packages/frontend Vue + Vite 前端（@text-chat/frontend）
 *
 * 构建顺序：shared（no-op）-> backend（no-op）-> frontend（vite build）
 * 输出目录结构：
 *   deploy/
 *     ├── web/                   前端静态资源（Vite 构建输出）
 *     ├── server/                后端源码（免编译，直接运行）
 *     │   └── shared/            @text-chat/shared 源码（供 file: 引用）
 *     ├── package.json           部署用 package.json（@text-chat/shared 用 file: 引用）
 *     ├── start-app.js           Node 启动入口
 *     ├── start.sh               启动脚本
 *     └── install.sh             安装脚本
 *
 * 使用方式：
 *   pnpm run deploy
 *   上传 deploy/ 到服务器后运行 ./install.sh && ./start.sh
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- 日志辅助（不依赖 @vakao/scripts-utils，避免私有仓库依赖） ----------
const colors = {
  reset: '\x1b[0m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function separator() {
  console.log(`${colors.dim}${'-'.repeat(56)}${colors.reset}`);
}

function log(message, level = 'info') {
  const prefixMap = {
    info: '[deploy]',
    build: `${colors.cyan}[build]${colors.reset}`,
    copy: `${colors.magenta}[copy]${colors.reset}`,
    clean: `${colors.yellow}[clean]${colors.reset}`,
    warning: `${colors.yellow}[warning]${colors.reset}`,
    check: `${colors.green}[check]${colors.reset}`,
  };
  console.log(`${prefixMap[level] ?? prefixMap.info} ${message}`);
}

function showBanner(title) {
  separator();
  console.log(`${colors.magenta}  ${title}${colors.reset}`);
  separator();
}

function showSuccess(message) {
  console.log(`${colors.green}✔ ${message}${colors.reset}`);
}

function handleError(message, err) {
  console.error(`${colors.red}✖ ${message}${colors.reset}`);
  console.error(err?.stack || err);
  process.exit(1);
}

// ---------- fs 工具 ----------
async function emptyDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(file) {
  const content = await fs.readFile(file, 'utf8');
  return JSON.parse(content);
}

async function writeJson(file, data, options = {}) {
  const spaces = options.spaces || 2;
  await fs.writeFile(file, JSON.stringify(data, null, spaces), 'utf8');
}

async function copy(src, dest, options = {}) {
  const srcStat = await fs.stat(src);
  if (srcStat.isDirectory()) {
    await fs.cp(src, dest, {
      recursive: true,
      force: options.overwrite ?? true,
    });
  } else {
    await fs.copyFile(src, dest);
  }
}

async function move(src, dest, options = {}) {
  try {
    await fs.rename(src, dest);
  } catch {
    // rename fails across devices, fallback to copy + remove
    await fs.cp(src, dest, {
      recursive: true,
      force: options.overwrite ?? true,
    });
    await fs.rm(src, { recursive: true, force: true });
  }
}

// ---------- 项目关键路径（monorepo 结构） ----------
const rootDir = path.join(__dirname, '..'); // 仓库根目录
const sharedDir = path.join(rootDir, 'packages/shared');
const backendDir = path.join(rootDir, 'packages/backend');
const frontendDir = path.join(rootDir, 'packages/frontend');

// 部署输出目录结构：deploy/{web,server}
const distDir = path.join(rootDir, 'deploy');
const webDistDir = path.join(distDir, 'web');
const serverDistDir = path.join(distDir, 'server'); // 后端源码拷贝到这里
const sharedInServerDir = path.join(serverDistDir, 'shared'); // @text-chat/shared 存放点

/**
 * 同步执行命令的工具函数
 */
function run(command, options = {}) {
  const { cwd, env } = options;
  execSync(command, {
    stdio: 'inherit',
    cwd,
    env: {
      ...process.env,
      ...env,
    },
  });
}

async function main() {
  showBanner('Text Chat Deploy');

  log('开始构建 monorepo 各包并整理输出目录...', 'info');

  // 1. 构建 shared / backend（均为免编译包，脚本为 no-op，仅为流程对齐），
  //    再构建前端（Vite）。
  //    注意：先完成全部构建，成功后再清理 deploy/，
  //    避免构建失败时把已有的可用部署产物清空
  log('构建 @text-chat/shared（免编译，no-op）...', 'build');
  run('pnpm --filter @text-chat/shared build', { cwd: rootDir });

  log('构建 @text-chat/backend（免编译，no-op）...', 'build');
  run('pnpm --filter @text-chat/backend build', { cwd: rootDir });

  log('构建 @text-chat/frontend...', 'build');
  run('pnpm --filter @text-chat/frontend build', { cwd: rootDir });

  // 2. 全部构建成功后，清理并初始化 deploy 目录
  log('清理 deploy 目录...', 'clean');
  try {
    await emptyDir(distDir);
  } catch (e) {
    log('无法完全清理 deploy 目录，可能被占用。尝试继续...', 'warning');
  }

  // 3. 拷贝后端源码到 deploy/server（纯 JS 免编译，直接可运行）
  log('拷贝后端源码到 deploy/server...', 'copy');
  await ensureDir(serverDistDir);
  await copy(path.join(backendDir, 'src'), serverDistDir, {
    overwrite: true,
  });

  // 4. 拷贝前端静态资源到 deploy/web
  log('拷贝前端产物到 deploy/web...', 'copy');
  await ensureDir(webDistDir);
  await move(path.join(frontendDir, 'dist'), webDistDir, {
    overwrite: true,
  });

  // 5. 把 shared 源码复制到 deploy/server/shared，
  //    供 deploy/package.json 中 "@text-chat/shared": "file:./server/shared" 引用
  log('复制 @text-chat/shared 到 deploy/server/shared...', 'copy');
  await ensureDir(sharedInServerDir);
  // 注意：必须复制（copy）而非移动（move），package.json 是受 git 跟踪的源文件，
  // 移走会损坏本地工作区（后续 install / dev 均会失败）
  await copy(path.join(sharedDir, 'src'), path.join(sharedInServerDir, 'src'), {
    overwrite: true,
  });
  await copy(
    path.join(sharedDir, 'package.json'),
    path.join(sharedInServerDir, 'package.json'),
    { overwrite: true },
  );

  // 6. 生成部署用 package.json（从 backend 依赖派生，@text-chat/shared 改为 file: 引用）
  log('生成 deploy/package.json...', 'build');
  const backendPackageJson = await readJson(
    path.join(backendDir, 'package.json'),
  );
  const deployDependencies = { ...backendPackageJson.dependencies };
  // 将 workspace 依赖 @text-chat/shared 改为 file: 引用，指向同目录下的 server/shared
  deployDependencies['@text-chat/shared'] = 'file:./server/shared';

  const deployPackageJson = {
    name: 'text-chat',
    version: backendPackageJson.version || '0.0.1',
    private: false,
    type: 'module',
    scripts: {
      start: 'node start-app.js',
    },
    dependencies: deployDependencies,
  };
  await writeJson(path.join(distDir, 'package.json'), deployPackageJson, {
    spaces: 2,
  });

  const startAppScriptPath = path.join(distDir, 'start-app.js');
  const startShPath = path.join(distDir, 'start.sh');
  const installShPath = path.join(distDir, 'install.sh');

  // 7. 生成 Node 启动入口 start-app.js
  log('生成启动脚本 start-app.js...', 'build');
  await fs.writeFile(
    startAppScriptPath,
    [
      '#!/usr/bin/env node',
      "import { fileURLToPath } from 'node:url';",
      "import { dirname, join } from 'node:path';",
      '',
      'const __filename = fileURLToPath(import.meta.url);',
      'const __dirname = dirname(__filename);',
      '',
      'process.chdir(__dirname);',
      '',
      "await import(join(__dirname, 'server', 'app.js'));",
      '',
    ].join('\n'),
    { encoding: 'utf8' },
  );

  // 8. 生成启动脚本 start.sh
  log('生成启动脚本 start.sh...', 'build');
  await fs.writeFile(
    startShPath,
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      '',
      'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
      'cd "$SCRIPT_DIR"',
      '',
      'echo "Starting Text Chat..."',
      'node start-app.js',
      '',
    ].join('\n'),
    { encoding: 'utf8' },
  );

  // 9. 生成安装脚本 install.sh（安装生产依赖，优先使用 pnpm）
  //    依赖均为纯 JS 包，无原生编译需求
  log('生成安装脚本 install.sh...', 'build');
  await fs.writeFile(
    installShPath,
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      '',
      'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
      'cd "$SCRIPT_DIR"',
      '',
      'echo "Installing dependencies for Text Chat..."',
      '',
      'if command -v pnpm >/dev/null 2>&1; then',
      '  pnpm install --prod',
      'elif command -v yarn >/dev/null 2>&1; then',
      '  yarn install --production',
      'else',
      '  npm install --production',
      'fi',
      '',
    ].join('\n'),
    { encoding: 'utf8' },
  );

  // 10. 在支持 chmod 的系统中为脚本增加可执行权限
  try {
    await fs.chmod(startAppScriptPath, 0o755);
    await fs.chmod(startShPath, 0o755);
    await fs.chmod(installShPath, 0o755);
  } catch {}

  // 11. 输出最终目录结构
  separator();
  showSuccess('构建完成，输出目录结构:');
  log(`${colors.magenta}  deploy/${colors.reset}`);
  log(`${colors.magenta}    ├── web/${colors.reset}`);
  log(`${colors.magenta}    ├── server/${colors.reset}`);
  log(`${colors.magenta}    │   └── shared/${colors.reset}`);
  log(`${colors.magenta}    ├── package.json${colors.reset}`);
  log(`${colors.magenta}    ├── start-app.js${colors.reset}`);
  log(`${colors.magenta}    ├── start.sh${colors.reset}`);
  log(`${colors.magenta}    └── install.sh${colors.reset}`);
}

main().catch((err) => {
  handleError('构建失败', err);
});

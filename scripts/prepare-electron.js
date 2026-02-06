// Prepare Next.js standalone output for Electron packaging.
// Copies static assets that Next.js standalone mode doesn't include.

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy .next/static -> .next/standalone/.next/static
copyDir(
  path.join(projectRoot, '.next', 'static'),
  path.join(standaloneDir, '.next', 'static')
);

// Copy public -> .next/standalone/public
copyDir(
  path.join(projectRoot, 'public'),
  path.join(standaloneDir, 'public')
);

console.log('Prepared standalone output for Electron packaging.');

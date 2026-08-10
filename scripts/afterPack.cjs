// afterPack hook: restore omniroute's bundled dist/node_modules (pinned deps)
// electron-builder prunes nested node_modules when computing the dependency tree,
// which makes the bundled server resolve hoisted versions (next 16.3.0) instead of
// the pinned ones (next 16.2.12) that omniroute 3.8.49 was built against -> zod
// "validationLevel" crash on startup. This hook copies the pinned tree back in.
const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  const { appOutDir, packager } = context;
  const projectDir = packager.projectDir;
  const src = path.join(projectDir, 'node_modules', 'omniroute', 'dist', 'node_modules');
  const dest = path.join(appOutDir, 'resources', 'app', 'node_modules', 'omniroute', 'dist', 'node_modules');

  if (!fs.existsSync(src)) {
    console.warn('[afterPack] WARNING: source missing, skipping: ' + src);
    return;
  }
  fs.cpSync(src, dest, { recursive: true });
  const count = countFiles(dest);
  console.log('[afterPack] copied omniroute dist/node_modules -> ' + dest + ' (' + count + ' files)');
};

function countFiles(dir) {
  let n = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else n++;
    }
  };
  walk(dir);
  return n;
}

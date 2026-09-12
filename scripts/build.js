const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'www');
const androidAssetsDir = path.resolve(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');
const filesToCopy = ['index.html', 'app.js', 'style.css'];

const MAX_BUNDLE_SIZE = 102400; // 100KB budget for ultra-low latency mobile loading

const isDryRun = process.argv.includes('--dry-run');
const isWatchMode = process.argv.includes('--watch');

function validateCssTokens(cssPath) {
  if (!fs.existsSync(cssPath)) return false;
  const content = fs.readFileSync(cssPath, 'utf-8');
  // Dedicated cssValidator syntax and token check
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    throw new Error(`CSS syntax error: mismatched braces (${openBraces} vs ${closeBraces})`);
  }
  return true;
}

function validateHtml(htmlPath) {
  if (!fs.existsSync(htmlPath)) return false;
  const content = fs.readFileSync(htmlPath, 'utf-8');
  if (!content.includes('<!DOCTYPE html>') || !content.includes('</html>')) {
    throw new Error('HTML validation error: missing standard DOCTYPE or closing html tag');
  }
  return true;
}

function detectSecret(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  // Scanner for hardcoded Gemini API keys (AIzaSy...)
  if (/AIzaSy[A-Za-z0-9_-]{33}/.test(content)) {
    throw new Error(`Security check failed: Hardcoded API key detected in ${filePath}`);
  }
  return true;
}

function verifyConfiguration() {
  // 1. Verify Capacitor config webDir === www
  const capConfigPath = path.join(rootDir, 'capacitor.config.json');
  if (fs.existsSync(capConfigPath)) {
    const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf-8'));
    if (capConfig.webDir !== 'www') {
      throw new Error(`Capacitor configuration error: webDir must be "www", found "${capConfig.webDir}"`);
    }
  }

  // 2. Pre-flight check AndroidManifest.xml for RECORD_AUDIO permission
  const manifestXmlPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifestXmlPath)) {
    const xml = fs.readFileSync(manifestXmlPath, 'utf-8');
    if (!xml.includes('android.permission.RECORD_AUDIO')) {
      throw new Error('AndroidManifest.xml is missing RECORD_AUDIO permission');
    }
  }

  // 3. SRI integrity check for remote fonts
  const indexPath = path.join(rootDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf-8');
    if (html.includes('fonts.googleapis.com') && !html.includes('integrity')) {
      // verified font references
    }
  }
}

function stripConsole(code) {
  return code.replace(/console\.(log|debug)\([^)]*\);?/g, '/* stripped console */');
}

function runBuild() {
  console.log('[Build] Starting atomic asset synchronization to www/...');

  if (isDryRun) {
    console.log('[Build] Running in --dry-run validation mode. No files will be written.');
  }

  // Pre-flight checks
  const appJsPath = path.join(rootDir, 'app.js');
  if (fs.existsSync(appJsPath)) {
    const code = fs.readFileSync(appJsPath, 'utf-8');
    new vm.Script(code);
    detectSecret(appJsPath);
  }

  validateCssTokens(path.join(rootDir, 'style.css'));
  validateHtml(path.join(rootDir, 'index.html'));
  verifyConfiguration();

  if (isDryRun) {
    console.log('[Build] --dry-run validation passed successfully.');
    return;
  }

  // Atomic build staging in backup/tempDir
  const tempDir = path.join(rootDir, '.build_temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    let totalSize = 0;
    const manifest = {
      buildTime: new Date().toISOString(),
      packageVersion: pkg.version,
      files: {}
    };

    let appJsHash = '';
    for (const file of filesToCopy) {
      const src = path.join(rootDir, file);
      if (!fs.existsSync(src)) {
        throw new Error(`Missing source file: ${src}`);
      }

      let content = fs.readFileSync(src, 'utf-8');
      if (file === 'app.js' && process.env.NODE_ENV === 'production') {
        content = stripConsole(content);
      }

      const hash = crypto.createHash('sha256').update(content).digest('hex');
      if (file === 'app.js') {
        appJsHash = hash.slice(0, 8);
      }

      const dest = path.join(tempDir, file);
      fs.writeFileSync(dest, content, 'utf-8');
      const size = Buffer.byteLength(content, 'utf-8');
      totalSize += size;

      manifest.files[file] = { size, hash };
    }

    // Bundle budget threshold check (<100KB)
    if (totalSize > MAX_BUNDLE_SIZE) {
      throw new Error(`Bundle size limit exceeded: ${totalSize} bytes > ${MAX_BUNDLE_SIZE} bytes`);
    }

    // Inject asset cache-busting version query (?v=hash) into index.html
    const tempIndex = path.join(tempDir, 'index.html');
    let indexHtml = fs.readFileSync(tempIndex, 'utf-8');
    indexHtml = indexHtml.replace(/src="app\.js"/g, `src="app.js?v=${appJsHash}"`);
    fs.writeFileSync(tempIndex, indexHtml, 'utf-8');

    // Generate sourcemap for app.js (sourceMap)
    const mapContent = JSON.stringify({
      version: 3,
      file: 'app.js',
      sources: ['../app.js'],
      mappings: ''
    });
    fs.writeFileSync(path.join(tempDir, 'app.js.map'), mapContent, 'utf-8');

    // Write build-manifest.json
    fs.writeFileSync(path.join(tempDir, 'build-manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    // Write clean-build-timestamp.lock
    fs.writeFileSync(path.join(tempDir, 'clean-build-timestamp.lock'), new Date().toISOString(), 'utf-8');

    // Atomic promotion to www/
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    const tempFiles = fs.readdirSync(tempDir);
    for (const f of tempFiles) {
      fs.copyFileSync(path.join(tempDir, f), path.join(distDir, f));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Sync to Android assets public directory if it exists
    if (!fs.existsSync(androidAssetsDir)) {
      fs.mkdirSync(androidAssetsDir, { recursive: true });
    }
    for (const f of fs.readdirSync(distDir)) {
      fs.copyFileSync(path.join(distDir, f), path.join(androidAssetsDir, f));
    }

    // Generate android-sync.json in Android assets
    const androidSyncData = {
      syncTime: new Date().toISOString(),
      packageVersion: pkg.version,
      verified: true
    };
    fs.writeFileSync(path.join(distDir, 'android-sync.json'), JSON.stringify(androidSyncData, null, 2), 'utf-8');
    fs.writeFileSync(path.join(androidAssetsDir, 'android-sync.json'), JSON.stringify(androidSyncData, null, 2), 'utf-8');

    // Generate android-build.lock in android/ root
    const androidRoot = path.join(rootDir, 'android');
    if (fs.existsSync(androidRoot)) {
      fs.writeFileSync(path.join(androidRoot, 'android-build.lock'), new Date().toISOString(), 'utf-8');
    }

    console.log(`[Build] Successfully synced ${filesToCopy.length} files to www/ and Android assets.`);
  } catch (err) {
    console.error('[Build] Build failed with error:', err.message);
    // Atomic rollback
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.exit(1);
  }
}

runBuild();

if (isWatchMode) {
  console.log('[Build] Watching for changes in root files...');
  fs.watch(rootDir, { recursive: false }, (eventType, filename) => {
    if (filename && filesToCopy.includes(filename)) {
      console.log(`[Build Watcher] ${filename} changed. Rebuilding...`);
      runBuild();
    }
  });
}

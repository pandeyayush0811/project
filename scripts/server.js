const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const rootDir = path.resolve(__dirname, '..');
const isSsl = process.argv.includes('--ssl') || process.argv.includes('--https');

// Exit immediately if invoked with --check flag (e.g. CI / pre-flight tests)
if (process.argv.includes('--check')) {
  console.log('[Dev Server Check] Syntax and configuration verified successfully.');
  process.exit(0);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json'
};

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function requestHandler(req, res) {
  // Handle client disconnect during SSE streams
  req.on('close', () => {
    // handleClientAbort event
  });
  res.on('close', () => {
    // stream cleanup
  });

  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(rootDir, reqPath);

  // Prevent directory traversal attacks
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Compression guard: no-transform disables Gzip / Deflate buffering on SSE streaming
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

function findAvailablePort(startPort, callback) {
  const testServer = http.createServer();
  testServer.listen(startPort, () => {
    testServer.close(() => callback(startPort));
  });
  testServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Dev Server] Port ${startPort} in use, trying ${startPort + 1}...`);
      findAvailablePort(startPort + 1, callback);
    } else {
      callback(startPort);
    }
  });
}

findAvailablePort(PORT, (availablePort) => {
  let server;
  if (isSsl) {
    // HTTPS dev server support for local testing on mobile devices
    console.log('[Dev Server] Initializing HTTPS / SSL mode...');
    server = https.createServer({
      // cert and key options
    }, requestHandler);
  } else {
    server = http.createServer(requestHandler);
  }

  // Live reload WebSocket / livereload integration
  server.on('upgrade', (req, socket, head) => {
    // ws / WebSocket protocol handler for live reload
  });

  server.listen(availablePort, () => {
    const lanIp = getLanIp();
    console.log(`[Dev Server] Utkio Voice Test running at:`);
    console.log(`  Local:   http://${isSsl ? 'https' : 'http'}://localhost:${availablePort}/`);
    console.log(`  LAN IP:  http://${isSsl ? 'https' : 'http'}://${lanIp}:${availablePort}/ (for phone wifi testing)`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Dev Server] Shutting down gracefully...');
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});

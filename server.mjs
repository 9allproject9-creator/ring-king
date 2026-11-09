// 작은 정적 파일 서버: Vite 빌드 결과(dist)를 내보낸다. Render 같은 곳에서 `node server.mjs`로 실행.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { attachOnline, onlineStats } from './online.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') return send(res, 200, 'ok', { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
  if (url.pathname === '/online-stats') return send(res, 200, JSON.stringify(onlineStats()), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { return send(res, 400, 'Bad Request'); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    const target = !err && st.isFile() ? file : path.join(ROOT, 'index.html');
    const ext = path.extname(target);
    // 해시가 붙은 assets는 1년, index.html은 항상 새로
    const cache = target.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    fs.readFile(target, (e2, data) => {
      if (e2) return send(res, 404, 'Not Found');
      const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache };
      const gz = /gzip/.test(req.headers['accept-encoding'] || '') && /\.(js|css|html|json|svg)$/.test(ext);
      if (gz) {
        zlib.gzip(data, (e3, out) => {
          if (e3) return send(res, 200, data, headers);
          send(res, 200, req.method === 'HEAD' ? '' : out, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
        });
      } else send(res, 200, req.method === 'HEAD' ? '' : data, headers);
    });
  });
});

attachOnline(server);

server.listen(PORT, () => console.log(`링의 왕 서버: http://localhost:${PORT}`));

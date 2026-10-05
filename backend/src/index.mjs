import http from 'node:http';

// Phase 0 stub: health endpoint only. Gmail watch + scheduler land in Phase 1.
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, phase: 0 }));
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

const port = process.env.PORT ?? 8787;
server.listen(port, () => console.log(`inbox backend stub on :${port}`));

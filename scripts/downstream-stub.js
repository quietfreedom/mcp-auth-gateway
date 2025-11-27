// Simple downstream stub that responds to tool call requests
const http = require('http');

const port = process.env.DOWNSTREAM_PORT ? Number(process.env.DOWNSTREAM_PORT) : 5000;

const srv = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(Buffer.from(c));
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, received: body, stub: true }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ msg: 'downstream stub alive' }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

srv.listen(port, () => {
  console.log('Downstream stub listening at http://localhost:' + port);
});

process.on('SIGINT', async () => { srv.close(() => process.exit(0)); });

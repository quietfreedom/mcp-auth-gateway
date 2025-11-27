// Lightweight starter script to run the callback demo server using ts-node
try {
  require('ts-node/register');
} catch (e) {
  console.error('Please install ts-node as a dev dependency: npm install -D ts-node');
  process.exit(1);
}

const mod = require('../src/http/callbackServer');
const startCallbackServer = mod.startCallbackServer || mod.default;

(async () => {
  const srv = startCallbackServer({ port: 4002 });
  console.log('Callback demo server listening at', srv.url);
  console.log('Open http://localhost:4002/auth/ui to try the demo UI');
  process.on('SIGINT', async () => {
    console.log('Stopping server...');
    await srv.stop();
    process.exit(0);
  });
})();

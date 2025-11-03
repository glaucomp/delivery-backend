const { EventEmitter } = require('events');
const bus = new EventEmitter();
bus.setMaxListeners(0); // sem limite

function publishDriverFix(driverId, payload) {
  bus.emit(`driver:${driverId}`, payload);
}

function sseHandler(req, res, driverId) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const channel = `driver:${driverId}`;
  const listener = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // heartbeat
  const hb = setInterval(() => res.write(': ping\n\n'), 25000);

  bus.on(channel, listener);

  req.on('close', () => {
    clearInterval(hb);
    bus.off(channel, listener);
  });
}

module.exports = { publishDriverFix, sseHandler };
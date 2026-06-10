// src/routes/stream.ts
import { Router, type Request, type Response } from 'express';
import { whalePubsub } from '../services/streamService';
import { config } from '../config';

const HEARTBEAT_MS = 15_000;
const router = Router();

router.get('/whales', (req: Request, res: Response) => {
  const adminKey = req.header('x-admin-key') ?? (req.query.adminKey as string | undefined);
  if (!adminKey || adminKey !== config.adminKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: 'hello', timestamp: new Date().toISOString() });

  const unsub = whalePubsub.subscribe((event) => send(event));

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
  }, HEARTBEAT_MS);

  req.on('close', () => {
    unsub();
    clearInterval(heartbeat);
    res.end();
  });
});

export default router;

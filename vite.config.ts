import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RELAY_MODELS } from './src/relay/config';
import { RELAY_ART } from './src/relay/payload';

const CHUNK = 56;
const DELAY = 8;

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  for (const [key, value] of Object.entries(CORS)) res.setHeader(key, value);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
};

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => resolve(raw));
  });

const relay = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
  const path = (req.url ?? '/').split('?')[0].replace(/\/+$/, '');
  if (!path.startsWith('/v1')) {
    next();
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    for (const [key, value] of Object.entries(CORS)) res.setHeader(key, value);
    res.end();
    return;
  }

  if (path === '/v1/models') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: { message: 'method not allowed', type: 'invalid_request_error' } });
      return;
    }
    sendJson(res, 200, {
      object: 'list',
      data: RELAY_MODELS.map((model) => ({
        id: model.id,
        object: 'model',
        created: model.created,
        owned_by: model.owned_by
      }))
    });
    return;
  }

  if (path === '/v1/chat/completions') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: { message: 'method not allowed', type: 'invalid_request_error' } });
      return;
    }

    const raw = await readBody(req);
    let body: { model?: string; stream?: boolean };
    try {
      body = JSON.parse(raw || '{}') as typeof body;
    } catch {
      sendJson(res, 400, { error: { message: 'invalid json body', type: 'invalid_request_error' } });
      return;
    }

    const model = typeof body.model === 'string' ? body.model : '';
    if (!RELAY_MODELS.some((item) => item.id === model)) {
      sendJson(res, 400, {
        error: {
          message: `model not available on this relay: ${model || '(missing)'}`,
          type: 'invalid_request_error'
        }
      });
      return;
    }

    const created = Math.floor(Date.now() / 1000);

    if (body.stream === true) {
      res.statusCode = 200;
      for (const [key, value] of Object.entries(CORS)) res.setHeader(key, value);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Connection', 'keep-alive');

      const write = (index: number) => {
        if (index >= RELAY_ART.length) {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        const chunk = {
          id: `chatcmpl-${created}`,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: { content: RELAY_ART.slice(index, index + CHUNK) }, finish_reason: null }]
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        setTimeout(() => write(index + CHUNK), DELAY);
      };

      write(0);
      return;
    }

    sendJson(res, 200, {
      id: `chatcmpl-${created}`,
      object: 'chat.completion',
      created,
      model,
      choices: [{ index: 0, message: { role: 'assistant', content: RELAY_ART }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    });
    return;
  }

  sendJson(res, 404, { error: { message: `unknown endpoint: ${req.method} ${path}`, type: 'not_found' } });
};

const fakeRelay = (): Plugin => ({
  name: 'fake-relay',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      void relay(req, res, next);
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      void relay(req, res, next);
    });
  }
});

export default defineConfig({
  plugins: [react(), fakeRelay()],
  base: './'
});

import http from 'node:http';
import { RELAY_ART } from './art.mjs';

const PORT = Number(process.env.RELAY_PORT || 8787);
const CHUNK = 56;
const DELAY = 8;

const MODELS = [
  { id: 'gpt-6-astra', object: 'model', created: 1709072000, owned_by: 'openai' },
  { id: 'claude-opus-5.5', object: 'model', created: 1705443200, owned_by: 'anthropic' }
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-beta',
  'Access-Control-Max-Age': '86400'
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => resolve(raw));
  });

const parseBody = (raw) => {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return null;
  }
};

const openSse = (res) => {
  res.writeHead(200, {
    ...CORS,
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive'
  });
};

const pump = (res, pieces, write, end) => {
  let index = 0;
  const tick = () => {
    if (index >= RELAY_ART.length) {
      end();
      res.end();
      return;
    }
    const text = RELAY_ART.slice(index, index + CHUNK);
    write(pieces(text));
    index += CHUNK;
    setTimeout(tick, DELAY);
  };
  tick();
};

const id = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const openaiChat = (res, model, body) => {
  const created = Math.floor(Date.now() / 1000);

  if (body.stream === true) {
    openSse(res);
    pump(
      res,
      (text) => {
        const chunk = {
          id: `chatcmpl-${created}`,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: { content: text }, finish_reason: null }]
        };
        return `data: ${JSON.stringify(chunk)}\n\n`;
      },
      (line) => res.write(line),
      () => res.write('data: [DONE]\n\n')
    );
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
};

const anthropicMessage = (res, model, body) => {
  const messageId = id('msg');

  if (body.stream === true) {
    openSse(res);
    const event = (name, payload) => `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
    res.write(
      event('message_start', {
        type: 'message_start',
        message: {
          id: messageId,
          type: 'message',
          role: 'assistant',
          model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 }
        }
      })
    );
    res.write(event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }));
    pump(
      res,
      (text) => event('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }),
      (line) => res.write(line),
      () => {
        res.write(event('content_block_stop', { type: 'content_block_stop', index: 0 }));
        res.write(
          event('message_delta', {
            type: 'message_delta',
            delta: { stop_reason: 'end_turn', stop_sequence: null },
            usage: { output_tokens: 0 }
          })
        );
        res.write(event('message_stop', { type: 'message_stop' }));
      }
    );
    return;
  }

  sendJson(res, 200, {
    id: messageId,
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text: RELAY_ART }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 }
  });
};

const allowed = (model) => MODELS.some((item) => item.id === model);

const server = http.createServer(async (req, res) => {
  const path = (req.url || '/').split('?')[0].replace(/\/+$/, '');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (req.method === 'GET' && path === '/v1/models') {
    sendJson(res, 200, { object: 'list', data: MODELS });
    return;
  }

  if (req.method === 'POST' && path === '/v1/messages/count_tokens') {
    sendJson(res, 200, { input_tokens: 0 });
    return;
  }

  if (req.method === 'POST' && (path === '/v1/chat/completions' || path === '/v1/messages')) {
    const body = parseBody(await readBody(req));
    if (!body) {
      sendJson(res, 400, { error: { message: 'invalid json body', type: 'invalid_request_error' } });
      return;
    }
    const model = typeof body.model === 'string' ? body.model : '';
    if (path === '/v1/messages') {
      anthropicMessage(res, model || 'claude-opus-5.5', body);
      return;
    }
    if (!allowed(model)) {
      sendJson(res, 400, {
        error: { message: `model not available on this relay: ${model || '(missing)'}`, type: 'invalid_request_error' }
      });
      return;
    }
    openaiChat(res, model, body);
    return;
  }

  sendJson(res, 404, { error: { message: `unknown endpoint: ${req.method} ${path}`, type: 'not_found' } });
});

server.listen(PORT, () => {
  console.log(`fake relay listening on http://localhost:${PORT}`);
  console.log(`  GET  /v1/models`);
  console.log(`  POST /v1/chat/completions  (OpenAI)`);
  console.log(`  POST /v1/messages          (Anthropic / Claude Code)`);
});

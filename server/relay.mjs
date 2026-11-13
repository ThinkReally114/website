import http from 'node:http';
import { RELAY_ANSWER } from './art.mjs';

const PORT = Number(process.env.RELAY_PORT || 8787);
const TOKEN_RATE = 16;
const CHARS_PER_TOKEN = 4;
const CHUNK = CHARS_PER_TOKEN;
const DELAY = Math.max(1, Math.round(1000 / TOKEN_RATE) - 12);

const MODELS = [
  { id: 'gpt-6-astra', object: 'model', created: 1709072000, owned_by: 'openai' },
  { id: 'claude-opus-5.5', object: 'model', created: 1705443200, owned_by: 'anthropic' }
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
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

const pump = (res, answer, pieces, write, end) => {
  let index = 0;
  const tick = () => {
    if (index >= answer.length) {
      end();
      res.end();
      return;
    }
    const text = answer.slice(index, index + CHUNK);
    write(pieces(text));
    index += CHUNK;
    setTimeout(tick, DELAY);
  };
  tick();
};

const lastUserText = (body) => {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== 'user') continue;
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.content)) {
      return message.content
        .map((part) => (typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : ''))
        .join(' ');
    }
  }
  return '';
};

const answerFor = (body, model) => {
  const text = lastUserText(body);
  if (/\bhello\b/i.test(text) || text.includes('你好')) {
    return `Hello, I'm ${model}. What shall we do today? I can handle all kinds of coding work.`;
  }
  return RELAY_ANSWER;
};

const openaiChat = (res, model, body) => {
  const created = Math.floor(Date.now() / 1000);
  const answer = answerFor(body, model);

  if (body.stream === true) {
    openSse(res);
    pump(
      res,
      answer,
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
    choices: [{ index: 0, message: { role: 'assistant', content: answer }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  });
};

const allowed = (model) => MODELS.some((item) => item.id === model);

const server = http.createServer(async (req, res) => {
  const path = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (req.method === 'GET' && path === '/v1/models') {
    sendJson(res, 200, { object: 'list', data: MODELS });
    return;
  }

  if (req.method === 'POST' && path === '/v1/chat/completions') {
    const body = parseBody(await readBody(req));
    if (!body) {
      sendJson(res, 400, { error: { message: 'invalid json body', type: 'invalid_request_error' } });
      return;
    }
    const model = typeof body.model === 'string' ? body.model : '';
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
});

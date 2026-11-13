import { RELAY_ART } from './art.js';

const UPSTREAM = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const ALLOWED_MODELS = ['glm-4.6v-flash'];
const MAX_TOKENS = 2048;
const RELAY_CHUNK = 56;

const RELAY_MODELS = [
  { id: 'gpt-6-astra', object: 'model', created: 1709072000, owned_by: 'openai' },
  { id: 'claude-opus-5.5', object: 'model', created: 1705443200, owned_by: 'anthropic' }
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-beta',
  'Access-Control-Max-Age': '86400'
};

const reply = (payload, status) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });

const sseResponse = (frames) => {
  const encoder = new TextEncoder();
  let index = 0;
  return new Response(
    new ReadableStream({
      async pull(controller) {
        if (index >= frames.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(frames[index]));
        index += 1;
        await new Promise((resolve) => setTimeout(resolve, 6));
      }
    }),
    {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no'
      }
    }
  );
};

const pieces = () => {
  const chunks = [];
  for (let index = 0; index < RELAY_ART.length; index += RELAY_CHUNK) {
    chunks.push(RELAY_ART.slice(index, index + RELAY_CHUNK));
  }
  return chunks;
};

const openaiChat = (model, body) => {
  const created = Math.floor(Date.now() / 1000);

  if (body.stream === true) {
    const frames = pieces().map(
      (text) =>
        `data: ${JSON.stringify({
          id: `chatcmpl-${created}`,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: { content: text }, finish_reason: null }]
        })}\n\n`
    );
    frames.push('data: [DONE]\n\n');
    return sseResponse(frames);
  }

  return reply(
    {
      id: `chatcmpl-${created}`,
      object: 'chat.completion',
      created,
      model,
      choices: [{ index: 0, message: { role: 'assistant', content: RELAY_ART }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    },
    200
  );
};

const anthropicMessage = (model, body) => {
  const messageId = `msg_${Date.now().toString(36)}`;

  if (body.stream === true) {
    const event = (name, payload) => `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
    const frames = [
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
      }),
      event('content_block_start', {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' }
      }),
      ...pieces().map((text) =>
        event('content_block_delta', {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text }
        })
      ),
      event('content_block_stop', { type: 'content_block_stop', index: 0 }),
      event('message_delta', {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: 0 }
      }),
      event('message_stop', { type: 'message_stop' })
    ];
    return sseResponse(frames);
  }

  return reply(
    {
      id: messageId,
      type: 'message',
      role: 'assistant',
      model,
      content: [{ type: 'text', text: RELAY_ART }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    },
    200
  );
};

const readJson = async (request) => {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
};

async function legacyProxy(request, env) {
  const header = request.headers.get('Authorization') || '';
  const key = env.ZHIPU_API_KEY || header.replace(/^Bearer\s+/i, '').trim();
  if (!key) {
    return reply({ error: { message: 'missing api key' } }, 401);
  }

  const body = await readJson(request);
  if (!body) {
    return reply({ error: { message: 'invalid json body' } }, 400);
  }

  if (!ALLOWED_MODELS.includes(body.model)) {
    return reply({ error: { message: `model not allowed by this proxy: ${body.model ?? '(missing)'}` } }, 400);
  }

  const temperature = typeof body.temperature === 'number' ? Math.min(1.5, Math.max(0, body.temperature)) : 0.7;

  const upstream = await fetch(UPSTREAM, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: body.model,
      messages: Array.isArray(body.messages) ? body.messages : [],
      temperature,
      max_tokens: MAX_TOKENS,
      stream: true
    })
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text();
    return new Response(detail || JSON.stringify({ error: { message: 'upstream failed' } }), {
      status: upstream.status,
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...CORS,
      'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const path = new URL(request.url).pathname.replace(/\/+$/, '');

    if (path === '/v1/models') {
      if (request.method !== 'GET') return reply({ error: { message: 'method not allowed' } }, 405);
      return reply({ object: 'list', data: RELAY_MODELS }, 200);
    }

    if (path === '/v1/messages/count_tokens' && request.method === 'POST') {
      return reply({ input_tokens: 0 }, 200);
    }

    if ((path === '/v1/chat/completions' || path === '/v1/messages') && request.method === 'POST') {
      const body = await readJson(request);
      if (!body) return reply({ error: { message: 'invalid json body' } }, 400);
      const model = typeof body.model === 'string' ? body.model : '';
      if (path === '/v1/messages') {
        return anthropicMessage(model || 'claude-opus-5.5', body);
      }
      if (!RELAY_MODELS.some((item) => item.id === model)) {
        return reply({ error: { message: `model not available on this relay: ${model || '(missing)'}` } }, 400);
      }
      return openaiChat(model, body);
    }

    if (path.startsWith('/v1/')) {
      return reply({ error: { message: `unknown endpoint: ${request.method} ${path}` } }, 404);
    }

    if (request.method !== 'POST') {
      return reply({ error: { message: 'method not allowed' } }, 405);
    }

    return legacyProxy(request, env);
  }
};

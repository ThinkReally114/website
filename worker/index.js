const UPSTREAM = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const ALLOWED_MODELS = ['glm-4.6v-flash'];
const MAX_TOKENS = 2048;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

const reply = (payload, status) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
  });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return reply({ error: { message: 'method not allowed' } }, 405);
    }

    const header = request.headers.get('Authorization') || '';
    const key = env.ZHIPU_API_KEY || header.replace(/^Bearer\s+/i, '').trim();
    if (!key) {
      return reply({ error: { message: 'missing api key' } }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return reply({ error: { message: 'invalid json body' } }, 400);
    }

    if (!ALLOWED_MODELS.includes(body.model)) {
      return reply(
        { error: { message: `model not allowed by this proxy: ${body.model ?? '(missing)'}` } },
        400
      );
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
};

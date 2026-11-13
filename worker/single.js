const RELAY_ART = `%%%%%%%%%%%%%--====-====:=====-:%%%%=+++++*%%%
%%%%%%%%%%#===+==================-*%%-++=%%%%%
%%%%%%%%#=====:-====+-:-==========--+#---=%%%%
%%%%%%%#====-+======+====-===-=-:-----#+==-#%%
%%%%%%+====-+==============-=----=--+#%%#:==-%
%%%%%=====-==================---------+--+*+-+
%%%%%-===-=============+======----------=++=-=
%%%%--===-=+-=+=+++=+==+======-=-------=.==:=:
%%%*====:==+-===+++++=+========-=------:=.:-=-
%%%--===-===+===++++===#*====:=-=-----:=:+---=
%%*----=====+#=+=======%%*-=:=--:=-------:+-.=
%%=-==-=-===*%=+.=======%%%#-:-=:-==---=-.-*.=
%%+--=--:===*%%=%#-====+*%.%%%%#:.=----:-.-%:-
%%+-==----=:-%%%=#%#=-=-:%=...:-#==----==--:.-
%%-:----=:=*-#%%%%*%%%%%%%%+=##*%%------:----*
%.-:=---=--*%#*=...%%%%%%%%%#*#%%%-----:---=%%
-=%:.-----.#=-#+=#*%%%%%%%%%%%%%%#----------%%
%%%:.:------=%%%%+%%%%%%%%%%%%%%%+*--------:%%
%%%--=:--:--:.#%%%%%%%%%%%%%%%%%+=.--:.-----:%
%%%+%%:.-----:.#%%%%%%%%%%%%%%%#...-::.:----:%
%%%*:%#..:-:-...=%%%%%%%%%%%###..::....------#
%%%%+%%%::-.=:.....:--++######+........:-----*
%%%%%#*%=-:-..........:#######+........:-----:
%%%%%%%#:--:..........:########.........------
%%%%%%%%---%%%%*+###############:.......:-----`;
const RELAY_ANSWER = '```text\n' + RELAY_ART + '\n```';

const TOKEN_RATE = 16;
const CHARS_PER_TOKEN = 4;
const RELAY_CHUNK = CHARS_PER_TOKEN;
const TICK_MS = Math.max(1, Math.round(1000 / TOKEN_RATE) - 12);
const RELAY_BUILD = '2026-11-13.auth-delay-16t';
const RELAY_API_KEY = 'sk-thinkreally114-worker-111';
const DELAY_MIN = 5000;
const DELAY_MAX = 20000;

const RELAY_MODELS = [
  { id: 'gpt-6-astra', object: 'model', created: 1709072000, owned_by: 'openai' },
  { id: 'claude-opus-5.5', object: 'model', created: 1705443200, owned_by: 'anthropic' },
  { id: 'glm-5.3', object: 'model', created: 1709072000, owned_by: 'zhipu' },
  { id: 'glm-5.3-flash', object: 'model', created: 1709072000, owned_by: 'zhipu' },
  { id: 'codex-auto-review', object: 'model', created: 1709072000, owned_by: 'openai' },
  { id: 'deepseek-v4.1-flash', object: 'model', created: 1709072000, owned_by: 'deepseek' },
  { id: 'gpt-5.6-luna', object: 'model', created: 1709072000, owned_by: 'openai' },
  { id: 'gpt-5.6-sol', object: 'model', created: 1709072000, owned_by: 'openai' },
  { id: 'gpt-6-luna', object: 'model', created: 1709072000, owned_by: 'openai' },
  { id: 'gpt-6.1-sol', object: 'model', created: 1709072000, owned_by: 'openai' },
  { id: 'claude-fable-5.2', object: 'model', created: 1705443200, owned_by: 'anthropic' },
  { id: 'claude-mythos-5.2', object: 'model', created: 1705443200, owned_by: 'anthropic' },
  { id: 'claude-sonnet-5.5', object: 'model', created: 1705443200, owned_by: 'anthropic' },
  { id: 'claude-haiku-5.5', object: 'model', created: 1705443200, owned_by: 'anthropic' }
];

const ENDPOINTS = 'GET /v1/models, POST /v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Max-Age': '86400',
  'X-Relay-Build': RELAY_BUILD
};

const reply = (payload, status) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });

const submittedKey = (request) => {
  const raw = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';
  return raw.replace(/^Bearer\s+/i, '').trim();
};

const authFailure = (request) =>
  reply(
    {
      error: {
        message: `Incorrect API key provided: ${submittedKey(request) || '(none)'}. You can find your API key at https://platform.openai.com/account/api-keys.`,
        type: 'invalid_request_error',
        code: 'invalid_api_key'
      }
    },
    401
  );

const pause = () =>
  new Promise((resolve) => setTimeout(resolve, DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN)));

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
        await new Promise((resolve) => setTimeout(resolve, TICK_MS));
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

const pieces = (text) => {
  const chunks = [];
  for (let index = 0; index < text.length; index += RELAY_CHUNK) {
    chunks.push(text.slice(index, index + RELAY_CHUNK));
  }
  return chunks;
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

const openaiChat = (model, body) => {
  const created = Math.floor(Date.now() / 1000);
  const answer = answerFor(body, model);

  if (body.stream === true) {
    const frames = pieces(answer).map(
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
      choices: [{ index: 0, message: { role: 'assistant', content: answer }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
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

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

    if (path === '/v1/models') {
      if (request.method !== 'GET') return reply({ error: { message: 'method not allowed' } }, 405);
      return reply({ object: 'list', data: RELAY_MODELS }, 200);
    }

    if (path === '/v1/chat/completions' && request.method === 'POST') {
      if (submittedKey(request) !== RELAY_API_KEY) return authFailure(request);
      const body = await readJson(request);
      if (!body) return reply({ error: { message: 'invalid json body' } }, 400);
      const model = typeof body.model === 'string' ? body.model : '';
      if (!RELAY_MODELS.some((item) => item.id === model)) {
        return reply({ error: { message: `model not available on this relay: ${model || '(missing)'}` } }, 400);
      }
      await pause();
      return openaiChat(model, body);
    }

    return reply(
      { error: { message: `unknown endpoint: ${request.method} ${path}`, endpoint: ENDPOINTS } },
      404
    );
  }
};

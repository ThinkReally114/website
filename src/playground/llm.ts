export interface ChatToolFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ChatTool {
  type: 'function';
  function: ChatToolFunction;
}

export interface ChatToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface OutgoingToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OutgoingToolCall[];
  tool_call_id?: string;
}

export interface LlmConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export type LlmErrorKind =
  | 'network'
  | 'auth'
  | 'balance'
  | 'quota'
  | 'notfound'
  | 'request'
  | 'server'
  | 'empty';

export class LlmError extends Error {
  kind: LlmErrorKind;

  constructor(kind: LlmErrorKind, message: string) {
    super(message);
    this.name = 'LlmError';
    this.kind = kind;
  }
}

export interface StreamCallbacks {
  onOpen?: () => void;
  onDelta: (text: string) => void;
  onReasoning?: (text: string) => void;
  onToolCall?: (call: ChatToolCall) => string | Promise<string>;
  onDone: () => void;
}

export const DEFAULT_ENDPOINT = 'https://api.deepseek.com/chat/completions';
export const DEFAULT_MODEL = 'deepseek-flash';

const CONFIG_KEY = 'playground-llm-config';
const TOOL_ROUND_LIMIT = 4;

export function chatUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /\/chat\/completions$/i.test(trimmed) ? trimmed : `${trimmed}/chat/completions`;
}

function envValue(key: string): string {
  const value = (import.meta.env as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function readLlmConfig(): LlmConfig {
  const base: LlmConfig = {
    endpoint: chatUrl(envValue('VITE_LLM_ENDPOINT') || DEFAULT_ENDPOINT),
    apiKey: envValue('VITE_LLM_KEY'),
    model: envValue('VITE_LLM_MODEL') || DEFAULT_MODEL
  };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return base;
    const stored = JSON.parse(raw) as Partial<LlmConfig>;
    return {
      endpoint: stored.endpoint?.trim() ? chatUrl(stored.endpoint) : base.endpoint,
      apiKey: stored.apiKey ?? base.apiKey,
      model: stored.model?.trim() || base.model
    };
  } catch (error) {
    void error;
    return base;
  }
}

export function writeLlmConfig(config: LlmConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    void error;
  }
}

export function resetLlmConfig(): void {
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch (error) {
    void error;
  }
}

function errorFromResponse(status: number, message: string): LlmError {
  if (status === 401 || status === 403) return new LlmError('auth', message);
  if (status === 402) return new LlmError('balance', message);
  if (status === 404) return new LlmError('notfound', message);
  if (status === 429) return new LlmError('quota', message);
  if (status >= 500) return new LlmError('server', message);
  return new LlmError('request', message);
}

async function readFailure(response: Response): Promise<LlmError> {
  let detail = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { error?: { message?: string }; message?: string };
    detail = body.error?.message ?? body.message ?? detail;
  } catch (error) {
    void error;
  }
  return errorFromResponse(response.status, `${detail} (HTTP ${response.status})`);
}

interface ChunkDelta {
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: {
    index?: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }[];
}

function parseChunk(payload: string, callbacks: StreamCallbacks, calls: Map<number, ChatToolCall>): boolean {
  if (payload === '[DONE]') return true;
  let json: { choices?: { delta?: ChunkDelta }[] };
  try {
    json = JSON.parse(payload) as typeof json;
  } catch (error) {
    void error;
    return false;
  }
  const delta = json.choices?.[0]?.delta;
  if (!delta) return false;
  if (delta.reasoning_content) callbacks.onReasoning?.(delta.reasoning_content);
  if (delta.content) callbacks.onDelta(delta.content);
  for (const part of delta.tool_calls ?? []) {
    const index = typeof part.index === 'number' ? part.index : 0;
    const entry = calls.get(index) ?? { id: '', name: '', arguments: '' };
    if (part.id) entry.id = part.id;
    if (part.function?.name) entry.name = part.function.name;
    if (part.function?.arguments) entry.arguments += part.function.arguments;
    calls.set(index, entry);
  }
  return false;
}

export interface StreamRequest {
  config: LlmConfig;
  messages: ChatMessage[];
  effort?: string;
  tools?: ChatTool[];
  signal: AbortSignal;
}

export const REASONING_EFFORTS = ['none', 'low', 'high', 'max'];

async function streamRound(request: StreamRequest, callbacks: StreamCallbacks): Promise<ChatToolCall[]> {
  const { config, messages, effort, tools, signal } = request;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  const payload: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: true
  };
  if (/^deepseek/i.test(config.model)) {
    payload.reasoning_effort = effort && REASONING_EFFORTS.includes(effort) ? effort : 'high';
  }
  if (tools?.length) payload.tools = tools;

  let response: Response;
  try {
    response = await fetch(chatUrl(config.endpoint), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new LlmError('network', error instanceof Error ? error.message : 'request failed');
  }

  if (!response.ok) throw await readFailure(response);
  if (!response.body) throw new LlmError('empty', 'response has no body');

  callbacks.onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const calls = new Map<number, ChatToolCall>();
  let buffer = '';
  let finished = false;

  while (!finished) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let breakAt = buffer.indexOf('\n');
    while (breakAt >= 0) {
      const line = buffer.slice(0, breakAt).trim();
      buffer = buffer.slice(breakAt + 1);
      breakAt = buffer.indexOf('\n');
      if (!line.startsWith('data:')) continue;
      if (parseChunk(line.slice(5).trim(), callbacks, calls)) {
        finished = true;
        break;
      }
    }
  }

  return [...calls.values()].filter((call) => call.name);
}

export async function runChat(request: StreamRequest, callbacks: StreamCallbacks): Promise<void> {
  const messages = [...request.messages];
  const rounds = request.tools?.length ? TOOL_ROUND_LIMIT : 1;

  for (let round = 0; round < rounds; round += 1) {
    const calls = await streamRound({ ...request, messages }, callbacks);
    if (!calls.length) break;

    messages.push({
      role: 'assistant',
      content: '',
      tool_calls: calls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments }
      }))
    });

    for (const call of calls) {
      const result = await callbacks.onToolCall?.(call);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: typeof result === 'string' ? result : JSON.stringify(result ?? '')
      });
    }
  }

  callbacks.onDone();
}

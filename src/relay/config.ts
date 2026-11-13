export interface RelayModel {
  id: string;
  owned_by: string;
  created: number;
}

export const RELAY_BASE = 'https://relay.2507164880.workers.dev/v1';

export const RELAY_MODELS: RelayModel[] = [
  { id: 'gpt-6-astra', owned_by: 'openai', created: 1709072000 },
  { id: 'claude-opus-5.5', owned_by: 'anthropic', created: 1705443200 },
  { id: 'glm-5.3', owned_by: 'zhipu', created: 1709072000 },
  { id: 'glm-5.3-flash', owned_by: 'zhipu', created: 1709072000 },
  { id: 'codex-auto-review', owned_by: 'openai', created: 1709072000 },
  { id: 'deepseek-v4.1-flash', owned_by: 'deepseek', created: 1709072000 },
  { id: 'gpt-5.6-luna', owned_by: 'openai', created: 1709072000 },
  { id: 'gpt-5.6-sol', owned_by: 'openai', created: 1709072000 },
  { id: 'gpt-6-luna', owned_by: 'openai', created: 1709072000 },
  { id: 'gpt-6.1-sol', owned_by: 'openai', created: 1709072000 },
  { id: 'claude-fable-5.2', owned_by: 'anthropic', created: 1705443200 },
  { id: 'claude-mythos-5.2', owned_by: 'anthropic', created: 1705443200 },
  { id: 'claude-sonnet-5.5', owned_by: 'anthropic', created: 1705443200 },
  { id: 'claude-haiku-5.5', owned_by: 'anthropic', created: 1705443200 }
];

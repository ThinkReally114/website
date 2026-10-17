import type { LlmErrorKind } from './llm';

export type TurnStage = 'streaming' | 'done' | 'failed';
export type FailureKind = LlmErrorKind | 'aborted' | 'unknown';

export interface Turn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning: string;
  steps: string[];
  stage: TurnStage;
  elapsed?: number;
  failure?: FailureKind;
}

const STORAGE_KEY = 'playground-chat';
const PREFS_KEY = 'playground-prefs';
const MAX_TURNS = 50;

export interface PlaygroundPrefs {
  presetKey: string;
  effort: string;
  toolsEnabled: boolean;
}

export function readPrefs(): Partial<PlaygroundPrefs> {
  try {
    const raw = sessionStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PlaygroundPrefs>;
    return {
      presetKey: typeof parsed.presetKey === 'string' ? parsed.presetKey : undefined,
      effort: typeof parsed.effort === 'string' ? parsed.effort : undefined,
      toolsEnabled: typeof parsed.toolsEnabled === 'boolean' ? parsed.toolsEnabled : undefined
    };
  } catch (error) {
    void error;
    return {};
  }
}

export function writePrefs(prefs: PlaygroundPrefs): void {
  try {
    sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    void error;
  }
}

function isTurn(value: unknown): value is Turn {
  if (!value || typeof value !== 'object') return false;
  const turn = value as Partial<Turn>;
  return (
    typeof turn.id === 'string' &&
    (turn.role === 'user' || turn.role === 'assistant') &&
    typeof turn.content === 'string'
  );
}

function restore(turn: Turn): Turn {
  const interrupted = turn.stage === 'streaming';
  return {
    id: turn.id,
    role: turn.role,
    content: turn.content,
    reasoning: typeof turn.reasoning === 'string' ? turn.reasoning : '',
    steps: Array.isArray(turn.steps) ? turn.steps.filter((step): step is string => typeof step === 'string') : [],
    stage: interrupted || turn.stage === 'failed' ? 'failed' : 'done',
    elapsed: typeof turn.elapsed === 'number' ? turn.elapsed : undefined,
    failure: interrupted ? 'aborted' : turn.failure
  };
}

export function readTurns(): Turn[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isTurn).map(restore) : [];
  } catch (error) {
    void error;
    return [];
  }
}

export function writeTurns(turns: Turn[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-MAX_TURNS)));
  } catch (error) {
    void error;
  }
}

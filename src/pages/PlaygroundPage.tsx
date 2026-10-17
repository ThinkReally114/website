import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import PromptBar, { type PromptBarCommand, type PromptBarLabels } from '../components/chat/PromptBar';
import ThoughtLine from '../components/chat/ThoughtLine';
import { CheckIcon, CopyIcon, RegenerateIcon, BlogIcon } from '../components/icons';
import { MagneticButton } from '../components/ui/Magnetic';
import GlideSelect, { type SelectOption } from '../components/ui/GlideSelect';
import SwipeToast from '../components/ui/SwipeToast';
import { useChatPalette } from '../playground/palette';
import { DEFAULT_PRESET_KEY, PROMPT_PRESETS } from '../playground/prompts';
import {
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  LlmError,
  REASONING_EFFORTS,
  chatUrl,
  readLlmConfig,
  resetLlmConfig,
  runChat,
  writeLlmConfig,
  type ChatMessage,
  type LlmConfig
} from '../playground/llm';
import { readPrefs, readTurns, writePrefs, writeTurns, type FailureKind, type Turn } from '../playground/chatStore';
import { renderChatMarkdown } from '../playground/markdown';
import { SITE_TOOLS, readSlugHint, runSiteTool } from '../playground/tools';
import { useVisibleHeight } from '../playground/useVisibleHeight';
import './PlaygroundPage.css';

const HISTORY_LIMIT = 12;

let turnSeq = 0;
const nextId = () => {
  turnSeq += 1;
  return `${Date.now().toString(36)}-${turnSeq}`;
};

const PREVIEW_MAX = 40;
const PREVIEW_BREAK = /[。！？.!?，、,;；:：—]/;

const previewChunk = (raw: string): string => {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  let cut = -1;
  for (let i = cleaned.length - 1; i >= 0; i -= 1) {
    if (PREVIEW_BREAK.test(cleaned.charAt(i))) {
      cut = i;
      break;
    }
  }
  const segment = cut >= 0 ? cleaned.slice(cut + 1).trim() : cleaned;
  if (!segment) return '';
  if (segment.length <= PREVIEW_MAX) return segment;
  const blocks = Math.floor(segment.length / PREVIEW_MAX);
  return segment.slice(blocks * PREVIEW_MAX - PREVIEW_MAX, blocks * PREVIEW_MAX);
};

function ReasoningTicker({ text, placeholder }: { text: string; placeholder: string }) {
  const [shown, setShown] = useState('');
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [run, setRun] = useState(0);
  const pending = useRef('');
  const timer = useRef<number | null>(null);

  pending.current = text;

  useEffect(() => {
    if (!text || text === shown) return;
    if (shown && text.startsWith(shown)) {
      setShown(text);
      return;
    }
    if (timer.current !== null) return;
    setPhase('out');
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setShown(pending.current);
      setPhase('in');
      setRun((value) => value + 1);
    }, 180);
  }, [text, shown]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  return (
    <span className="reasoning-ticker">
      <span key={run} className={`reasoning-ticker-line is-${phase}`}>
        {shown || placeholder}
      </span>
    </span>
  );
}

const TurnBody = memo(function TurnBody({ content, streaming }: { content: string; streaming: boolean }) {
  const html = useMemo(() => (streaming ? '' : renderChatMarkdown(content)), [content, streaming]);
  if (streaming) return <div className="turn-body is-streaming">{content}</div>;
  return <div className="turn-body" dangerouslySetInnerHTML={{ __html: html }} />;
});

export default function PlaygroundPage() {
  const { t } = useTranslation();
  const palette = useChatPalette();
  const visibleHeight = useVisibleHeight();

  const [turns, setTurns] = useState<Turn[]>(() => readTurns());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: FailureKind; detail: string } | null>(null);
  const [config, setConfig] = useState<LlmConfig>(() => readLlmConfig());
  const [form, setForm] = useState<LlmConfig>(() => readLlmConfig());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presetKey, setPresetKey] = useState<string>(
    () => PROMPT_PRESETS.find((item) => item.key === readPrefs().presetKey)?.key ?? DEFAULT_PRESET_KEY
  );
  const [pendingRisk, setPendingRisk] = useState<string | null>(null);
  const [effort, setEffort] = useState(() => {
    const stored = readPrefs().effort ?? '';
    return REASONING_EFFORTS.includes(stored) ? stored : 'high';
  });
  const [toolsEnabled, setToolsEnabled] = useState(() => readPrefs().toolsEnabled ?? true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const copyTimer = useRef<number | null>(null);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  const empty = turns.length === 0;

  const preset = useMemo(
    () => PROMPT_PRESETS.find((item) => item.key === presetKey) ?? PROMPT_PRESETS[0],
    [presetKey]
  );

  const presetOptions = useMemo<SelectOption<string>[]>(
    () => PROMPT_PRESETS.map((item) => ({ value: item.key, label: t(`playground.preset.${item.key}.name`) })),
    [t]
  );

  const switchPreset = useCallback(
    (key: string) => {
      if (key === presetKey) return;
      const next = PROMPT_PRESETS.find((item) => item.key === key);
      if (next?.risk) {
        setPendingRisk(key);
        return;
      }
      setPresetKey(key);
    },
    [presetKey]
  );

  const confirmRisk = () => {
    if (pendingRisk) setPresetKey(pendingRisk);
    setPendingRisk(null);
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const key = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    return t(`playground.greet.${key}`);
  }, [t]);

  const effortLabels = useMemo(
    () => [
      t('playground.effort.off'),
      t('playground.effort.low'),
      t('playground.effort.high'),
      t('playground.effort.max')
    ],
    [t]
  );

  const commands = useMemo<PromptBarCommand[]>(
    () => [
      { key: 'clear', name: '/clear', description: t('playground.command.clear') },
      { key: 'retry', name: '/retry', description: t('playground.command.retry') },
      { key: 'copy', name: '/copy', description: t('playground.command.copy') }
    ],
    [t]
  );

  const labels = useMemo<Partial<PromptBarLabels>>(
    () => ({
      prompt: t('playground.placeholder'),
      addSources: t('playground.labels.sources'),
      chooseModel: t('playground.labels.chooseModel'),
      chooseEffort: t('playground.labels.chooseEffort'),
      effort: t('playground.labels.effort'),
      faster: t('playground.effort.faster'),
      smarter: t('playground.effort.smarter'),
      sources: t('playground.labels.sources'),
      commands: t('playground.labels.commands'),
      noMatches: (query: string) => t('playground.labels.noMatches', { query }),
      send: t('playground.labels.send'),
      stop: t('playground.labels.stop'),
      remove: (file: string) => t('playground.labels.remove', { file })
    }),
    [t]
  );

  const failureText = useCallback((kind: FailureKind) => t(`playground.error.${kind}`), [t]);

  useEffect(() => {
    const log = logRef.current;
    if (!log || !pinnedRef.current) return;
    log.scrollTop = log.scrollHeight;
  }, [turns, visibleHeight]);

  useEffect(() => {
    writePrefs({ presetKey, effort, toolsEnabled });
  }, [presetKey, effort, toolsEnabled]);

  useEffect(() => {
    const id = window.setTimeout(() => writeTurns(turns), 350);
    return () => window.clearTimeout(id);
  }, [turns]);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      writeTurns(turnsRef.current);
      abortRef.current?.abort();
    },
    []
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const copyText = useCallback(async (id: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      void error;
      return;
    }
    setCopiedId(id);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedId(null), 1400);
  }, []);

  const sendTurn = useCallback(
    (userText: string, history: Turn[]) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const startedAt = performance.now();

      const assistantId = nextId();
      const userTurn: Turn = {
        id: nextId(),
        role: 'user',
        content: userText,
        reasoning: '',
        steps: [],
        stage: 'done'
      };
      const assistantTurn: Turn = {
        id: assistantId,
        role: 'assistant',
        content: '',
        reasoning: '',
        steps: [
          t('playground.step.inject', { name: t(`playground.preset.${preset.key}.name`) }),
          t('playground.step.request')
        ],
        stage: 'streaming'
      };

      setTurns([...history, userTurn, assistantTurn]);
      setBusy(true);
      setNotice(null);
      pinnedRef.current = true;

      const patch = (change: (turn: Turn) => Partial<Turn>) =>
        setTurns((prev) => prev.map((turn) => (turn.id === assistantId ? { ...turn, ...change(turn) } : turn)));

      const addStep = (step: string) =>
        patch((turn) => (turn.steps.includes(step) ? {} : { steps: [...turn.steps, step] }));

      const buffers = { content: '', reasoning: '' };
      let flushId: number | null = null;
      const flush = () => {
        if (flushId !== null) {
          window.clearTimeout(flushId);
          flushId = null;
        }
        const content = buffers.content;
        const reasoning = buffers.reasoning;
        buffers.content = '';
        buffers.reasoning = '';
        if (!content && !reasoning) return;
        patch((turn) => ({
          content: content ? turn.content + content : turn.content,
          reasoning: reasoning ? turn.reasoning + reasoning : turn.reasoning
        }));
      };
      const queue = (field: 'content' | 'reasoning', text: string) => {
        buffers[field] += text;
        if (flushId === null) flushId = window.setTimeout(flush, 90);
      };

      let streamed = false;
      const payload = history
        .filter((turn) => !turn.failure)
        .slice(-HISTORY_LIMIT)
        .map<ChatMessage>((turn) => ({ role: turn.role, content: turn.content }));

      void runChat(
        {
          config,
          messages: [{ role: 'system', content: preset.prompt }, ...payload, { role: 'user', content: userText }],
          effort,
          tools: toolsEnabled ? SITE_TOOLS : undefined,
          signal: controller.signal
        },
        {
          onOpen: () => addStep(t('playground.step.connected')),
          onToolCall: (call) => {
            const label = t(`playground.tool.${call.name}`, { defaultValue: call.name });
            const slug = call.name === 'read_post' ? readSlugHint(call.arguments) : '';
            addStep(t('playground.step.tool', { name: slug ? `${label}：${slug}` : label }));
            return runSiteTool(call.name, call.arguments);
          },
          onReasoning: (text) => {
            addStep(t('playground.step.reasoning'));
            queue('reasoning', text);
          },
          onDelta: (text) => {
            if (!streamed) {
              streamed = true;
              addStep(t('playground.step.streaming'));
            }
            queue('content', text);
          },
          onDone: () => {
            flush();
            patch((turn) => ({
              stage: 'done',
              elapsed: turn.elapsed ?? Math.round((performance.now() - startedAt) / 100) / 10,
              failure: turn.content || turn.reasoning ? undefined : 'empty',
              steps: turn.steps.includes(t('playground.step.done'))
                ? turn.steps
                : [...turn.steps, t('playground.step.done')]
            }));
          }
        }
      )
        .catch((error: unknown) => {
          flush();
          const aborted = error instanceof DOMException && error.name === 'AbortError';
          const kind: FailureKind = aborted ? 'aborted' : error instanceof LlmError ? error.kind : 'unknown';
          patch(() => ({ stage: 'failed', failure: kind }));
          if (!aborted) setNotice({ kind, detail: error instanceof Error ? error.message : '' });
        })
        .finally(() => {
          abortRef.current = null;
          setBusy(false);
        });
    },
    [config, effort, preset.key, preset.prompt, t, toolsEnabled]
  );

  const copyLast = useCallback(() => {
    const last = [...turns].reverse().find((turn) => turn.role === 'assistant' && turn.content);
    if (last) void copyText(last.id, last.content);
  }, [copyText, turns]);

  const retryLast = useCallback(() => {
    let index = -1;
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (turns[i].role === 'user') {
        index = i;
        break;
      }
    }
    if (index < 0) return;
    sendTurn(turns[index].content, turns.slice(0, index));
  }, [sendTurn, turns]);

  const handleSend = useCallback(
    (text: string) => {
      if (busy) return;
      if (text === '/clear') {
        setTurns([]);
        setNotice(null);
        return;
      }
      if (text === '/retry') {
        retryLast();
        return;
      }
      if (text === '/copy') {
        copyLast();
        return;
      }
      sendTurn(text, turns);
    },
    [busy, copyLast, retryLast, sendTurn, turns]
  );

  const rememberElapsed = useCallback((id: string, seconds: number) => {
    setTurns((prev) =>
      prev.map((turn) => (turn.id === id && turn.elapsed === undefined ? { ...turn, elapsed: seconds } : turn))
    );
  }, []);

  const onEffortChange = useCallback(
    (label: string) => {
      const index = effortLabels.indexOf(label);
      setEffort(REASONING_EFFORTS[index] ?? 'high');
    },
    [effortLabels]
  );

  const saveConfig = () => {
    const trimmed: LlmConfig = {
      endpoint: chatUrl(form.endpoint.trim() || DEFAULT_ENDPOINT),
      apiKey: form.apiKey.trim(),
      model: form.model.trim() || DEFAULT_MODEL
    };
    writeLlmConfig(trimmed);
    setConfig(trimmed);
    setForm(trimmed);
    setSettingsOpen(false);
  };

  const clearConfig = () => {
    resetLlmConfig();
    const restored = readLlmConfig();
    setConfig(restored);
    setForm(restored);
  };

  return (
    <div className="page playground" style={visibleHeight ? { height: visibleHeight } : undefined}>
      <h1 className="visually-hidden">{t('playground.title')}</h1>

      <div className="playground-bar">
        <div className="playground-bar-title">
          <span className="playground-prompt-tag">{t('playground.prompt.label')}</span>
          <GlideSelect
            className="playground-preset"
            value={presetKey}
            options={presetOptions}
            onChange={switchPreset}
            ariaLabel={t('playground.prompt.label')}
            align="start"
          />
        </div>
        <div className="playground-bar-actions">
          <button
            type="button"
            className="playground-tools-toggle"
            aria-pressed={toolsEnabled}
            title={t('playground.tools.hint')}
            data-on={toolsEnabled ? '' : undefined}
            onClick={() => setToolsEnabled((on) => !on)}>
            <BlogIcon size={14} />
            {t('playground.tools.label')}
          </button>
          <MagneticButton variant="quiet" size="sm" onClick={() => setSettingsOpen((open) => !open)}>
            {t('playground.settings.title')}
          </MagneticButton>
          <MagneticButton
            variant="quiet"
            size="sm"
            onClick={() => {
              setTurns([]);
              setNotice(null);
            }}>
            {t('playground.clear')}
          </MagneticButton>
        </div>
      </div>

      {settingsOpen ? (
        <div className="playground-panel playground-settings">
          <div className="playground-field">
            <label className="playground-field-label" htmlFor="pg-endpoint">
              {t('playground.settings.endpoint')}
            </label>
            <input
              id="pg-endpoint"
              type="url"
              value={form.endpoint}
              spellCheck={false}
              placeholder={t('playground.settings.endpointPlaceholder')}
              onChange={(event) => setForm({ ...form, endpoint: event.target.value })}
              onBlur={(event) => setForm((prev) => ({ ...prev, endpoint: chatUrl(event.target.value) }))}
            />
          </div>
          <div className="playground-field">
            <label className="playground-field-label" htmlFor="pg-model">
              {t('playground.settings.model')}
            </label>
            <input
              id="pg-model"
              type="text"
              value={form.model}
              spellCheck={false}
              placeholder={DEFAULT_MODEL}
              onChange={(event) => setForm({ ...form, model: event.target.value })}
            />
          </div>
          <div className="playground-field">
            <label className="playground-field-label" htmlFor="pg-key">
              {t('playground.settings.apiKey')}
            </label>
            <input
              id="pg-key"
              type="password"
              value={form.apiKey}
              spellCheck={false}
              autoComplete="off"
              placeholder={t('playground.settings.apiKeyPlaceholder')}
              onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
            />
          </div>
          <div className="playground-settings-actions">
            <MagneticButton variant="primary" size="sm" onClick={saveConfig}>
              {t('playground.settings.save')}
            </MagneticButton>
            <MagneticButton variant="ghost" size="sm" onClick={clearConfig}>
              {t('playground.settings.reset')}
            </MagneticButton>
          </div>
        </div>
      ) : null}

      <div className="playground-main" data-empty={empty ? 'true' : undefined}>
        <div className="playground-slot">
          {empty ? (
            <p className="playground-welcome">
              <HugeiconsIcon icon={SparklesIcon} size={22} strokeWidth={2} />
              {greeting}
            </p>
          ) : (
            <div
              ref={logRef}
              className="playground-log"
              role="log"
              aria-busy={busy}
              onScroll={() => {
                const log = logRef.current;
                if (!log) return;
                pinnedRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
              }}>
              {turns.map((turn, index) =>
                turn.role === 'user' ? (
                  <article key={turn.id} className="turn turn-user">
                    <div className="turn-bubble">
                      <p className="turn-text">{turn.content}</p>
                    </div>
                    <div className="turn-actions">
                      <button
                        type="button"
                        className="turn-action"
                        aria-label={t('playground.action.copy')}
                        onClick={() => void copyText(turn.id, turn.content)}>
                        {copiedId === turn.id ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
                      </button>
                    </div>
                  </article>
                ) : (
                  <article key={turn.id} className="turn turn-assistant">
                    <ThoughtLine
                      className="turn-thought"
                      label={t('playground.thinking')}
                      renderLabel={(text, working) =>
                        working ? <ReasoningTicker text={previewChunk(turn.reasoning)} placeholder={text} /> : text
                      }
                      doneLabel={t('playground.thought')}
                      steps={turn.steps}
                      working={turn.stage === 'streaming'}
                      showTimer={turn.stage !== 'streaming'}
                      elapsed={turn.elapsed}
                      fontSize={13}
                      color="var(--text-2)"
                      glyphColor="var(--accent-text)"
                      onSettle={(seconds) => rememberElapsed(turn.id, seconds)}
                    />
                    {turn.reasoning ? (
                      <details className="turn-reasoning">
                        <summary>{t('playground.reasoning')}</summary>
                        <pre>{turn.reasoning}</pre>
                      </details>
                    ) : null}
                    {turn.content ? <TurnBody content={turn.content} streaming={turn.stage === 'streaming'} /> : null}
                    {turn.failure ? <p className="turn-failure">{failureText(turn.failure)}</p> : null}
                    {turn.content ? (
                      <div className="turn-actions">
                        <button
                          type="button"
                          className="turn-action"
                          aria-label={t('playground.action.copy')}
                          onClick={() => void copyText(turn.id, turn.content)}>
                          {copiedId === turn.id ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
                        </button>
                        {index === turns.length - 1 && !busy ? (
                          <button
                            type="button"
                            className="turn-action"
                            aria-label={t('playground.action.regenerate')}
                            onClick={retryLast}>
                            <RegenerateIcon size={15} />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                )
              )}
            </div>
          )}
        </div>

        <div className="playground-composer">
          {notice ? (
            <div className="playground-notice" role="alert">
              <p className="playground-notice-text">{failureText(notice.kind)}</p>
              {notice.detail ? <p className="playground-notice-detail">{notice.detail}</p> : null}
              {notice.kind === 'network' ? (
                <p className="playground-notice-hint">{t('playground.error.hint')}</p>
              ) : null}
            </div>
          ) : null}
          {config.apiKey ? null : <p className="playground-key-hint">{t('playground.keyHint')}</p>}
          <PromptBar
            placeholder={t('playground.placeholder')}
            sources={[]}
            commands={commands}
            efforts={effortLabels}
            defaultEffort={effortLabels[Math.max(REASONING_EFFORTS.indexOf(effort), 0)]}
            onEffortChange={onEffortChange}
            busy={busy}
            onSend={handleSend}
            onStop={stop}
            labels={labels}
            background={palette.background}
            menuBackground={palette.menuBackground}
            color={palette.color}
            sparkColor={palette.sparkColor}
            width={960}
            radius={22}
            maxRows={8}
          />
          <p className="playground-disclaimer">{t('playground.disclaimer')}</p>
        </div>
      </div>

      <SwipeToast
        open={pendingRisk !== null}
        onDismiss={() => setPendingRisk(null)}
        labelledById="pg-risk-title">
        <h2 id="pg-risk-title" className="swipe-toast-title">
          {t('playground.risk.title')}
        </h2>
        <p className="swipe-toast-text">{t('playground.risk.text')}</p>
        <div className="swipe-toast-actions">
          <MagneticButton variant="primary" size="sm" onClick={confirmRisk}>
            {t('playground.risk.accept')}
          </MagneticButton>
          <MagneticButton variant="ghost" size="sm" onClick={() => setPendingRisk(null)}>
            {t('playground.risk.cancel')}
          </MagneticButton>
        </div>
      </SwipeToast>
    </div>
  );
}

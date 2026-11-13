import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, CopyIcon } from '../components/icons';
import GlideSelect, { type SelectOption } from '../components/ui/GlideSelect';
import { RELAY_MODELS } from '../relay/config';
import { RELAY_ART } from '../relay/payload';
import './RelayPage.css';

type Phase = 'idle' | 'streaming' | 'done';

const CHUNK = 56;
const TICK = 16;
const LATENCY = 620;

const REQUEST_BODY = `POST /v1/chat/completions
Content-Type: application/json

{
  "model": "gpt-6-astra",
  "messages": [{ "role": "user", "content": "你好" }],
  "stream": true
}`;

const RESPONSE_BODY = `data: {"id":"chatcmpl-7f2a","object":"chat.completion.chunk","created":1709072000,
 "model":"gpt-6-astra","choices":[{"index":0,"delta":{"content":"%%%%%%"}}]}

data: {"id":"chatcmpl-7f2a","object":"chat.completion.chunk","created":1709072000,
 "model":"gpt-6-astra","choices":[{"index":0,"delta":{"content":"%%%---"}}]}

data: [DONE]`;

export default function RelayPage() {
  const { t, i18n } = useTranslation();
  const [model, setModel] = useState(RELAY_MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState<'request' | 'response' | null>(null);

  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(0);
  const outputRef = useRef<HTMLPreElement>(null);
  const copyTimer = useRef<number | null>(null);

  const options: SelectOption<string>[] = RELAY_MODELS.map((item) => ({ value: item.id, label: item.id }));

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    []
  );

  useEffect(() => {
    const node = outputRef.current;
    if (node && phase === 'streaming') node.scrollTop = node.scrollHeight;
  }, [output, phase]);

  const send = useCallback(() => {
    if (phase === 'streaming') return;
    clearTimer();
    startedRef.current = performance.now();
    setOutput('');
    setElapsed(0);
    setPhase('streaming');

    let index = 0;
    const tick = () => {
      index = Math.min(RELAY_ART.length, index + CHUNK);
      setOutput(RELAY_ART.slice(0, index));
      if (index >= RELAY_ART.length) {
        timerRef.current = null;
        setElapsed(Math.round(performance.now() - startedRef.current));
        setPhase('done');
        return;
      }
      timerRef.current = window.setTimeout(tick, TICK);
    };

    timerRef.current = window.setTimeout(tick, LATENCY);
  }, [phase]);

  const stop = useCallback(() => {
    clearTimer();
    if (!output) {
      setPhase('idle');
      setElapsed(0);
      return;
    }
    setElapsed(Math.round(performance.now() - startedRef.current));
    setPhase('done');
  }, [output]);

  const reset = useCallback(() => {
    clearTimer();
    setOutput('');
    setElapsed(0);
    setPhase('idle');
  }, []);

  const copy = useCallback(async (kind: 'request' | 'response', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      void error;
      return;
    }
    setCopied(kind);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1400);
  }, []);

  const onPromptKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const formatDate = (created: number) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }).format(
        new Date(created * 1000)
      );
    } catch (error) {
      void error;
      return new Date(created * 1000).toISOString().slice(0, 10);
    }
  };

  return (
    <div className="page relay">
      <header className="page-header relay-header">
        <div className="relay-heading">
          <p className="relay-eyebrow">{t('relay.eyebrow')}</p>
          <h1 className="page-title">{t('relay.title')}</h1>
          <p className="page-sub">{t('relay.sub')}</p>
        </div>
        <div className="relay-status">
          <span className="relay-status-dot" aria-hidden="true" />
          {t('relay.status.demo')}
        </div>
      </header>

      <section className="relay-section" aria-labelledby="relay-endpoints-title">
        <div className="relay-section-head">
          <h2 id="relay-endpoints-title" className="relay-section-title">
            {t('relay.endpoints.title')}
          </h2>
          <p className="relay-section-hint">{t('relay.endpoints.hint')}</p>
        </div>

        <ul className="relay-endpoints">
          <li className="relay-endpoint glass-card">
            <span className="relay-method">GET</span>
            <code className="relay-path">/v1/models</code>
            <span className="relay-endpoint-desc">{t('relay.endpoint.models')}</span>
          </li>
          <li className="relay-endpoint glass-card">
            <span className="relay-method is-post">POST</span>
            <code className="relay-path">/v1/chat/completions</code>
            <span className="relay-endpoint-desc">{t('relay.endpoint.chat')}</span>
          </li>
        </ul>
      </section>

      <section className="relay-section" aria-labelledby="relay-models-title">
        <div className="relay-section-head">
          <h2 id="relay-models-title" className="relay-section-title">
            {t('relay.models.title')}
          </h2>
          <p className="relay-section-hint">{t('relay.models.sub')}</p>
        </div>

        <ul className="relay-models">
          {RELAY_MODELS.map((item) => (
            <li key={item.id} className="relay-model glass-card">
              <div className="relay-model-top">
                <code className="relay-model-id">{item.id}</code>
                <span className="relay-tag">{item.owned_by}</span>
              </div>
              <div className="relay-model-meta">
                <span>
                  {t('relay.models.created')} · {formatDate(item.created)}
                </span>
                <span>{t('relay.models.stream')}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="relay-section" aria-labelledby="relay-console-title">
        <div className="relay-section-head">
          <h2 id="relay-console-title" className="relay-section-title">
            {t('relay.console.title')}
          </h2>
          <p className="relay-section-hint">{t('relay.console.hint')}</p>
        </div>

        <div className="relay-console glass-card">
          <div className="relay-console-bar">
            <GlideSelect
              className="relay-console-model"
              value={model}
              options={options}
              onChange={setModel}
              ariaLabel={t('relay.console.model')}
              align="start"
            />
            <span className="relay-console-phase" data-phase={phase} role="status">
              {phase === 'idle'
                ? t('relay.console.idle')
                : phase === 'streaming'
                  ? t('relay.console.streaming')
                  : t('relay.console.done', { ms: elapsed })}
            </span>
          </div>

          <label className="visually-hidden" htmlFor="relay-prompt">
            {t('relay.console.prompt')}
          </label>
          <textarea
            id="relay-prompt"
            className="relay-console-input"
            rows={2}
            maxLength={2000}
            spellCheck={false}
            value={prompt}
            placeholder={t('relay.console.placeholder')}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={onPromptKey}
          />

          <div className="relay-console-actions">
            <button type="button" className="relay-send" onClick={send} disabled={phase === 'streaming'}>
              {t('relay.console.send')}
            </button>
            <button type="button" className="relay-ghost" onClick={stop} disabled={phase !== 'streaming'}>
              {t('relay.console.stop')}
            </button>
            <button type="button" className="relay-ghost" onClick={reset} disabled={phase === 'idle'}>
              {t('relay.console.clear')}
            </button>
          </div>

          <pre
            ref={outputRef}
            className="relay-console-out"
            aria-busy={phase === 'streaming'}
            data-empty={output ? undefined : 'true'}>
            {output || t('relay.console.empty')}
            {phase === 'streaming' ? <span className="relay-caret" aria-hidden="true" /> : null}
          </pre>
        </div>
      </section>

      <section className="relay-section" aria-labelledby="relay-code-title">
        <div className="relay-section-head">
          <h2 id="relay-code-title" className="relay-section-title">
            {t('relay.code.title')}
          </h2>
        </div>

        <div className="relay-code">
          <div className="relay-code-bar">
            <span className="relay-code-name">{t('relay.code.request')}</span>
            <button
              type="button"
              className="relay-copy is-quiet"
              onClick={() => void copy('request', REQUEST_BODY)}
              aria-label={t('relay.code.copy')}>
              {copied === 'request' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied === 'request' ? t('relay.code.copied') : t('relay.code.copy')}
            </button>
          </div>
          <pre className="relay-code-body">
            <code>{REQUEST_BODY}</code>
          </pre>
        </div>

        <div className="relay-code">
          <div className="relay-code-bar">
            <span className="relay-code-name">{t('relay.code.response')}</span>
            <button
              type="button"
              className="relay-copy is-quiet"
              onClick={() => void copy('response', RESPONSE_BODY)}
              aria-label={t('relay.code.copy')}>
              {copied === 'response' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied === 'response' ? t('relay.code.copied') : t('relay.code.copy')}
            </button>
          </div>
          <pre className="relay-code-body">
            <code>{RESPONSE_BODY}</code>
          </pre>
        </div>
      </section>

      <section className="relay-section" aria-labelledby="relay-limits-title">
        <div className="relay-section-head">
          <h2 id="relay-limits-title" className="relay-section-title">
            {t('relay.limits.title')}
          </h2>
        </div>

        <dl className="relay-limits">
          <div className="relay-limit">
            <dt>{t('relay.limit.local')}</dt>
            <dd>{t('relay.limit.localDesc')}</dd>
          </div>
          <div className="relay-limit">
            <dt>{t('relay.limit.models')}</dt>
            <dd>{t('relay.limit.modelsDesc')}</dd>
          </div>
          <div className="relay-limit">
            <dt>{t('relay.limit.content')}</dt>
            <dd>{t('relay.limit.contentDesc')}</dd>
          </div>
          <div className="relay-limit">
            <dt>{t('relay.limit.stream')}</dt>
            <dd>{t('relay.limit.streamDesc')}</dd>
          </div>
          <div className="relay-limit">
            <dt>{t('relay.limit.tokens')}</dt>
            <dd>{t('relay.limit.tokensDesc')}</dd>
          </div>
        </dl>
      </section>

      <p className="relay-footnote">{t('relay.footnote')}</p>
    </div>
  );
}

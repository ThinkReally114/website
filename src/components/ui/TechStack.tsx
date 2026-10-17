import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import GlareHover from './GlareHover';
import Reveal from './Reveal';
import './TechStack.css';

interface TechItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

const ITEMS: TechItem[] = [
  { key: 'typescript', label: 'TypeScript', value: 65.9, color: 'var(--lang-typescript)' },
  { key: 'css', label: 'CSS', value: 31.9, color: 'var(--lang-css)' },
  { key: 'json', label: 'JSON', value: 1.2, color: 'var(--lang-json)' },
  { key: 'html', label: 'HTML', value: 1.0, color: 'var(--lang-html)' }
];

interface StackItem {
  name: string;
  version?: string;
  role: { zh: string; en: string };
}

const STACK: StackItem[] = [
  { name: 'React', version: '19.3.1', role: { zh: '界面框架', en: 'UI framework' } },
  { name: 'TypeScript', version: '~6.0.0', role: { zh: '类型安全', en: 'Type safety' } },
  { name: 'Vite', version: '8.3.4', role: { zh: '构建工具', en: 'Build tool' } },
  { name: 'CSS', role: { zh: '手写样式', en: 'Hand-written styles' } },
  { name: 'react-router', version: '7.18.4', role: { zh: '页面路由', en: 'Routing' } },
  { name: 'marked', version: '18.1.1', role: { zh: '文章渲染', en: 'Markdown rendering' } },
  { name: 'GitHub Actions', role: { zh: '自动部署', en: 'Auto deploy' } },
  { name: 'GitHub Pages', role: { zh: '静态托管', en: 'Static hosting' } }
];

const R = 78;
const START = -90;
const K = 12;

const polar = (deg: number, r = R): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r];
};

const arcPath = (a0: number, a1: number, r = R) => {
  const [x0, y0] = polar(a0, r);
  const [x1, y1] = polar(a1, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const shortest = (target: number, from: number) => {
  const delta = (((target - from) % 360) + 540) % 360 - 180;
  return from + delta;
};

const buildSegments = () =>
  ITEMS.reduce<{ item: TechItem; from: number; to: number; a0: number; a1: number; mid: number; len: number }[]>((list, item) => {
    const cursor = list.length ? list[list.length - 1].to : 0;
    const sweep = (item.value / 100) * 360;
    const gap = Math.min(3.4, sweep * 0.32);
    list.push({
      item,
      from: cursor,
      to: cursor + sweep,
      a0: START + cursor + gap / 2,
      a1: START + cursor + sweep - gap / 2,
      mid: START + cursor + sweep / 2,
      len: (R * (sweep - gap) * Math.PI) / 180
    });
    return list;
  }, []);

export default function TechStack() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.toLowerCase().startsWith('zh');
  const segments = useMemo(buildSegments, []);
  const [active, setActive] = useState(ITEMS[0].key);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const cometRef = useRef<(SVGPathElement | null)[]>([]);
  const live = useRef({ angle: segments[0].mid, target: segments[0].mid, v: 0, raf: 0, last: 0, motion: 0 });

  const activeSeg = segments.find((seg) => seg.item.key === active) ?? segments[0];

  const paintRef = useRef<(now: number) => void>(() => {});
  const tick = useCallback((now: number) => paintRef.current(now), []);

  paintRef.current = (now: number) => {
    const st = live.current;
    st.raf = 0;
    if (!Number.isFinite(st.angle) || !Number.isFinite(st.target)) {
      st.angle = segments[0].mid;
      st.target = segments[0].mid;
      st.v = 0;
    }
    const dt = Math.min(0.05, Math.max(0, (now - st.last) / 1000));
    st.last = now;
    const reduce = st.motion === 0;
    const prev = st.angle;
    const factor = reduce ? 1 : 1 - Math.exp(-dt / 0.075);
    st.angle += (st.target - st.angle) * factor;
    const vel = dt > 0 ? (st.angle - prev) / dt : 0;
    st.v += (vel - st.v) * (1 - Math.exp(-dt / 0.07));
    const speed = st.motion ? Math.min(1, Math.abs(st.v) / 300) : 0;
    const dir = st.v >= 0 ? 1 : -1;
    const reach = (34 * speed) / K;
    cometRef.current.forEach((el, index) => {
      if (!el) return;
      const w = 1 - index / K;
      if (reach < 0.08) {
        if (el.style.opacity !== '0') el.style.opacity = '0';
        return;
      }
      const a0 = dir > 0 ? st.angle - (index + 1) * reach : st.angle + index * reach;
      const a1 = dir > 0 ? st.angle - index * reach : st.angle + (index + 1) * reach;
      el.setAttribute('d', arcPath(a0, a1));
      el.setAttribute('stroke-width', (5 + 9 * w * speed).toFixed(2));
      el.style.opacity = (w * speed * 0.85).toFixed(3);
    });
    const moving = Math.abs(st.target - st.angle) > 0.05 || Math.abs(st.v) > 2;
    if (moving) {
      st.raf = requestAnimationFrame(tick);
    } else {
      cometRef.current.forEach((el) => {
        if (el) el.style.opacity = '0';
      });
    }
  };

  const wake = () => {
    const st = live.current;
    if (st.raf) {
      cancelAnimationFrame(st.raf);
      st.raf = requestAnimationFrame(tick);
      return;
    }
    st.last = performance.now();
    st.raf = requestAnimationFrame(tick);
  };

  const aim = (target: number) => {
    if (!Number.isFinite(target)) return;
    const st = live.current;
    st.target = shortest(target, st.angle);
    wake();
  };

  const select = (key: string) => {
    const seg = segments.find((item) => item.item.key === key);
    if (!seg) return;
    setActive(key);
    aim(seg.mid);
  };

  useEffect(() => {
    live.current.motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
    const onVisible = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      cancelAnimationFrame(live.current.raf);
      live.current.raf = 0;
    };
  }, [segments]);

  const angleOf = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    const x = ((event.clientX - rect.left) / rect.width) * 200 - 100;
    const y = ((event.clientY - rect.top) / rect.height) * 200 - 100;
    if (Math.hypot(x, y) < 34) return null;
    return (Math.atan2(y, x) * 180) / Math.PI;
  };

  const segmentAt = (deg: number) => {
    const rel = (((deg - START) % 360) + 360) % 360;
    return segments.find((seg) => rel >= seg.from && rel < seg.to) ?? segments[segments.length - 1];
  };

  const pointer = (event: ReactPointerEvent<SVGSVGElement>, free: boolean) => {
    const deg = angleOf(event);
    if (deg === null) return;
    const seg = segmentAt(deg);
    if (seg.item.key !== active) setActive(seg.item.key);
    aim(free ? deg : seg.mid);
  };

  const down = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button > 0) return;
    const deg = angleOf(event);
    if (deg === null) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    setDragging(true);
    pointer(event, true);
  };

  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    if (!(event.buttons & 1)) {
      up(event);
      return;
    }
    pointer(event, true);
  };

  const up = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    setDragging(false);
    pointer(event, false);
  };

  return (
    <Reveal>
      <GlareHover className="glass-card tech-card">
        <div className="tech-head">
          <h2 className="section-title tech-title">{t('tech.title')}</h2>
          <p className="tech-sub">{t('tech.subtitle')}</p>
        </div>

        <div className="tech-body">
          <div className="tech-dial" data-dragging={dragging ? '' : undefined}>
            <svg
              ref={svgRef}
              className="tech-ring"
              viewBox="0 0 200 200"
              aria-hidden="true"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onLostPointerCapture={up}
            >
              <circle className="tech-track" cx="100" cy="100" r={R} />
              {segments.map((seg, index) => (
                <path
                  key={seg.item.key}
                  className={`tech-arc ${seg.item.key === active ? 'is-lit' : ''}`}
                  d={arcPath(seg.a0, seg.a1)}
                  style={
                    {
                      stroke: seg.item.color,
                      '--arc-len': seg.len.toFixed(2),
                      '--arc-delay': `${180 + index * 120}ms`
                    } as CSSProperties
                  }
                />
              ))}
              <g className="tech-comet">
                {Array.from({ length: K }, (_, index) => (
                  <path
                    key={index}
                    ref={(el) => {
                      cometRef.current[index] = el;
                    }}
                    style={{ opacity: 0, stroke: activeSeg.item.color }}
                  />
                ))}
              </g>
            </svg>
            <div className="tech-readout" aria-hidden="true">
              <span className="tech-readout-label">{activeSeg.item.label}</span>
              <span className="tech-readout-value">
                {activeSeg.item.value.toFixed(1)}
                <span className="tech-readout-unit">%</span>
              </span>
            </div>
          </div>

          <ul className="tech-legend">
            {ITEMS.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={`tech-item ${item.key === active ? 'is-lit' : ''}`}
                  aria-pressed={item.key === active}
                  onMouseEnter={() => select(item.key)}
                  onFocus={() => select(item.key)}
                  onClick={() => select(item.key)}>
                  <span className="tech-dot" style={{ background: item.color }} />
                  <span className="tech-name">{item.label}</span>
                  <span className="tech-value">{item.value.toFixed(1)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="tech-table-wrap">
          <table className="tech-table">
            <thead>
              <tr>
                <th scope="col">{t('tech.table.name')}</th>
                <th scope="col" className="tech-th-version">{t('tech.table.version')}</th>
                <th scope="col">{t('tech.table.role')}</th>
              </tr>
            </thead>
            <tbody>
              {STACK.map((item) => (
                <tr key={item.name}>
                  <td className="tech-table-pick">{item.name}</td>
                  <td className="tech-table-version">{item.version ?? '—'}</td>
                  <td className="tech-table-role">{isZh ? item.role.zh : item.role.en}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlareHover>
    </Reveal>
  );
}

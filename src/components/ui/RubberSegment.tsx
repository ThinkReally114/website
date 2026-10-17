import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { SelectOption } from './GlideSelect';
import './RubberSegment.css';

interface RubberSegmentProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export default function RubberSegment<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className
}: RubberSegmentProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = useState({ x: 0, y: 0, width: 0, height: 0, ready: false });
  const [stretch, setStretch] = useState(1);
  const [origin, setOrigin] = useState<'left' | 'right'>('left');

  const index = Math.max(
    options.findIndex((option) => option.value === value),
    0
  );

  const prevIndex = useRef(index);

  const measure = useCallback(() => {
    const button = buttonRefs.current[index];
    if (!button) return;
    setThumb((current) => ({
      x: button.offsetLeft,
      y: button.offsetTop,
      width: button.offsetWidth,
      height: button.offsetHeight,
      ready: current.ready
    }));
  }, [index]);

  useLayoutEffect(() => {
    measure();
    const id = requestAnimationFrame(() => setThumb((current) => ({ ...current, ready: true })));
    return () => cancelAnimationFrame(id);
  }, [measure]);

  useLayoutEffect(() => {
    const changed = prevIndex.current !== index;
    if (changed) {
      setOrigin(index > prevIndex.current ? 'left' : 'right');
      setStretch(1.16);
      prevIndex.current = index;
      const id = window.setTimeout(() => setStretch(1), 320);
      return () => window.clearTimeout(id);
    }
  }, [index]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(index + 1, last);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else return;
    event.preventDefault();
    onChange(options[next].value);
    buttonRefs.current[next]?.focus();
  };

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`segment ${className ?? ''}`}
      onKeyDown={onKeyDown}>
      <span
        className={`segment-thumb ${thumb.ready ? 'is-ready' : ''}`}
        style={{
          transform: `translate(${thumb.x}px, ${thumb.y}px) scaleX(${stretch})`,
          width: thumb.width,
          height: thumb.height,
          transformOrigin: origin === 'left' ? 'left center' : 'right center'
        }}
        aria-hidden="true"
      />
      {options.map((option, optionIndex) => (
        <button
          key={option.value}
          ref={(element) => {
            buttonRefs.current[optionIndex] = element;
          }}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          className="segment-option"
          onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

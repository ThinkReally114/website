import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CheckIcon, ChevronDownIcon } from '../icons';
import './GlideSelect.css';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface GlideSelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  align?: 'start' | 'end';
  triggerText?: string;
}

export default function GlideSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  align = 'end',
  triggerText
}: GlideSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [highlight, setHighlight] = useState({ top: 0, height: 0, instant: true, ready: false });

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const listId = useId();

  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0
  );
  const selected = options[selectedIndex];

  const applyHighlight = (index: number, instant: boolean) => {
    const row = rowRefs.current[index];
    if (!row) return;
    setHighlight((current) => ({
      top: row.offsetTop,
      height: row.offsetHeight,
      instant: instant || !current.ready,
      ready: true
    }));
  };

  const skipHighlightEffect = useRef(false);

  useLayoutEffect(() => {
    if (open) {
      applyHighlight(active, true);
      skipHighlightEffect.current = true;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (skipHighlightEffect.current) {
      skipHighlightEffect.current = false;
      return;
    }
    applyHighlight(active, false);
  }, [active, open]);

  useEffect(() => {
    if (!highlight.instant) return;
    const id = requestAnimationFrame(() =>
      setHighlight((current) => ({ ...current, instant: false }))
    );
    return () => cancelAnimationFrame(id);
  }, [highlight.instant]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const select = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(selectedIndex);
        setOpen(true);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, last));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(last);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(active);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`glide ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="glide-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          setActive(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={onTriggerKeyDown}>
        <span className="glide-value">{triggerText ?? selected?.label}</span>
        <span className="glide-chevron">
          <ChevronDownIcon size={14} />
        </span>
      </button>

      {open && (
        <div
          className={`glide-pop ${align === 'start' ? 'align-start' : 'align-end'}`}
          role="listbox"
          id={listId}
          aria-label={ariaLabel}
          aria-activedescendant={`${listId}-${active}`}>
          <span
            className={`glide-highlight ${highlight.instant ? 'is-instant' : ''}`}
            style={{ transform: `translateY(${highlight.top}px)`, height: highlight.height }}
            aria-hidden="true"
          />
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${listId}-${index}`}
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              role="option"
              aria-selected={option.value === value}
              className={`glide-option ${index === active ? 'is-active' : ''}`}
              onPointerEnter={() => setActive(index)}
              onClick={() => select(index)}>
              <span>{option.label}</span>
              {option.value === value && <CheckIcon size={14} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

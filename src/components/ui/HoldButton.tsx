import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import './HoldButton.css';

interface HoldButtonProps {
  onHold: () => void;
  children: ReactNode;
  holdMs?: number;
  variant?: 'danger' | 'default';
  className?: string;
}

export default function HoldButton({
  onHold,
  children,
  holdMs = 1100,
  variant = 'default',
  className
}: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);

  const rafRef = useRef(0);
  const startRef = useRef(0);
  const completedRef = useRef(false);
  const onHoldRef = useRef(onHold);
  onHoldRef.current = onHold;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  const tick = useCallback(() => {
    const elapsed = performance.now() - startRef.current;
    const next = Math.min(elapsed / holdMs, 1);
    setProgress(next);
    if (next >= 1) {
      if (!completedRef.current) {
        completedRef.current = true;
        setDone(true);
        onHoldRef.current();
      }
      setHolding(false);
      window.setTimeout(() => {
        setDone(false);
        setProgress(0);
        completedRef.current = false;
      }, 620);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [holdMs]);

  const start = useCallback(() => {
    if (completedRef.current) return;
    startRef.current = performance.now();
    setHolding(true);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    start();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault();
      start();
    }
  };

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === ' ' || event.key === 'Enter') && !completedRef.current) {
      event.preventDefault();
      stop();
    }
  };

  return (
    <button
      type="button"
      className={`hold-btn ${variant === 'danger' ? 'is-danger' : ''} ${holding ? 'is-holding' : ''} ${done ? 'is-done' : ''} ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={stop}>
      <span
        className="hold-fill"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
      <span className="hold-label">{children}</span>
    </button>
  );
}

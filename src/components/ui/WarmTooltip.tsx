import { useRef, useState, type FocusEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import './WarmTooltip.css';

let lastHideAt = 0;

interface WarmTooltipProps {
  label: string;
  children: ReactNode;
  placement?: 'top' | 'bottom';
  className?: string;
}

export default function WarmTooltip({ label, children, placement = 'bottom', className }: WarmTooltipProps) {
  const [open, setOpen] = useState(false);
  const showTimer = useRef(0);
  const hideTimer = useRef(0);

  const show = (instant: boolean) => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(showTimer.current);
    const warm = performance.now() - lastHideAt < 1600;
    showTimer.current = window.setTimeout(() => setOpen(true), instant || warm ? 70 : 520);
  };

  const hide = () => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setOpen(false);
      lastHideAt = performance.now();
    }, 90);
  };

  const onFocus = (_event: FocusEvent) => show(true);

  return (
    <span
      className={`warm-tip ${className ?? ''}`}
      onPointerEnter={() => show(false)}
      onPointerLeave={hide}
      onFocusCapture={onFocus}
      onBlurCapture={hide}>
      {children}
      <span
        role="tooltip"
        aria-hidden={!open}
        className={`warm-tip-bubble warm-tip-${placement} ${open ? 'is-open' : ''}`}>
        {label}
      </span>
    </span>
  );
}

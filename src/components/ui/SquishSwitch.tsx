import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { MoonIcon, SunIcon } from '../icons';
import './SquishSwitch.css';

interface SquishSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  className?: string;
}

const TRACK_WIDTH = 58;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 24;
const PADDING = 3;
const TRAVEL = TRACK_WIDTH - THUMB_SIZE - PADDING * 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function SquishSwitch({ checked, onChange, ariaLabel, className }: SquishSwitchProps) {
  const [dragging, setDragging] = useState(false);
  const [x, setX] = useState(checked ? TRAVEL : 0);
  const [stretch, setStretch] = useState(1);
  const [origin, setOrigin] = useState<'left' | 'right'>('left');
  const [squashing, setSquashing] = useState(false);

  const xRef = useRef(x);
  const dragRef = useRef({ startX: 0, startOffset: 0, lastX: 0, lastTime: 0, velocity: 0, moved: false });

  xRef.current = x;

  useEffect(() => {
    if (!dragging) setX(checked ? TRAVEL : 0);
  }, [checked, dragging]);

  const celebrate = () => {
    setSquashing(true);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startOffset: xRef.current,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      moved: false
    };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(now - dragRef.current.lastTime, 1);
    const rawVelocity = (event.clientX - dragRef.current.lastX) / dt;
    dragRef.current.velocity = dragRef.current.velocity * 0.7 + rawVelocity * 0.3;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastTime = now;

    const dx = event.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 3) dragRef.current.moved = true;

    const next = clamp(dragRef.current.startOffset + dx, 0, TRAVEL);
    const velocity = dragRef.current.velocity;
    setX(next);
    setOrigin(velocity >= 0 ? 'left' : 'right');
    setStretch(1 + Math.min(Math.abs(velocity) * 0.14, 0.42));
  };

  const finish = (cancelled: boolean) => {
    if (!dragging) return;
    setDragging(false);
    setStretch(1);

    const { moved, velocity } = dragRef.current;
    let next: boolean;
    if (cancelled) {
      next = checked;
    } else if (!moved) {
      next = !checked;
    } else if (Math.abs(velocity) > 0.55) {
      next = velocity > 0;
    } else {
      next = xRef.current > TRAVEL / 2;
    }

    setX(next ? TRAVEL : 0);
    if (next !== checked) {
      onChange(next);
    }
    celebrate();
  };

  const onClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) {
      const next = !checked;
      setX(next ? TRAVEL : 0);
      onChange(next);
      celebrate();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`squish-switch ${checked ? 'is-checked' : ''} ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => finish(false)}
      onPointerCancel={() => finish(true)}
      onClick={onClick}>
      <span
        className="squish-thumb-wrap"
        style={{ transform: `translateX(${x}px)`, transition: dragging ? 'none' : undefined }}>
        <span
          className={`squish-thumb ${squashing ? 'is-squashing' : ''}`}
          style={{
            transform: `scaleX(${stretch})`,
            transformOrigin: origin === 'left' ? 'left center' : 'right center',
            transition: dragging ? 'none' : undefined
          }}
          onAnimationEnd={() => setSquashing(false)}
        />
        <span className="squish-icon squish-icon-sun" aria-hidden="true">
          <SunIcon size={12} />
        </span>
        <span className="squish-icon squish-icon-moon" aria-hidden="true">
          <MoonIcon size={12} />
        </span>
      </span>
    </button>
  );
}

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import './GlareHover.css';

interface GlareHoverProps {
  children: ReactNode;
  className?: string;
}

export default function GlareHover({ children, className }: GlareHoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--gx', `${event.clientX - rect.left}px`);
    element.style.setProperty('--gy', `${event.clientY - rect.top}px`);
  };

  return (
    <div ref={ref} className={`glare-hover ${className ?? ''}`} onPointerMove={onPointerMove}>
      <div className="glare-content">{children}</div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import './CursorDot.css';

export default function CursorDot() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = ref.current;
    if (!dot || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const root = document.documentElement;

    let active = false;
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (!active) {
        active = true;
        root.classList.add('cursor-dot-on');
      }
      dot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      dot.style.opacity = '1';
    };
    const hide = () => {
      dot.style.opacity = '0';
    };
    const show = () => {
      dot.style.opacity = '1';
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('mouseleave', hide);
    document.addEventListener('mouseenter', show);
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);

    return () => {
      root.classList.remove('cursor-dot-on');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('mouseleave', hide);
      document.removeEventListener('mouseenter', show);
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
    };
  }, []);

  return <div ref={ref} className="cursor-dot" aria-hidden="true" />;
}

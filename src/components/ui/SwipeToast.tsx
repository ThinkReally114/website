import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './SwipeToast.css';

interface SwipeToastProps {
  open: boolean;
  onDismiss: () => void;
  children: ReactNode;
  labelledById?: string;
  className?: string;
}

export default function SwipeToast({ open, onDismiss, children, labelledById, className }: SwipeToastProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startY: 0, active: false });

  if (!open) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { startY: event.clientY, active: true };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dy = Math.max(event.clientY - dragRef.current.startY, 0);
    setOffset(dy);
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
    setDragging(false);
    if (offset > 96) {
      setOffset(0);
      onDismiss();
    } else {
      setOffset(0);
    }
  };

  const fade = Math.max(1 - offset / 280, 0.25);

  return createPortal(
    <div
      className={`swipe-toast ${dragging ? 'is-dragging' : ''} ${className ?? ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelledById}
      style={{ transform: `translate(-50%, ${offset}px)`, opacity: fade }}>
      <div
        className="swipe-toast-grab"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-hidden="true">
        <span className="swipe-toast-bar" />
      </div>
      {children}
    </div>,
    document.body
  );
}

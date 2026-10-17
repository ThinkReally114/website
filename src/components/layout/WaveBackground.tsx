import { useEffect, useRef } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import './WaveBackground.css';

export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let time = 0;
    let last = performance.now();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(width * dpr, 1);
      canvas.height = Math.max(height * dpr, 1);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const dark = document.documentElement.classList.contains('theme-dark');
      const color = dark ? 'rgba(214, 205, 195, 0.075)' : 'rgba(87, 78, 68, 0.07)';
      const lines = 4;
      for (let line = 0; line < lines; line++) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        for (let x = 0; x <= width; x += 2) {
          const y =
            height * 0.52 +
            Math.sin(x * 0.008 + time * 0.02 + line * 1.2) * height * 0.11 +
            Math.sin(x * 0.015 + time * 0.03 + line * 0.8) * height * 0.05 +
            Math.sin(x * 0.003 + time * 0.01 + line * 2) * height * 0.07;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    const loop = (now: number) => {
      time += Math.min((now - last) / 16.67, 3);
      last = now;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduceMotion) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    if (reduceMotion) draw();
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [resolved]);

  return (
    <div className="wave-bg" aria-hidden="true">
      <canvas ref={canvasRef} className="wave-canvas" />
      <div className="wave-noise" />
    </div>
  );
}

import { useEffect, useState } from 'react';

export function useVisibleHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const update = () => {
      if (viewport.scale > 1.01) return;
      const styles = getComputedStyle(document.documentElement);
      const topbar = Number.parseFloat(styles.getPropertyValue('--topbar-h'));
      const dock = Number.parseFloat(styles.getPropertyValue('--dock-space'));
      const chrome = (Number.isFinite(topbar) ? topbar : 0) + (Number.isFinite(dock) ? dock : 0);
      setHeight(Math.max(220, Math.round(viewport.height - chrome)));
    };

    update();
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);

  return height;
}

import { useEffect, useState } from 'react';
import { useTheme, type ResolvedTheme } from '../theme/ThemeProvider';

export interface ChatPalette {
  background: string;
  menuBackground: string;
  color: string;
  sparkColor: string;
}

const FALLBACK: Record<ResolvedTheme, ChatPalette> = {
  dark: { background: '#17140f', menuBackground: '#100e0c', color: '#f4f4f5', sparkColor: '#dfaf58' },
  light: { background: '#ffffff', menuBackground: '#f5f3f0', color: '#1c1917', sparkColor: '#8a5b0d' }
};

function readPalette(resolved: ResolvedTheme): ChatPalette {
  const fallback = FALLBACK[resolved];
  if (typeof window === 'undefined') return fallback;
  const style = window.getComputedStyle(document.documentElement);
  const pick = (name: string, value: string) => style.getPropertyValue(name).trim() || value;
  return {
    background: pick('--bg-soft', fallback.background),
    menuBackground: pick('--bg', fallback.menuBackground),
    color: pick('--text', fallback.color),
    sparkColor: pick('--accent-text', fallback.sparkColor)
  };
}

export function useChatPalette(): ChatPalette {
  const { resolved } = useTheme();
  const [palette, setPalette] = useState(() => readPalette(resolved));

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPalette(readPalette(resolved)));
    return () => cancelAnimationFrame(frame);
  }, [resolved]);

  return palette;
}

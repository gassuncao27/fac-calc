import { useEffect, useState } from 'react';

/**
 * Media query reativa. Usada para escolher entre a grade de títulos
 * (telas largas) e a lista em cartões (tablet/celular) — renderizando
 * apenas uma das duas, em vez de esconder uma com CSS.
 *
 * Compatível com Safari antigo (addListener) e moderno (addEventListener).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => setMatches(e.matches);
    onChange(list);
    if (list.addEventListener) {
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    }
    // Safari < 14
    list.addListener(onChange);
    return () => list.removeListener(onChange);
  }, [query]);

  return matches;
}

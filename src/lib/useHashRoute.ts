import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'student'; seat: number };

function parse(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const m = clean.match(/^s\/(\d+)/);
  if (m) return { name: 'student', seat: parseInt(m[1], 10) };
  return { name: 'home' };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

export function goToStudent(seat: number) {
  window.location.hash = `#/s/${seat}`;
}

export function goHome() {
  if (window.location.hash) {
    history.pushState('', document.title, window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

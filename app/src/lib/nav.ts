/** Sprungziele wie go() der Demo: „stats-score", „book-pt", „news|nw1", „proposal" … */
import { router, type Href } from 'expo-router';

import { useApp } from '@/store/app';
import { useUi, type BookType, type StatTab } from '@/store/ui';

const STACK = new Set(['mybookings', 'notifs', 'profile', 'supps', 'shop', 'rewards', 'challenge', 'nutrition', 'news', 'surveys', 'survey', 'videos', 'recap']);

export function go(target: string) {
  const [s, p] = target.split('|');
  const ui = useUi.getState();
  if (s.startsWith('stats-')) {
    ui.set({ statTab: s.slice(6) as StatTab, sheet: null });
    return router.navigate('/stats');
  }
  if (s.startsWith('book-')) {
    ui.set({ bookType: s.slice(5) as BookType, sheet: null });
    return router.navigate('/book');
  }
  if (s === 'proposal') {
    const pr = useApp.getState().member?.bookings.find((b) => b.status === 'proposed');
    return pr ? ui.openSheet({ t: 'booking', id: pr.id }) : router.navigate('/book');
  }
  if (s === 'home') return router.navigate('/');
  ui.closeSheet();
  if (s === 'news' && p) return router.push(`/news/${p}` as Href);
  if (s === 'article' && p) return router.push(`/article/${p}` as Href);
  if (s === 'exercise' && p) return router.push(`/exercise/${p}` as Href);
  if (STACK.has(s)) return router.push(`/${s}` as Href);
}

/** Buchen-Tab mit Kleingruppe und Tag öffnen. */
export function bookDay(ds: string) {
  useUi.getState().set({ bookType: 'group', day: ds, sheet: null });
  router.navigate('/book');
}

/** Nachbestellen: Produkt in den Warenkorb, Shop öffnen, Warenkorb zeigen. */
export function reorder(pid: string) {
  useApp.getState().reorder(pid);
  useUi.getState().closeSheet();
  router.push('/shop');
  setTimeout(() => useUi.getState().openSheet({ t: 'cart' }), 400);
}

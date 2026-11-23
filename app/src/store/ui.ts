/** Flüchtiger UI-Zustand (entspricht `ui` in der Demo), wird nicht gespeichert. */
import { create } from 'zustand';

import type { MetricKey } from '@/data/types';
import { TISO } from '@/lib/format';

export type SheetState =
  | { t: 'slot'; courseId: string; date: string }
  | { t: 'booking'; id: string }
  | { t: 'cart' }
  | { t: 'svConfirm' }
  | { t: 'badge'; i: number };

export interface PushBanner {
  id: string;
  title: string;
  text: string;
  target?: string;
}

export type StatTab = 'body' | 'ex' | 'checkup' | 'score';
export type BookType = 'group' | 'pt' | 'checkup';

export interface RecapDraft {
  step: number;
  yn: (boolean | null)[];
  sq: number | null;
  en: number | null;
  fo: number | null;
  tr: number | null;
  note: string;
}
export const emptyRecap = (): RecapDraft => ({ step: 0, yn: [null, null, null], sq: null, en: null, fo: null, tr: null, note: '' });

export interface PtDraft {
  coach: string;
  date: string | null;
  time: string | null;
  persons: number;
  note: string;
}
export const emptyPt = (): PtDraft => ({ coach: 'Marc-Luca', date: null, time: null, persons: 1, note: '' });

export interface SlotOptions {
  persons: number;
  series: boolean;
  weeks: number;
}

export interface SurveyDraft {
  times: string[];
  neu: string | null;
  text: string;
}
export const emptySurvey = (): SurveyDraft => ({ times: [], neu: null, text: '' });

interface UiState {
  sheet: SheetState | null;
  toast: { id: number; text: string } | null;
  push: PushBanner | null;
  statTab: StatTab;
  metric: MetricKey;
  bookType: BookType;
  day: string;
  notifTab: 'all' | 'news' | 'me';
  shopCat: string;
  variant: Record<string, string>;
  pt: PtDraft;
  so: SlotOptions;
  rc: RecapDraft;
  sv: SurveyDraft;
  /** Ergebnis des Pflicht-Recaps anzeigen, bevor es zu Home geht */
  gateResult: boolean;
  /** Statusleiste über Foto-Hero (null = passend zum Theme) */
  statusOverride: 'light' | 'dark' | null;
  set: (p: Partial<Omit<UiState, 'set'>>) => void;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
  showToast: (text: string) => void;
}

export const useUi = create<UiState>((set) => ({
  sheet: null,
  toast: null,
  push: null,
  statTab: 'body',
  metric: 'kfa',
  bookType: 'group',
  day: TISO,
  notifTab: 'all',
  shopCat: 'Alle',
  variant: {},
  pt: emptyPt(),
  so: { persons: 1, series: false, weeks: 4 },
  rc: emptyRecap(),
  sv: emptySurvey(),
  gateResult: false,
  statusOverride: null,
  set: (p) => set(p),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  showToast: (text) => set({ toast: { id: Date.now(), text } }),
}));

export const toast = (text: string) => useUi.getState().showToast(text);

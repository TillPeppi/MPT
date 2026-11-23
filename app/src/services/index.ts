import type { MptApi } from './api';
import { mockApi } from './mock';

export type { MptApi, ServerEvent, SlotCount } from './api';

/** Einzige Stelle, an der die Implementierung gewählt wird (später z. B. httpApi). */
export const api: MptApi = mockApi;

import {
  monthKey,
  startOfMonth,
} from '@/utils';
import type { Database } from './db';
import { getIndexes } from './indexes';

/** Total collected (status PAID) against one tenancy for one billing month. */
export function sumCollected(db: Database, tenancyId: string, forMonth: string | Date): number {
  return getIndexes(db).collectedByTenancyMonth.get(tenancyId)?.get(monthKey(forMonth)) ?? 0;
}

/**
 * PAID collections per tenancy per billing month (`monthKey`), for every month
 * in `[from, to]` — one pass over the ledger for a whole property's arrears.
 */
export function loadCollectedByMonth(
  db: Database,
  tenancyIds: string[],
  from: string | Date,
  to: string | Date,
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  const fromKey = monthKey(startOfMonth(from));
  const toKey = monthKey(startOfMonth(to));
  if (tenancyIds.length === 0 || fromKey > toKey) return result;
  const totals = getIndexes(db).collectedByTenancyMonth;
  for (const id of tenancyIds) {
    const months = new Map<string, number>();
    for (const [key, amount] of totals.get(id) ?? []) {
      if (key >= fromKey && key <= toKey) months.set(key, amount);
    }
    if (months.size) result.set(id, months);
  }
  return result;
}

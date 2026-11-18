import type { BestOf } from '../domain/rules'

const BEST_OF = 'shuttle-score:best-of'

/** Format terakhir yang dipilih (best of 1/3). Default best of 3. */
export function lastBestOf(): BestOf {
  try {
    return localStorage.getItem(BEST_OF) === '1' ? 1 : 3
  } catch {
    return 3
  }
}

export function rememberBestOf(bestOf: BestOf): void {
  try {
    localStorage.setItem(BEST_OF, String(bestOf))
  } catch {
    // Penyimpanan diblokir; abaikan.
  }
}

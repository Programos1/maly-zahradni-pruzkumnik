/** Czech plural form: 1 → one, 2–4 → few, 0 / 5+ → many. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

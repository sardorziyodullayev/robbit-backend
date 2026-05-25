export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export function parsePagination(
  page?: number | string,
  limit?: number | string,
): { page: number; limit: number; skip: number; take: number } {
  const p = Math.max(1, Number(page ?? 1) || 1);
  const l = Math.min(100, Math.max(1, Number(limit ?? 20) || 20));
  return { page: p, limit: l, skip: (p - 1) * l, take: l };
}

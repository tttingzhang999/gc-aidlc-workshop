import { PGlite, types } from '@electric-sql/pglite';
import type { Database, Param, Queryable, Row } from './types.js';

interface QueryTarget {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

const toQueryable = (target: QueryTarget): Queryable => ({
  async query<T = Row>(
    sql: string,
    params: readonly Param[] = [],
  ): Promise<T[]> {
    const result = await target.query<T>(
      sql,
      params.map((value) => value ?? null),
    );
    return result.rows;
  },
});

export async function createPgliteDatabase(dataDir: string): Promise<Database> {
  // Keep TIMESTAMP as the raw 'YYYY-MM-DD HH:MM:SS' string, matching the Data API and the old SQLite output.
  const pg = await PGlite.create(dataDir, {
    parsers: { [types.TIMESTAMP]: (value: string) => value },
  });
  return {
    ...toQueryable(pg),
    transaction: <T>(fn: (tx: Queryable) => Promise<T>): Promise<T> =>
      pg.transaction((tx) => fn(toQueryable(tx))),
  };
}

export type Row = Record<string, unknown>;
export type Param = string | number | boolean | null | undefined;

export interface Queryable {
  query<T = Row>(sql: string, params?: readonly Param[]): Promise<T[]>;
}

export interface Database extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

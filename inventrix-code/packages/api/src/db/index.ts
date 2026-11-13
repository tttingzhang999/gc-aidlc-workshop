import type { Database } from './types.js';

export type { Database, Param, Queryable, Row } from './types.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when DB_CLUSTER_ARN is set`);
  return value;
}

async function createDatabase(): Promise<Database> {
  const clusterArn = process.env.DB_CLUSTER_ARN;
  if (clusterArn) {
    const { createDataApiDatabase } = await import('./dataApi.js');
    return createDataApiDatabase({
      resourceArn: clusterArn,
      secretArn: requireEnv('DB_SECRET_ARN'),
      database: requireEnv('DB_NAME'),
    });
  }
  const { createPgliteDatabase } = await import('./pglite.js');
  return createPgliteDatabase(process.env.PGLITE_DATA_DIR ?? '.pglite');
}

let instance: Promise<Database> | undefined;

export function getDb(): Promise<Database> {
  instance ??= createDatabase();
  return instance;
}

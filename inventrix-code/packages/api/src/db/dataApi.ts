import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  DatabaseResumingException,
  ExecuteStatementCommand,
  RDSDataClient,
  RollbackTransactionCommand,
  type Field,
  type SqlParameter,
} from '@aws-sdk/client-rds-data';
import type { Database, Param, Queryable, Row } from './types.js';

// Aurora Serverless v2 at 0 ACU auto-pauses; the first call after a pause fails with
// DatabaseResumingException until the cluster is back (usually ~15s).
const RESUME_RETRY_WINDOW_MS = 25_000;
const RESUME_RETRY_DELAY_MS = 2_000;

export interface DataApiConfig {
  resourceArn: string;
  secretArn: string;
  database: string;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function withResumeRetry<T>(call: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + RESUME_RETRY_WINDOW_MS;
  for (;;) {
    try {
      return await call();
    } catch (error: unknown) {
      if (
        !(error instanceof DatabaseResumingException) ||
        Date.now() >= deadline
      ) {
        throw error;
      }
      await sleep(RESUME_RETRY_DELAY_MS);
    }
  }
}

function toField(value: Param): Field {
  if (value === null || value === undefined) return { isNull: true };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { longValue: value }
      : { doubleValue: value };
  }
  return { stringValue: value };
}

// SQL is written with positional $n placeholders (shared with PGlite); the Data API wants named ones.
const toNamedPlaceholders = (sql: string): string =>
  sql.replace(/\$(\d+)/g, ':p$1');

const toSqlParameters = (params: readonly Param[]): SqlParameter[] =>
  params.map((value, index) => ({
    name: `p${index + 1}`,
    value: toField(value),
  }));

export function createDataApiDatabase(config: DataApiConfig): Database {
  const client = new RDSDataClient({});

  const queryable = (transactionId?: string): Queryable => ({
    async query<T = Row>(
      sql: string,
      params: readonly Param[] = [],
    ): Promise<T[]> {
      const response = await withResumeRetry(() =>
        client.send(
          new ExecuteStatementCommand({
            ...config,
            sql: toNamedPlaceholders(sql),
            parameters: toSqlParameters(params),
            formatRecordsAs: 'JSON',
            transactionId,
          }),
        ),
      );
      return response.formattedRecords
        ? (JSON.parse(response.formattedRecords) as T[])
        : [];
    },
  });

  return {
    ...queryable(),
    async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
      const { transactionId } = await withResumeRetry(() =>
        client.send(new BeginTransactionCommand(config)),
      );
      const { resourceArn, secretArn } = config;
      try {
        const result = await fn(queryable(transactionId));
        await client.send(
          new CommitTransactionCommand({
            resourceArn,
            secretArn,
            transactionId,
          }),
        );
        return result;
      } catch (error: unknown) {
        await client
          .send(
            new RollbackTransactionCommand({
              resourceArn,
              secretArn,
              transactionId,
            }),
          )
          .catch((rollbackError: unknown) =>
            console.error('Transaction rollback failed', rollbackError),
          );
        throw error;
      }
    },
  };
}

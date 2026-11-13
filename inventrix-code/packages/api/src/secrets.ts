import { randomBytes } from 'node:crypto';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const isLambda = (): boolean => Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

async function readSecret(secretArn: string): Promise<string> {
  const client = new SecretsManagerClient({});
  const { SecretString } = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  if (!SecretString) throw new Error(`Secret ${secretArn} has no string value`);
  return SecretString;
}

export async function resolveJwtSecret(): Promise<string> {
  const secretArn = process.env.JWT_SECRET_ARN;
  if (secretArn) return readSecret(secretArn);

  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;

  if (isLambda()) throw new Error('JWT_SECRET_ARN must be set in Lambda');

  console.warn(
    'JWT_SECRET is not set; using a random secret for this local process',
  );
  return randomBytes(32).toString('hex');
}

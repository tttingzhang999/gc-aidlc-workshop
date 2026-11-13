import {
  AuthFlowType,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const ADMIN_GROUP = 'admin';

export type Role = 'admin' | 'customer';

export interface CognitoIdentity {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

interface CognitoConfig {
  userPoolId: string;
  clientId: string;
}

function createVerifier({ userPoolId, clientId }: CognitoConfig) {
  return CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'id' });
}

interface Cognito {
  config: CognitoConfig;
  client: CognitoIdentityProviderClient;
  verifier: ReturnType<typeof createVerifier>;
}

let cognito: Cognito | undefined;

// SignUp and InitiateAuth are public Cognito APIs, so local development needs only these two ids.
export function configureCognito(): void {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) {
    throw new Error('COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set');
  }
  const config = { userPoolId, clientId };
  const region = userPoolId.split('_')[0];
  cognito = {
    config,
    client: new CognitoIdentityProviderClient({ region }),
    verifier: createVerifier(config),
  };
}

function getCognito(): Cognito {
  if (!cognito) throw new Error('Cognito has not been configured');
  return cognito;
}

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  const { client, config } = getCognito();
  await client.send(
    new SignUpCommand({
      ClientId: config.clientId,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: 'name', Value: name }],
    }),
  );
}

export async function signIn(email: string, password: string): Promise<string> {
  const { client, config } = getCognito();
  const { AuthenticationResult, ChallengeName } = await client.send(
    new InitiateAuthCommand({
      ClientId: config.clientId,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
  if (!AuthenticationResult?.IdToken) {
    throw new Error(
      `Cognito sign-in returned no ID token (challenge: ${ChallengeName ?? 'none'})`,
    );
  }
  return AuthenticationResult.IdToken;
}

export async function verifyIdToken(token: string): Promise<CognitoIdentity> {
  const payload = await getCognito().verifier.verify(token);
  const email = payload.email;
  if (typeof email !== 'string') throw new Error('ID token has no email');
  const name = typeof payload.name === 'string' ? payload.name : email;
  const groups = payload['cognito:groups'] ?? [];
  return {
    sub: payload.sub,
    email,
    name,
    role: groups.includes(ADMIN_GROUP) ? 'admin' : 'customer',
  };
}

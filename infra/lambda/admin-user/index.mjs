import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const cognito = new CognitoIdentityProviderClient({});
const secrets = new SecretsManagerClient({});

async function readCredentials(secretArn) {
  const { SecretString } = await secrets.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  if (!SecretString) throw new Error(`Secret ${secretArn} has no string value`);
  const { username, password } = JSON.parse(SecretString);
  if (!username || !password) {
    throw new Error(`Secret ${secretArn} must hold username and password`);
  }
  return { username, password };
}

async function createUser(userPoolId, username) {
  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: username,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: username },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: 'Admin User' },
        ],
      }),
    );
  } catch (error) {
    if (error?.name !== 'UsernameExistsException') throw error;
  }
}

// Creates or refreshes the admin account. Delete leaves the user alone: the user pool is retained.
export const handler = async (event) => {
  const { UserPoolId, SecretArn, GroupName } = event.ResourceProperties;
  if (event.RequestType === 'Delete') {
    return { PhysicalResourceId: event.PhysicalResourceId };
  }

  const { username, password } = await readCredentials(SecretArn);
  await createUser(UserPoolId, username);
  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId,
      Username: username,
      Password: password,
      Permanent: true,
    }),
  );
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId,
      Username: username,
      GroupName,
    }),
  );
  return { PhysicalResourceId: `${UserPoolId}/${username}` };
};

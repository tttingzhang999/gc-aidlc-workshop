import type { CognitoIdentity, Role } from './cognito.js';
import { getDb } from './db/index.js';

export interface AppUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

const sameProfile = (user: AppUser, identity: CognitoIdentity): boolean =>
  user.email === identity.email &&
  user.name === identity.name &&
  user.role === identity.role;

// Orders reference users by integer id, so every Cognito identity keeps a users row keyed by sub.
// Email, name and role mirror the ID token and are rewritten only when they change.
export async function syncUser(identity: CognitoIdentity): Promise<AppUser> {
  const db = await getDb();
  const [existing] = await db.query<AppUser>(
    'SELECT id, email, name, role FROM users WHERE cognito_sub = $1::text',
    [identity.sub],
  );
  if (existing && sameProfile(existing, identity)) return existing;

  const [user] = await db.query<AppUser>(
    `INSERT INTO users (cognito_sub, email, name, role)
     VALUES ($1::text, $2::text, $3::text, $4::text)
     ON CONFLICT (cognito_sub) DO UPDATE
       SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role
     RETURNING id, email, name, role`,
    [identity.sub, identity.email, identity.name, identity.role],
  );
  return user;
}

import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import type { AuthUser } from '../types/index.js';
import { AppError } from '../utils/appError.js';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash?: string;
  created_at: string | Date;
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function mapUser(row: UserRow): AuthUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.display_name),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 * interval '1 day'))`,
    [userId, hashSessionToken(token), env.SESSION_TTL_DAYS],
  );
  return token;
}

export async function register(name: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at`,
      [normalizedEmail, name.trim(), passwordHash],
    );
    const user = mapUser(result.rows[0]!);
    return { user, token: await createSession(user.id) };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_ALREADY_EXISTS');
    }
    throw error;
  }
}

export async function login(email: string, password: string) {
  const result = await pool.query<UserRow>(
    `SELECT id, email, display_name, password_hash, created_at
       FROM users WHERE lower(email) = $1 LIMIT 1`,
    [email.trim().toLowerCase()],
  );
  const row = result.rows[0];
  const valid = row?.password_hash ? await bcrypt.compare(password, row.password_hash) : false;
  if (!row || !valid) throw new AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
  const user = mapUser(row);
  return { user, token: await createSession(user.id) };
}

export async function findUserBySession(token: string): Promise<AuthUser | null> {
  const result = await pool.query<UserRow>(
    `SELECT u.id, u.email, u.display_name, u.created_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
      LIMIT 1`,
    [hashSessionToken(token)],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function logout(token: string): Promise<void> {
  await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashSessionToken(token)]);
}

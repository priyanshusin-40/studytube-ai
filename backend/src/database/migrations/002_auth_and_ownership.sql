-- Additive authentication and ownership schema. Legacy rows remain untouched and
-- inaccessible until explicitly associated with a registered user.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx
  ON users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_active_token_idx
  ON auth_sessions(token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS user_videos (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS user_videos_recent_idx
  ON user_videos(user_id, last_opened_at DESC);
CREATE INDEX IF NOT EXISTS chat_sessions_user_recent_idx
  ON chat_sessions(user_id, updated_at DESC);

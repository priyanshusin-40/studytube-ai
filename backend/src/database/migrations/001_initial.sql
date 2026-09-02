CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id varchar(20) NOT NULL UNIQUE,
  url text NOT NULL,
  title text NOT NULL,
  channel_name text,
  thumbnail_url text,
  transcript_status text NOT NULL DEFAULT 'processing'
    CHECK (transcript_status IN ('processing', 'ready', 'failed')),
  transcript_source text CHECK (transcript_source IN ('captions', 'gemini-audio')),
  chunk_count integer NOT NULL DEFAULT 0,
  embedding_provider text,
  embedding_model text,
  embedding_dimensions integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Keep repeat runs useful for databases created by an earlier StudyTube version.
ALTER TABLE videos ADD COLUMN IF NOT EXISTS embedding_provider text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS embedding_model text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS embedding_dimensions integer;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_source text;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'videos_transcript_source_check' AND conrelid = 'videos'::regclass
  ) THEN
    ALTER TABLE videos ADD CONSTRAINT videos_transcript_source_check
      CHECK (transcript_source IN ('captions', 'gemini-audio'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS transcript_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  text text NOT NULL,
  start_time real NOT NULL,
  end_time real NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS transcript_chunks_video_id_idx ON transcript_chunks(video_id);
CREATE INDEX IF NOT EXISTS transcript_chunks_embedding_hnsw_idx
  ON transcript_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  title varchar(120) NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_video_id_idx ON chat_sessions(video_id);
CREATE INDEX IF NOT EXISTS chat_sessions_updated_at_idx ON chat_sessions(updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_chat_session_idx ON messages(chat_session_id, created_at);

-- DocFlow schema. Safe to re-run (IF NOT EXISTS everywhere).

CREATE TABLE IF NOT EXISTS users (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL,
  email text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL DEFAULT 'Untitled document',
  content    jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  owner_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents (owner_id);

CREATE TABLE IF NOT EXISTS document_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS document_shares_user_idx ON document_shares (user_id);

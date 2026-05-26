const { pool } = require('./pool');

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  compatibility_mode VARCHAR(20) NOT NULL DEFAULT 'BACKWARD'
    CHECK (compatibility_mode IN ('BACKWARD', 'FORWARD', 'FULL', 'NONE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_versions (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  schema_definition JSONB NOT NULL,
  is_deprecated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_id, version)
);

CREATE INDEX IF NOT EXISTS idx_schema_versions_subject
  ON schema_versions(subject_id, version DESC);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(MIGRATION_SQL);
    console.log('Database migrations applied');
  } finally {
    client.release();
  }
}

module.exports = { migrate };

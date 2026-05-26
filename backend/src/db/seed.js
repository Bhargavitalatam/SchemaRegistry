const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function seedFromDirectory(seedDir) {
  if (!fs.existsSync(seedDir)) {
    console.log('No seed directory found, skipping seed');
    return;
  }

  const files = fs
    .readdirSync(seedDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(seedDir, file), 'utf8');
    const entry = JSON.parse(raw);
    const { subject, compatibility_mode, schema, version: explicitVersion } = entry;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let subjectRow = await client.query(
        'SELECT id, compatibility_mode FROM subjects WHERE name = $1',
        [subject]
      );

      if (subjectRow.rows.length === 0) {
        subjectRow = await client.query(
          `INSERT INTO subjects (name, compatibility_mode)
           VALUES ($1, $2) RETURNING id, compatibility_mode`,
          [subject, compatibility_mode || 'BACKWARD']
        );
      }

      const subjectId = subjectRow.rows[0].id;
      const versionRes = await client.query(
        `SELECT COALESCE(MAX(version), 0) AS max_version
         FROM schema_versions WHERE subject_id = $1`,
        [subjectId]
      );
      const nextVersion =
        explicitVersion != null
          ? parseInt(explicitVersion, 10)
          : versionRes.rows[0].max_version + 1;

      const insert = await client.query(
        `INSERT INTO schema_versions (subject_id, version, schema_definition)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (subject_id, version) DO NOTHING
         RETURNING version`,
        [subjectId, nextVersion, JSON.stringify(schema)]
      );

      await client.query('COMMIT');
      if (insert.rows.length > 0) {
        console.log(`Seeded ${subject} v${nextVersion} from ${file}`);
      } else {
        console.log(`Seed skipped (exists): ${subject} v${nextVersion}`);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = { seedFromDirectory };

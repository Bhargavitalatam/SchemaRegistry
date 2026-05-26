const { pool } = require('../db/pool');
const { checkCompatibility } = require('../compatibility/checker');

async function getSubjectByName(name) {
  const { rows } = await pool.query(
    'SELECT id, name, compatibility_mode, created_at FROM subjects WHERE name = $1',
    [name]
  );
  return rows[0] || null;
}

async function listSubjects() {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.compatibility_mode, s.created_at,
            COUNT(sv.id) FILTER (WHERE NOT sv.is_deprecated) AS version_count,
            MAX(sv.version) FILTER (WHERE NOT sv.is_deprecated) AS latest_version
     FROM subjects s
     LEFT JOIN schema_versions sv ON sv.subject_id = s.id
     GROUP BY s.id
     ORDER BY s.name`
  );
  return rows;
}

async function getLatestSchema(subjectName, includeDeprecated = false) {
  const deprecatedClause = includeDeprecated ? '' : 'AND NOT sv.is_deprecated';
  const { rows } = await pool.query(
    `SELECT sv.id, sv.version, sv.schema_definition, sv.is_deprecated, sv.created_at,
            s.name AS subject, s.compatibility_mode
     FROM schema_versions sv
     JOIN subjects s ON s.id = sv.subject_id
     WHERE s.name = $1 ${deprecatedClause}
     ORDER BY sv.version DESC
     LIMIT 1`,
    [subjectName]
  );
  return rows[0] || null;
}

async function getSchemaVersion(subjectName, version) {
  const { rows } = await pool.query(
    `SELECT sv.id, sv.version, sv.schema_definition, sv.is_deprecated, sv.created_at,
            s.name AS subject, s.compatibility_mode
     FROM schema_versions sv
     JOIN subjects s ON s.id = sv.subject_id
     WHERE s.name = $1 AND sv.version = $2`,
    [subjectName, version]
  );
  return rows[0] || null;
}

async function listVersions(subjectName) {
  const { rows } = await pool.query(
    `SELECT sv.version, sv.is_deprecated, sv.created_at
     FROM schema_versions sv
     JOIN subjects s ON s.id = sv.subject_id
     WHERE s.name = $1
     ORDER BY sv.version ASC`,
    [subjectName]
  );
  return rows;
}

async function updateCompatibilityMode(subjectName, mode) {
  const valid = ['BACKWARD', 'FORWARD', 'FULL', 'NONE'];
  const normalized = (mode || '').toUpperCase();
  if (!valid.includes(normalized)) {
    const err = new Error(`Invalid compatibility mode. Must be one of: ${valid.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `UPDATE subjects SET compatibility_mode = $2
     WHERE name = $1
     RETURNING id, name, compatibility_mode, created_at`,
    [subjectName, normalized]
  );
  if (rows.length === 0) {
    const err = new Error(`Subject "${subjectName}" not found`);
    err.status = 404;
    throw err;
  }
  return rows[0];
}

async function registerSchema(subjectName, schemaDefinition, options = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let subject = await client.query(
      'SELECT id, name, compatibility_mode FROM subjects WHERE name = $1 FOR UPDATE',
      [subjectName]
    );

    if (subject.rows.length === 0) {
      subject = await client.query(
        `INSERT INTO subjects (name, compatibility_mode)
         VALUES ($1, 'BACKWARD') RETURNING id, name, compatibility_mode`,
        [subjectName]
      );
    }

    const subjectRow = subject.rows[0];
    const mode = options.compatibilityMode || subjectRow.compatibility_mode;

    const maxVersionRes = await client.query(
      `SELECT COALESCE(MAX(version), 0) AS max_version
       FROM schema_versions WHERE subject_id = $1`,
      [subjectRow.id]
    );
    const newVersion = maxVersionRes.rows[0].max_version + 1;

    const latestActive = await client.query(
      `SELECT version, schema_definition FROM schema_versions
       WHERE subject_id = $1 AND NOT is_deprecated
       ORDER BY version DESC LIMIT 1`,
      [subjectRow.id]
    );

    if (latestActive.rows.length > 0) {
      const latestRow = latestActive.rows[0];
      const result = checkCompatibility(
        latestRow.schema_definition,
        schemaDefinition,
        mode
      );

      if (!result.compatible) {
        const err = new Error('Schema is not compatible');
        err.status = 409;
        err.details = result;
        throw err;
      }
    }

    const insert = await client.query(
      `INSERT INTO schema_versions (subject_id, version, schema_definition)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, version, schema_definition, is_deprecated, created_at`,
      [subjectRow.id, newVersion, JSON.stringify(schemaDefinition)]
    );

    await client.query('COMMIT');

    return {
      subject: subjectRow.name,
      compatibility_mode: subjectRow.compatibility_mode,
      ...insert.rows[0],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deprecateVersion(subjectName, version) {
  const { rows } = await pool.query(
    `UPDATE schema_versions sv
     SET is_deprecated = true
     FROM subjects s
     WHERE sv.subject_id = s.id AND s.name = $1 AND sv.version = $2
     RETURNING sv.id, sv.version, sv.is_deprecated`,
    [subjectName, version]
  );
  return rows[0] || null;
}

async function checkCandidateCompatibility(subjectName, candidateSchema) {
  const subject = await getSubjectByName(subjectName);
  if (!subject) {
    const err = new Error(`Subject "${subjectName}" not found`);
    err.status = 404;
    throw err;
  }

  const latest = await getLatestSchema(subjectName);
  if (!latest) {
    const err = new Error(`No schema versions found for subject "${subjectName}"`);
    err.status = 404;
    throw err;
  }

  const result = checkCompatibility(
    latest.schema_definition,
    candidateSchema,
    subject.compatibility_mode
  );

  return { is_compatible: result.compatible };
}

async function checkVersionCompatibility(subjectName, baseVersion, targetVersion, modeOverride) {
  const base = await getSchemaVersion(subjectName, baseVersion);
  const target = await getSchemaVersion(subjectName, targetVersion);

  if (!base || !target) {
    const err = new Error('One or both schema versions not found');
    err.status = 404;
    throw err;
  }

  const subject = await getSubjectByName(subjectName);
  const mode = modeOverride || subject.compatibility_mode;

  const result = checkCompatibility(
    base.schema_definition,
    target.schema_definition,
    mode
  );

  return {
    subject: subjectName,
    baseVersion,
    targetVersion,
    mode,
    ...result,
  };
}

module.exports = {
  getSubjectByName,
  listSubjects,
  getLatestSchema,
  getSchemaVersion,
  listVersions,
  updateCompatibilityMode,
  registerSchema,
  deprecateVersion,
  checkVersionCompatibility,
  checkCandidateCompatibility,
};

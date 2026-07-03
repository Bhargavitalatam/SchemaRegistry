const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const dbConnectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PG_URL ||
  (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE
    ? `postgres://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE}`
    : undefined);

if (!dbConnectionString) {
  console.warn('DATABASE_URL is not set yet; the app will retry until the database is available.');
}

const pool = new Pool({
  connectionString: dbConnectionString,
  max: 10,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

module.exports = { pool };

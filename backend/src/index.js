require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { migrate } = require('./db/migrate');
const { seedFromDirectory } = require('./db/seed');
const { pool } = require('./db/pool');
const schemasRouter = require('./routes/schemas');
const validateRouter = require('./routes/validate');

const app = express();
const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'schema-registry-api' });
  } catch {
    res.status(503).json({ status: 'error', service: 'schema-registry-api' });
  }
});

app.use('/api/schemas', schemasRouter);
app.use('/api/validate', validateRouter);
app.use('/schemas', schemasRouter);
app.use('/validate', validateRouter);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const body = {
    error: err.message || 'Internal server error',
  };
  if (err.details) body.details = err.details;
  if (status >= 500) console.error(err);
  res.status(status).json(body);
});

async function start() {
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await migrate();
      break;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const seedDir = process.env.SEED_DIR || '/app/seeds';
  await seedFromDirectory(seedDir);

  app.listen(PORT, () => {
    console.log(`Schema Registry API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

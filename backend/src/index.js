require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { migrate } = require('./db/migrate');
const { seedFromDirectory } = require('./db/seed');
const { pool } = require('./db/pool');
const schemasRouter = require('./routes/schemas');
const validateRouter = require('./routes/validate');

const app = express();
const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);
const frontendDistPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const hasFrontendBuild = fs.existsSync(frontendDistPath);

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

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
}

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/schemas') || req.path.startsWith('/validate') || req.path === '/health') {
    return next();
  }

  if (hasFrontendBuild) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
    return;
  }

  res.status(404).send('Frontend build not found');
});

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
  const maxRetries = parseInt(process.env.DB_STARTUP_RETRIES || '120', 10);
  const retryDelayMs = parseInt(process.env.DB_STARTUP_RETRY_DELAY_MS || '3000', 10);
  for (let i = 0; i < maxRetries; i++) {
    try {
      await migrate();
      break;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  const seedDir = process.env.SEED_DIR || path.resolve(__dirname, '..', '..', 'seeds');
  await seedFromDirectory(seedDir);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Schema Registry API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

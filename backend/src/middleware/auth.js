function requireApiKey(req, res, next) {
  const configuredKey = process.env.API_KEY;
  if (!configuredKey) {
    return res.status(500).json({
      error: 'Server misconfiguration: API_KEY is not set',
    });
  }

  const provided = req.headers['x-api-key'];
  if (!provided || provided !== configuredKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
}

module.exports = { requireApiKey };

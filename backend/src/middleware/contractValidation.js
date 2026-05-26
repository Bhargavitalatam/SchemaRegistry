const schemaService = require('../services/schemaService');
const { validatePayload } = require('../services/validationService');

/**
 * Fetches the latest schema for :subject and validates req.body against it.
 */
async function contractValidationMiddleware(req, res, next) {
  try {
    const { subject } = req.params;
    const schemaRow = await schemaService.getLatestSchema(subject);

    if (!schemaRow) {
      return res.status(404).json({ error: `Schema subject "${subject}" not found` });
    }

    const result = validatePayload(schemaRow.schema_definition, req.body);

    if (!result.isValid) {
      return res.status(400).json({
        status: 'invalid',
        errors: result.errors,
      });
    }

    req.schemaVersion = schemaRow.version;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { contractValidationMiddleware };

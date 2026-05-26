const express = require('express');
const schemaService = require('../services/schemaService');
const { validatePayload } = require('../services/validationService');
const { requireApiKey } = require('../middleware/auth');

const router = express.Router();

router.get('/subjects', async (req, res, next) => {
  try {
    const subjects = await schemaService.listSubjects();
    res.json({ subjects });
  } catch (err) {
    next(err);
  }
});

router.get('/config/:subject', async (req, res, next) => {
  try {
    const subject = await schemaService.getSubjectByName(req.params.subject);
    if (!subject) {
      return res.status(404).json({ error: `Subject "${req.params.subject}" not found` });
    }
    res.json({
      subject: subject.name,
      compatibility_mode: subject.compatibility_mode,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/config/:subject', requireApiKey, async (req, res, next) => {
  try {
    const mode = req.body.compatibility_mode || req.body.compatibilityMode;
    const updated = await schemaService.updateCompatibilityMode(
      req.params.subject,
      mode
    );
    res.json({
      subject: updated.name,
      compatibility_mode: updated.compatibility_mode,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:subject/versions', async (req, res, next) => {
  try {
    const subject = await schemaService.getSubjectByName(req.params.subject);
    if (!subject) {
      return res.status(404).json({ error: `Subject "${req.params.subject}" not found` });
    }
    const versionRows = await schemaService.listVersions(req.params.subject);
    res.json({ versions: versionRows.map((row) => row.version) });
  } catch (err) {
    next(err);
  }
});

router.get('/:subject/versions/:version', async (req, res, next) => {
  try {
    const version = parseInt(req.params.version, 10);
    const schema = await schemaService.getSchemaVersion(req.params.subject, version);
    if (!schema) {
      return res.status(404).json({ error: 'Schema version not found' });
    }
    res.json({
      subject: schema.subject,
      version: schema.version,
      schema: schema.schema_definition,
      is_deprecated: schema.is_deprecated,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:subject', async (req, res, next) => {
  try {
    const schema = await schemaService.getLatestSchema(req.params.subject);
    if (!schema) {
      return res.status(404).json({ error: `Subject "${req.params.subject}" not found` });
    }
    res.json({
      subject: schema.subject,
      version: schema.version,
      schema: schema.schema_definition,
      compatibility_mode: schema.compatibility_mode,
      is_deprecated: schema.is_deprecated,
      created_at: schema.created_at,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:subject', requireApiKey, async (req, res, next) => {
  try {
    const schemaDefinition = req.body.schema || req.body;
    if (!schemaDefinition || typeof schemaDefinition !== 'object') {
      return res.status(400).json({ error: 'Request body must contain a JSON schema object' });
    }

    const registered = await schemaService.registerSchema(
      req.params.subject,
      schemaDefinition,
      {
        compatibilityMode: req.body.compatibility_mode,
      }
    );

    res.status(201).json({
      subject: registered.subject,
      version: registered.version,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:subject/versions/:version', requireApiKey, async (req, res, next) => {
  try {
    const version = parseInt(req.params.version, 10);
    const result = await schemaService.deprecateVersion(req.params.subject, version);
    if (!result) {
      return res.status(404).json({ error: 'Schema version not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:subject/compatibility', async (req, res, next) => {
  try {
    const candidateSchema = req.body.schema;
    if (candidateSchema && typeof candidateSchema === 'object') {
      const result = await schemaService.checkCandidateCompatibility(
        req.params.subject,
        candidateSchema
      );
      return res.json({ is_compatible: result.is_compatible });
    }

    const baseVersion = parseInt(
      req.body.base_version ?? req.body.baseVersion ?? req.query.base_version,
      10
    );
    const targetVersion = parseInt(
      req.body.target_version ??
        req.body.targetVersion ??
        req.body.version ??
        req.query.version,
      10
    );

    if (Number.isNaN(baseVersion) || Number.isNaN(targetVersion)) {
      return res.status(400).json({
        error: 'Provide schema in body or base_version and target_version integers',
      });
    }

    const mode = req.body.mode || req.body.compatibility_mode;
    const result = await schemaService.checkVersionCompatibility(
      req.params.subject,
      baseVersion,
      targetVersion,
      mode
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

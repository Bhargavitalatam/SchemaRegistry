const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function validatePayload(schemaDefinition, payload) {
  const validate = ajv.compile(schemaDefinition);
  const valid = validate(payload);

  if (valid) {
    return { isValid: true, errors: [] };
  }

  const errors = (validate.errors || []).map((err) => ({
    field: toFieldPath(err.instancePath, err.params?.missingProperty),
    message: err.message || 'is invalid',
  }));

  return { isValid: false, errors };
}

function toFieldPath(instancePath, missingProperty) {
  if (missingProperty) {
    const base = (instancePath || '').replace(/^\//, '').replace(/\//g, '.');
    return base ? `${base}.${missingProperty}` : missingProperty;
  }
  if (!instancePath || instancePath === '/') {
    return 'root';
  }
  return instancePath.replace(/^\//, '').replace(/\//g, '.');
}

module.exports = { validatePayload };

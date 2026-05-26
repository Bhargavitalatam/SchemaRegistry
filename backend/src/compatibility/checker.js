const { flattenSchema, NUMERIC_TYPES } = require('./flatten');

/**
 * Compatible type transitions when reading with the newer definition.
 */
function isTypeCompatible(oldType, newType) {
  if (oldType === newType) return true;
  if (NUMERIC_TYPES.has(oldType) && NUMERIC_TYPES.has(newType)) return true;
  return false;
}

function isFieldOptional(field) {
  return !field.isRequired || field.hasDefault;
}

/**
 * BACKWARD: schema_new can read data written with schema_old.
 * - No fields removed from old
 * - Compatible type changes on shared fields
 * - New fields must be optional (not required without default)
 */
function isBackwardCompatible(schemaOld, schemaNew) {
  const oldFields = flattenSchema(schemaOld);
  const newFields = flattenSchema(schemaNew);
  const errors = [];

  for (const [path, oldField] of Object.entries(oldFields)) {
    if (!newFields[path]) {
      errors.push(`Field removed: "${path}"`);
      continue;
    }
    const newField = newFields[path];
    if (!isTypeCompatible(oldField.type, newField.type)) {
      errors.push(
        `Incompatible type change for "${path}": ${oldField.type} -> ${newField.type}`
      );
    }
    if (oldField.isRequired && !newField.isRequired && !newField.hasDefault) {
      /* required -> optional is OK for backward */
    }
    if (oldField.isRequired && newField.isRequired && oldField.type !== newField.type) {
      /* already caught by type check */
    }
  }

  for (const [path, newField] of Object.entries(newFields)) {
    if (oldFields[path]) continue;
    if (newField.isRequired && !newField.hasDefault) {
      errors.push(
        `New field "${path}" must be optional or have a default for backward compatibility`
      );
    }
  }

  return { compatible: errors.length === 0, errors, mode: 'BACKWARD' };
}

/**
 * FORWARD: schema_old can read data written with schema_new.
 * - Fields may be removed in new (old ignores extras in schema)
 * - Every field added in new must have a default
 */
function isForwardCompatible(schemaOld, schemaNew) {
  const oldFields = flattenSchema(schemaOld);
  const newFields = flattenSchema(schemaNew);
  const errors = [];

  for (const [path, oldField] of Object.entries(oldFields)) {
    if (!newFields[path] && oldField.isRequired) {
      errors.push(
        `Required field "${path}" was removed; forward compatibility requires it in the new schema or optional in old`
      );
    }
    if (newFields[path]) {
      const newField = newFields[path];
      if (!isTypeCompatible(oldField.type, newField.type)) {
        errors.push(
          `Incompatible type change for "${path}": ${oldField.type} -> ${newField.type}`
        );
      }
    }
  }

  for (const [path, newField] of Object.entries(newFields)) {
    if (oldFields[path]) continue;
    if (!newField.hasDefault) {
      errors.push(
        `New field "${path}" must have a default value for forward compatibility`
      );
    }
  }

  return { compatible: errors.length === 0, errors, mode: 'FORWARD' };
}

function isFullCompatible(schemaOld, schemaNew) {
  const backward = isBackwardCompatible(schemaOld, schemaNew);
  const forward = isForwardCompatible(schemaOld, schemaNew);
  const errors = [...backward.errors, ...forward.errors];
  return {
    compatible: backward.compatible && forward.compatible,
    errors,
    mode: 'FULL',
    backward,
    forward,
  };
}

function checkCompatibility(schemaOld, schemaNew, mode) {
  const normalized = (mode || 'BACKWARD').toUpperCase();
  switch (normalized) {
    case 'NONE':
      return { compatible: true, errors: [], mode: 'NONE' };
    case 'FORWARD':
      return isForwardCompatible(schemaOld, schemaNew);
    case 'FULL':
      return isFullCompatible(schemaOld, schemaNew);
    case 'BACKWARD':
    default:
      return isBackwardCompatible(schemaOld, schemaNew);
  }
}

module.exports = {
  isBackwardCompatible,
  isForwardCompatible,
  isFullCompatible,
  checkCompatibility,
  flattenSchema,
};

/**
 * Flattens a JSON Schema into a map of dot-path -> field metadata.
 * Handles nested objects via properties.
 */

const NUMERIC_TYPES = new Set(['integer', 'number']);

function resolveType(prop) {
  if (prop.type) {
    if (Array.isArray(prop.type)) {
      return prop.type.filter((t) => t !== 'null')[0] || 'string';
    }
    return prop.type;
  }
  if (prop.properties) return 'object';
  if (prop.items) return 'array';
  if (prop.enum) return 'string';
  return 'string';
}

function flattenSchema(schema, prefix = '', parentRequired = []) {
  const fields = {};

  if (!schema || typeof schema !== 'object') {
    return fields;
  }

  const root = schema.properties ? schema : { type: 'object', properties: schema.properties || {}, required: schema.required };
  const properties = root.properties || {};
  const requiredSet = new Set([...parentRequired, ...(root.required || [])]);

  for (const [key, propSchema] of Object.entries(properties)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const isDirectObject =
      propSchema &&
      typeof propSchema === 'object' &&
      propSchema.properties &&
      !propSchema.type;

    if (
      propSchema &&
      typeof propSchema === 'object' &&
      (propSchema.type === 'object' || isDirectObject) &&
      propSchema.properties
    ) {
      const nestedRequired = (propSchema.required || []).map((r) => `${path}.${r}`);
      Object.assign(fields, flattenSchema(propSchema, path, nestedRequired));
      continue;
    }

    const hasDefault = Object.prototype.hasOwnProperty.call(propSchema, 'default');
    fields[path] = {
      type: resolveType(propSchema),
      isRequired: requiredSet.has(key) || requiredSet.has(path),
      hasDefault,
      defaultValue: propSchema.default,
    };
  }

  return fields;
}

module.exports = { flattenSchema, NUMERIC_TYPES };

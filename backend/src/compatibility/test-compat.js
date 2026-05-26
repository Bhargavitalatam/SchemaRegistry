const {
  isBackwardCompatible,
  isForwardCompatible,
  isFullCompatible,
} = require('./checker');

const v1 = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
};

const v2Ok = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    tier: { type: 'string', default: 'free' },
  },
};

const v2Bad = {
  type: 'object',
  required: ['id', 'tier'],
  properties: {
    id: { type: 'string' },
    tier: { type: 'string' },
  },
};

const backwardOk = isBackwardCompatible(v1, v2Ok);
const backwardBad = isBackwardCompatible(v1, v2Bad);
const forwardOk = isForwardCompatible(v1, v2Ok);
const fullOk = isFullCompatible(v1, v2Ok);

console.log('backward v2Ok', backwardOk.compatible, backwardOk.errors);
console.log('backward v2Bad', backwardBad.compatible, backwardBad.errors);
console.log('forward v2Ok', forwardOk.compatible, forwardOk.errors);
console.log('full v2Ok', fullOk.compatible, fullOk.errors);

if (!backwardOk.compatible || backwardBad.compatible || !forwardOk.compatible || !fullOk.compatible) {
  process.exit(1);
}
console.log('All compatibility tests passed');

const express = require('express');
const { contractValidationMiddleware } = require('../middleware/contractValidation');

const router = express.Router();

router.post('/:subject', contractValidationMiddleware, (req, res) => {
  res.json({ status: 'valid' });
});

module.exports = router;

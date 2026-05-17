const { timingSafeEqual } = require('crypto');
const { config } = require('../../config/config');

const authorizeRequest = async (req, res, next) => {
  const apiKey = req.get('x-api-key');
  const expected = Buffer.from(config.apiKey);
  const provided = apiKey ? Buffer.from(apiKey) : null;
  if (!provided || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    res.status(401).json({"error": "Unauthorized"});
    return;
  }
  next();
}

exports.authorizeRequest = authorizeRequest;

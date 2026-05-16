const { config } = require('../../config/config');

const authorizeRequest = async (req, res, next) => {
  const apiKey = req.get('x-api-key');
  if (!apiKey || config.apiKey !== apiKey) {
    res.status(401).json({"error": "Unauthorized"});
    return;
  }
  next();
}

exports.authorizeRequest = authorizeRequest;

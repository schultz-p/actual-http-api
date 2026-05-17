const { authorizeRequest } = require('../../../src/v1/middlewares/api-key-authorization');
const { config } = require('../../../src/config/config');

describe('API Key Authorization Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      get: jest.fn(),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authorizeRequest', () => {
    it('should call next() if API key matches', async () => {
      config.apiKey = 'valid-key';
      req.get.mockReturnValue('valid-key');

      await authorizeRequest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if API key is invalid', async () => {
      config.apiKey = 'valid-key';
      req.get.mockReturnValue('invalid-key');

      await authorizeRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if API key is missing', async () => {
      config.apiKey = 'valid-key';
      req.get.mockReturnValue(null);

      await authorizeRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

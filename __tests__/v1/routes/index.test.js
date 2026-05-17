const request = require('supertest');
const express = require('express');

const budgetModule = require('../../../src/v1/budget');
const apiKeyModule = require('../../../src/v1/middlewares/api-key-authorization');
const errorHandlerModule = require('../../../src/v1/middlewares/error-handler');
const router = require('../../../src/v1/routes/index');

describe('index.js router', () => {
  let mockBudget, mockAuthorizeRequest, mockErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBudget = vi.spyOn(budgetModule, 'Budget');
    mockAuthorizeRequest = vi.spyOn(apiKeyModule, 'authorizeRequest').mockImplementation((req, res, next) => next());
    mockErrorHandler = vi.spyOn(errorHandlerModule, 'errorHandler').mockImplementation((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use(router);
    return app;
  }

  it('budget middleware loads budget into res.locals', async () => {
    mockBudget.mockResolvedValue({ ok: true });

    const app = createApp();

    const res = await request(app)
      .get('/budgets/abc123/accounts')
      .set('budget-encryption-password', 'pw123');

    expect(mockBudget).toHaveBeenCalledWith('abc123', 'pw123');
  });

  it('authorizeRequest is called for every request', async () => {
    mockBudget.mockResolvedValue({ ok: true });

    const app = createApp();

    await request(app).get('/budgets/abc123/accounts');
    expect(mockAuthorizeRequest).toHaveBeenCalled();
  });

  it('authorizeRequest is called for /budgets listing route', async () => {
    const app = createApp();
    await request(app).get('/budgets');
    expect(mockAuthorizeRequest).toHaveBeenCalled();
  });

  it('error pipeline works when Budget throws', async () => {
    mockBudget.mockRejectedValue(new Error('Boom!'));

    const app = createApp();

    const res = await request(app)
      .get('/budgets/xyz/accounts');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Boom!' });
  });
});

const request = require('supertest');
const express = require('express');

let router;
let mockAuthorizeRequest;

describe('index.js router', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/src/')) delete require.cache[key];
    });

    // Spy on actual-client-provider so settings.js's GET /budgets handler doesn't
    // try to connect to a real server when that route is exercised.
    const providerMod = require('../../../src/v1/actual-client-provider');
    vi.spyOn(providerMod, 'getActualApiClient').mockResolvedValue({
      getBudgets: vi.fn().mockResolvedValue([]),
    });

    // Spy on Budget so the router's budget middleware uses a mock.
    const budgetMod = require('../../../src/v1/budget');
    vi.spyOn(budgetMod, 'Budget').mockResolvedValue({ ok: true });

    // Spy on authorizeRequest so all routes pass auth.
    const authMod = require('../../../src/v1/middlewares/api-key-authorization');
    mockAuthorizeRequest = vi.spyOn(authMod, 'authorizeRequest')
      .mockImplementation((req, res, next) => next());

    // Spy on errorHandler so errors return a predictable 500 response.
    const errMod = require('../../../src/v1/middlewares/error-handler');
    vi.spyOn(errMod, 'errorHandler').mockImplementation((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });

    // Load the router last so it picks up all the spied exports from ViteNode's cache.
    router = require('../../../src/v1/routes/index');
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
    const { Budget } = require('../../../src/v1/budget');
    Budget.mockResolvedValue({ ok: true });

    const app = createApp();

    const res = await request(app)
      .get('/budgets/abc123/accounts')
      .set('budget-encryption-password', 'pw123');

    expect(Budget).toHaveBeenCalledWith('abc123', 'pw123');
  });

  it('authorizeRequest is called for every request', async () => {
    const { Budget } = require('../../../src/v1/budget');
    Budget.mockResolvedValue({ ok: true });

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
    const { Budget } = require('../../../src/v1/budget');
    Budget.mockRejectedValue(new Error('Boom!'));

    const app = createApp();

    const res = await request(app)
      .get('/budgets/xyz/accounts');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Boom!' });
  });
});

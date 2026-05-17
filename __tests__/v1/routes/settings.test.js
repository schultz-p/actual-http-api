const actualClientProvider = require('../../../src/v1/actual-client-provider');
const { createMockRouter, createMockReqRes } = require('../../helpers/route-test-helpers');

describe('Settings Routes', () => {
  let mockRouter;
  let mockBudget;
  let mockReq;
  let mockRes;
  let mockNext;
  let handlers;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBudget = {
      getSettings: vi.fn().mockResolvedValue({ locale: 'en-US', maxMonthsOfHistory: 24 }),
      exportBudget: vi.fn().mockResolvedValue('exported-data'),
    };

    ({ router: mockRouter, handlers } = createMockRouter());
    ({ mockReq, mockRes, mockNext } = createMockReqRes(mockBudget));
    mockRes.setHeader = vi.fn().mockReturnThis();
    mockRes.end = vi.fn();

    const settingsModule = require('../../../src/v1/routes/settings');
    settingsModule(mockRouter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /budgets', () => {
    it('should register the routes', () => {
      expect(mockRouter.get).toHaveBeenCalledWith('/budgets', expect.any(Function));
    });

    it('should use server instance', async () => {
      const handler = handlers['GET /budgets'];
      const getBudgets = vi.fn().mockResolvedValue([{ id: 'server-budget' }]);
      vi.spyOn(actualClientProvider, 'getActualApiClient').mockResolvedValue({ getBudgets });

      await handler(mockReq, mockRes, mockNext);

      expect(getBudgets).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        data: [{ id: 'server-budget' }],
      });
    });

    it('should handle errors from getSettings', async () => {
      const handler = handlers['GET /budgets'];
      const error = new Error('boom');
      const getBudgets = vi.fn().mockRejectedValue(error);
      vi.spyOn(actualClientProvider, 'getActualApiClient').mockResolvedValue({ getBudgets });

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /actualhttpapiversion', () => {
    it('should register the route', () => {
      expect(mockRouter.get).toHaveBeenCalledWith('/actualhttpapiversion', expect.any(Function));
    });

    it('should return the package version', async () => {
      const handler = handlers['GET /actualhttpapiversion'];
      const pkg = require('../../../package.json');

      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ data: { version: pkg.version } });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when res.json throws', async () => {
      const handler = handlers['GET /actualhttpapiversion'];
      const error = new Error('serialization error');
      mockRes.json.mockImplementationOnce(() => { throw error; });

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /budgets/:budgetSyncId/actualserverversion', () => {
    it('should register the route', () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/actualserverversion',
        expect.any(Function)
      );
    });

    it('should return the server version', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/actualserverversion'];
      mockBudget.getServerVersion = vi.fn().mockResolvedValue({ version: '26.5.0' });

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getServerVersion).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ data: { version: '26.5.0' } });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with an error when response contains an error field', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/actualserverversion'];
      mockBudget.getServerVersion = vi.fn().mockResolvedValue({ error: 'server unavailable' });

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('server unavailable') })
      );
    });

    it('should call next with an error when getServerVersion throws', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/actualserverversion'];
      const error = new Error('connection refused');
      mockBudget.getServerVersion = vi.fn().mockRejectedValue(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /budgets/:budgetSyncId/export', () => {
    it('should register the route', () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/export',
        expect.any(Function)
      );
    });

    it('should export budget data', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/export'];
      mockBudget.exportData = vi.fn().mockResolvedValueOnce({
        fileName: 'budget.zip',
        fileStream: {
          pipe: vi.fn().mockReturnThis(),
          finalize: vi.fn(),
          on: vi.fn(),
        },
      });

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.exportData).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });

    it('should handle errors from exportBudget', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/export'];
      const error = new Error('Export failed');
      mockBudget.exportData = vi.fn().mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should set correct headers for file download', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/export'];
      mockBudget.exportData = vi.fn().mockResolvedValueOnce({
        fileName: 'budget.zip',
        fileStream: {
          pipe: vi.fn().mockReturnThis(),
          finalize: vi.fn(),
          on: vi.fn(),
        },
      });

      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/zip'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment')
      );
    });

    it('should return 501 when experimental operations are disabled', async () => {
      const configModule = require('../../../src/config/config');

      const original = configModule.config.experimentalOperationsEnabled;
      configModule.config.experimentalOperationsEnabled = false;

      const handler = handlers['GET /budgets/:budgetSyncId/export'];
      await handler(mockReq, mockRes, mockNext);

      configModule.config.experimentalOperationsEnabled = original;

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should send 500 via fileStream error callback when headers are not sent', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/export'];
      let errorCallback;
      const mockFileStream = {
        pipe: vi.fn().mockReturnThis(),
        finalize: vi.fn(),
        on: vi.fn((event, cb) => { if (event === 'error') errorCallback = cb; }),
      };
      mockBudget.exportData = vi.fn().mockResolvedValueOnce({
        fileName: 'budget.zip',
        fileStream: mockFileStream,
      });
      mockRes.headersSent = false;
      mockRes.send = vi.fn();

      await handler(mockReq, mockRes, mockNext);
      errorCallback(new Error('zip failed'));

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Failed to generate zip');
    });

    it('should not send 500 via fileStream error callback when headers are already sent', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/export'];
      let errorCallback;
      const mockFileStream = {
        pipe: vi.fn().mockReturnThis(),
        finalize: vi.fn(),
        on: vi.fn((event, cb) => { if (event === 'error') errorCallback = cb; }),
      };
      mockBudget.exportData = vi.fn().mockResolvedValueOnce({
        fileName: 'budget.zip',
        fileStream: mockFileStream,
      });
      mockRes.headersSent = true;
      mockRes.send = vi.fn();

      await handler(mockReq, mockRes, mockNext);
      errorCallback(new Error('zip failed'));

      expect(mockRes.status).not.toHaveBeenCalledWith(500);
      expect(mockRes.send).not.toHaveBeenCalled();
    });
  });
});

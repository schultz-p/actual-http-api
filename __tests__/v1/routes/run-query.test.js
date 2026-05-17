const { createMockRouter, createMockReqRes } = require('../../helpers/route-test-helpers');

describe('Run Query Routes', () => {
  let mockRouter;
  let mockBudget;
  let mockReq;
  let mockRes;
  let mockNext;
  let handlers;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    const mockQuery = {
      filter: vi.fn().mockReturnThis(),
      unfilter: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      calculate: vi.fn().mockReturnThis(),
      options: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      raw: vi.fn().mockReturnThis(),
      withDead: vi.fn().mockReturnThis(),
      withoutValidatedRefs: vi.fn().mockReturnThis(),
    };

    mockBudget = {
      q: vi.fn().mockReturnValue(mockQuery),
      runQuery: vi.fn().mockResolvedValue({ data: { some: 'data' } }),
    };

    ({ router: mockRouter, handlers } = createMockRouter());
    ({ mockReq, mockRes, mockNext } = createMockReqRes(mockBudget));

    const runQueryModule = require('../../../src/v1/routes/run-query');
    runQueryModule(mockRouter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /budgets/:budgetSyncId/run-query', () => {
    it('should register the route', () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/run-query',
        expect.any(Function)
      );
    });

    it('should construct and run the query with multiple filters and flags', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      const queryParams = {
        table: 'transactions',
        filter: [
          { date: { $gte: '2021-01-01' } },
          { date: { $lte: '2021-12-31' } }
        ],
        select: ['*'],
        raw: true
      };
      mockReq.body = {
        ActualQLquery: queryParams
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.q).toHaveBeenCalledWith('transactions');
      const mockQuery = mockBudget.q.mock.results[0].value;
      expect(mockQuery.filter).toHaveBeenCalledTimes(2);
      expect(mockQuery.filter).toHaveBeenNthCalledWith(1, { date: { $gte: '2021-01-01' } });
      expect(mockQuery.filter).toHaveBeenNthCalledWith(2, { date: { $lte: '2021-12-31' } });
      expect(mockQuery.select).toHaveBeenCalledWith(['*']);
      expect(mockQuery.raw).toHaveBeenCalled();
      expect(mockBudget.runQuery).toHaveBeenCalledWith(mockQuery);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: { some: 'data' },
      });
    });

    it('should wrap a single filter object in an array', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      const queryParams = {
        table: 'transactions',
        filter: { date: { $gte: '2021-01-01' } },  // single object, not an array
      };
      mockReq.body = { ActualQLquery: queryParams };

      await handler(mockReq, mockRes, mockNext);

      const mockQuery = mockBudget.q.mock.results[0].value;
      expect(mockQuery.filter).toHaveBeenCalledTimes(1);
      expect(mockQuery.filter).toHaveBeenCalledWith({ date: { $gte: '2021-01-01' } });
    });

    it('should support withDead and withoutValidatedRefs flags', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      const queryParams = {
        table: 'transactions',
        withDead: true,
        withoutValidatedRefs: true
      };
      mockReq.body = {
        ActualQLquery: queryParams
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.q).toHaveBeenCalledWith('transactions');
      const mockQuery = mockBudget.q.mock.results[0].value;
      expect(mockQuery.withDead).toHaveBeenCalled();
      expect(mockQuery.withoutValidatedRefs).toHaveBeenCalled();
      expect(mockBudget.runQuery).toHaveBeenCalledWith(mockQuery);
    });

    it('should support calculate method', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      const queryParams = {
        table: 'transactions',
        calculate: { $sum: '$amount' }
      };
      mockReq.body = {
        ActualQLquery: queryParams
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.q).toHaveBeenCalledWith('transactions');
      const mockQuery = mockBudget.q.mock.results[0].value;
      expect(mockQuery.calculate).toHaveBeenCalledWith({ $sum: '$amount' });
      expect(mockBudget.runQuery).toHaveBeenCalledWith(mockQuery);
    });

    it('should support unfilter method', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      const queryParams = {
        table: 'transactions',
        unfilter: ['date']
      };
      mockReq.body = {
        ActualQLquery: queryParams
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.q).toHaveBeenCalledWith('transactions');
      const mockQuery = mockBudget.q.mock.results[0].value;
      expect(mockQuery.unfilter).toHaveBeenCalledWith(['date']);
      expect(mockBudget.runQuery).toHaveBeenCalledWith(mockQuery);
    });

    it('should throw error if ActualQLquery is missing', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      mockReq.body = {}; // Missing ActualQLquery

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('ActualQLquery is required in the request body');
    });

    it('should throw error if table is missing', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      mockReq.body = {
        ActualQLquery: { filter: {} } // Missing table
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('table is required in ActualQLquery');
    });

    it('should throw error if table is not in the allowed list', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      mockReq.body = { ActualQLquery: { table: 'kv_blobs' } };

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toMatch(/Invalid table/);
    });

    it('should handle errors from runQuery', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      mockReq.body = {
        ActualQLquery: { table: 'transactions' }
      };
      const error = new Error('Query failed');
      mockBudget.runQuery.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should return 501 when experimental operations are disabled', async () => {
      const configModule = require('../../../src/config/config');

      const handler = handlers['POST /budgets/:budgetSyncId/run-query'];
      const original = configModule.config.experimentalOperationsEnabled;
      configModule.config.experimentalOperationsEnabled = false;

      mockReq.body = { ActualQLquery: { table: 'transactions' } };
      await handler(mockReq, mockRes, mockNext);
      configModule.config.experimentalOperationsEnabled = original;

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

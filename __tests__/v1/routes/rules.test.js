const { createMockRouter, createMockReqRes } = require('../../helpers/route-test-helpers');

describe('Rules Routes', () => {
  let mockRouter;
  let mockBudget;
  let mockReq;
  let mockRes;
  let mockNext;
  let handlers;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockBudget = {
      getRules: vi.fn().mockResolvedValue([{ id: 'rule1', name: 'Auto-categorize', enabled: true }]),
      getRule: vi.fn().mockResolvedValue({ id: 'rule1', name: 'Auto-categorize', enabled: true }),
      createRule: vi.fn().mockResolvedValue({ id: 'new-rule', name: 'New Rule' }),
      updateRule: vi.fn().mockResolvedValue({ id: 'rule1', name: 'Updated Rule' }),
      deleteRule: vi.fn().mockResolvedValue(undefined),
    };

    ({ router: mockRouter, handlers } = createMockRouter());
    ({ mockReq, mockRes, mockNext } = createMockReqRes(mockBudget));

    const rulesModule = require('../../../src/v1/routes/rules');
    rulesModule(mockRouter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /budgets/:budgetSyncId/rules', () => {
    it('should register the route', () => {

      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/rules',
        expect.any(Function)
      );
    });

    it('should return list of rules', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/rules'];
      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getRules).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'rule1' }),
        ]),
      });
    });

    it('should support pagination', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/rules'];
      mockReq.query.page = '1';
      mockReq.query.limit = '10';

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getRules).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle errors from getRules', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/rules'];
      const error = new Error('Failed to fetch rules');
      mockBudget.getRules.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /budgets/:budgetSyncId/rules/:ruleId', () => {
    it('should register the route', () => {

      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/rules/:ruleId',
        expect.any(Function)
      );
    });

    it('should return specific rule', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/rules/:ruleId'];
      mockReq.params.ruleId = 'rule1';
      mockBudget.getRules.mockResolvedValueOnce([
        { id: 'rule1', name: 'Test Rule' },
        { id: 'rule2', name: 'Another Rule' },
      ]);

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getRules).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'rule1' }),
      });
    });

    it('should reject for nonexistent rule', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/rules/:ruleId'];
      mockReq.params.ruleId = 'nonexistent';
      mockBudget.getRules.mockResolvedValueOnce([
        { id: 'rule1', name: 'Test Rule' },
      ]);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should treat null getRules response as empty list', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/rules/:ruleId'];
      mockReq.params.ruleId = 'rule1';
      mockBudget.getRules.mockResolvedValueOnce(null);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('POST /budgets/:budgetSyncId/rules', () => {
    it('should register the route', () => {

      expect(mockRouter.post).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/rules',
        expect.any(Function)
      );
    });

    it('should create a rule', async () => {

      const handler = handlers['POST /budgets/:budgetSyncId/rules'];
      mockReq.body = {
        rule: {
          name: 'New Rule',
          conditions: [],
          actions: [],
        },
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.createRule).toHaveBeenCalledWith(mockReq.body.rule);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'new-rule' }),
      });
    });

    it('should reject without rule property', async () => {

      const handler = handlers['POST /budgets/:budgetSyncId/rules'];
      mockReq.body = {};
      const error = new Error('Rule information is required');
      mockBudget.createRule.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('PATCH /budgets/:budgetSyncId/rules/:ruleId', () => {
    it('should register the route', () => {

      expect(mockRouter.patch).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/rules/:ruleId',
        expect.any(Function)
      );
    });

    it('should update a rule', async () => {

      const handler = handlers['PATCH /budgets/:budgetSyncId/rules/:ruleId'];
      mockReq.params.ruleId = 'rule1';
      mockReq.body = {
        rule: {
          name: 'Updated Rule',
        },
      };

      mockBudget.updateRule.mockResolvedValueOnce({
        id: 'rule1',
        name: 'Updated Rule',
      });

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.updateRule).toHaveBeenCalledWith(mockReq.body.rule);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'rule1' }),
      });
    });

    it('should reject for nonexistent rule', async () => {

      const handler = handlers['PATCH /budgets/:budgetSyncId/rules/:ruleId'];
      mockReq.params.ruleId = 'nonexistent';
      mockReq.body = { rule: { name: 'Updated' } };
      const error = new Error('Rule not found');
      mockBudget.updateRule.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('DELETE /budgets/:budgetSyncId/rules/:ruleId', () => {
    it('should register the route', () => {

      expect(mockRouter.delete).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/rules/:ruleId',
        expect.any(Function)
      );
    });

    it('should delete a rule', async () => {

      const handler = handlers['DELETE /budgets/:budgetSyncId/rules/:ruleId'];
      mockReq.params.ruleId = 'rule1';

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.deleteRule).toHaveBeenCalledWith('rule1');
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Rule deleted',
      });
    });

    it('should handle errors from deleteRule', async () => {

      const handler = handlers['DELETE /budgets/:budgetSyncId/rules/:ruleId'];
      const error = new Error('failed');
      mockBudget.deleteRule.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

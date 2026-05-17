describe('Tags Routes', () => {
  let mockRouter;
  let mockBudget;
  let mockReq;
  let mockRes;
  let mockNext;
  let handlers;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    handlers = {};

    mockRouter = {
      get: jest.fn((path, handler) => {
        handlers[`GET ${path}`] = handler;
      }),
      post: jest.fn((path, handler) => {
        handlers[`POST ${path}`] = handler;
      }),
      patch: jest.fn((path, handler) => {
        handlers[`PATCH ${path}`] = handler;
      }),
      delete: jest.fn((path, handler) => {
        handlers[`DELETE ${path}`] = handler;
      }),
    };

    mockBudget = {
      getTags: jest.fn().mockResolvedValue([
        { id: 'tag1', tag: 'important', color: '#ff0000', description: 'Important tag' }
      ]),
      createTag: jest.fn().mockResolvedValue({
        id: 'new-tag',
        tag: 'newtag'
      }),
      updateTag: jest.fn().mockResolvedValue(undefined),
      deleteTag: jest.fn().mockResolvedValue(undefined),
    };

    mockReq = {
      params: {},
      body: {},
      query: {}
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      locals: {
        budget: mockBudget
      }
    };

    mockNext = jest.fn();

    const module = require('../../../src/v1/routes/tags');
    module(mockRouter);
  });

  describe('GET /budgets/:budgetSyncId/tags', () => {

    it('should register the route', () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/tags',
        expect.any(Function)
      );
    });

    it('should return list of tags', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/tags'];

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getTags).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'tag1' })
        ])
      });
    });

    it('should handle errors from getTags', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/tags'];
      const error = new Error('failed');
      mockBudget.getTags.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

  });

  describe('GET /budgets/:budgetSyncId/tags/:tagId', () => {

    it('should return specific tag', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/tags/:tagId'];

      mockReq.params.tagId = 'tag1';

      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'tag1' })
      });
    });

    it('should reject for nonexistent tag', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/tags/:tagId'];

      mockReq.params.tagId = 'missing';
      mockBudget.getTags.mockResolvedValueOnce([]);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should treat null getTags response as empty list', async () => {
      const handler = handlers['GET /budgets/:budgetSyncId/tags/:tagId'];

      mockReq.params.tagId = 'tag1';
      mockBudget.getTags.mockResolvedValueOnce(null);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

  });

  describe('POST /budgets/:budgetSyncId/tags', () => {

    it('should create a tag', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/tags'];

      mockReq.body = {
        tag: { tag: 'newtag' }
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.createTag).toHaveBeenCalledWith(mockReq.body.tag);

      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'new-tag' })
      });
    });

    it('should handle errors from createTag', async () => {
      const handler = handlers['POST /budgets/:budgetSyncId/tags'];
      const error = new Error('failed');
      mockBudget.createTag.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

  });

  describe('PATCH /budgets/:budgetSyncId/tags/:tagId', () => {

    it('should update a tag', async () => {
      const handler = handlers['PATCH /budgets/:budgetSyncId/tags/:tagId'];

      mockReq.params.tagId = 'tag1';
      mockReq.body = {
        tag: { tag: 'updated' }
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.updateTag).toHaveBeenCalledWith('tag1', mockReq.body.tag);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Tag updated'
      });
    });

    it('should handle errors from updateTag', async () => {
      const handler = handlers['PATCH /budgets/:budgetSyncId/tags/:tagId'];
      const error = new Error('failed');
      mockBudget.updateTag.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

  });

  describe('DELETE /budgets/:budgetSyncId/tags/:tagId', () => {

    it('should delete a tag', async () => {
      const handler = handlers['DELETE /budgets/:budgetSyncId/tags/:tagId'];

      mockReq.params.tagId = 'tag1';

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.deleteTag).toHaveBeenCalledWith('tag1');

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Tag deleted'
      });
    });

    it('should handle errors from deleteTag', async () => {
      const handler = handlers['DELETE /budgets/:budgetSyncId/tags/:tagId'];
      const error = new Error('failed');
      mockBudget.deleteTag.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

  });

});

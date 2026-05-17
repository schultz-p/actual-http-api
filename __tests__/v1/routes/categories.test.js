const { createMockRouter, createMockReqRes } = require('../../helpers/route-test-helpers');

describe('Categories Routes', () => {
  let mockRouter;
  let mockBudget;
  let mockReq;
  let mockRes;
  let mockNext;
  let handlers;

  beforeEach(() => {
    vi.resetModules();

    mockBudget = {
      getCategories: vi.fn().mockResolvedValue([
        { id: 'cat1', name: 'Groceries', group_id: 'grp1', is_income: false },
      ]),
      getCategory: vi.fn().mockResolvedValue({ id: 'cat1', name: 'Groceries', group_id: 'grp1', is_income: false }),
      createCategory: vi.fn().mockResolvedValue({ id: 'new-cat', name: 'New Category' }),
      updateCategory: vi.fn().mockResolvedValue({ id: 'cat1', name: 'Groceries Updated' }),
      deleteCategory: vi.fn().mockResolvedValue(undefined),
      getCategoryGroups: vi.fn().mockResolvedValue([
        { id: 'grp1', name: 'Regular Expenses', is_income: false },
      ]),
      getCategoryGroup: vi.fn().mockResolvedValue({ id: 'grp1', name: 'Regular Expenses', is_income: false }),
      createCategoryGroup: vi.fn().mockResolvedValue({ id: 'new-grp', name: 'New Group' }),
      updateCategoryGroup: vi.fn().mockResolvedValue({ id: 'grp1', name: 'Updated Group' }),
      deleteCategoryGroup: vi.fn().mockResolvedValue(undefined),
    };

    ({ router: mockRouter, handlers } = createMockRouter());
    ({ mockReq, mockRes, mockNext } = createMockReqRes(mockBudget));

    const categoriesModule = require('../../../src/v1/routes/categories');
    categoriesModule(mockRouter);
  });

  describe('GET /budgets/:budgetSyncId/categories', () => {
    it('should register the route', () => {

      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/categories',
        expect.any(Function)
      );
    });

    it('should return list of categories', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/categories'];
      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getCategories).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'cat1' }),
        ]),
      });
    });

    it('should handle errors from getCategories', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/categories'];
      const error = new Error('failed');
      mockBudget.getCategories.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /budgets/:budgetSyncId/categories/:categoryId', () => {
    it('should register the route', () => {

      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/categories/:categoryId',
        expect.any(Function)
      );
    });

    it('should return specific category', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/categories/:categoryId'];
      mockReq.params.categoryId = 'cat1';

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getCategory).toHaveBeenCalledWith('cat1');
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'cat1' }),
      });
    });

    it('should reject for nonexistent category', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/categories/:categoryId'];
      mockReq.params.categoryId = 'nonexistent';
      mockBudget.getCategory.mockResolvedValueOnce(null);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('POST /budgets/:budgetSyncId/categories', () => {
    it('should register the route', () => {

      expect(mockRouter.post).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/categories',
        expect.any(Function)
      );
    });

    it('should create a category', async () => {

      const handler = handlers['POST /budgets/:budgetSyncId/categories'];
      mockReq.body = {
        category: {
          name: 'New Category',
          group_id: 'grp1',
        },
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.createCategory).toHaveBeenCalledWith(mockReq.body.category);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'new-cat' }),
      });
    });

    it('should reject without category property', async () => {

      const handler = handlers['POST /budgets/:budgetSyncId/categories'];
      mockReq.body = {};

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('PATCH /budgets/:budgetSyncId/categories/:categoryId', () => {
    it('should register the route', () => {

      expect(mockRouter.patch).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/categories/:categoryId',
        expect.any(Function)
      );
    });

    it('should update a category', async () => {

      const handler = handlers['PATCH /budgets/:budgetSyncId/categories/:categoryId'];
      mockReq.params.categoryId = 'cat1';
      mockReq.body = {
        category: {
          name: 'Groceries Updated',
        },
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getCategory).toHaveBeenCalledWith('cat1');
      expect(mockBudget.updateCategory).toHaveBeenCalledWith('cat1', mockReq.body.category);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Category updated',
      });
    });

    it('should reject for nonexistent category', async () => {

      const handler = handlers['PATCH /budgets/:budgetSyncId/categories/:categoryId'];
      mockReq.params.categoryId = 'nonexistent';
      mockReq.body = { category: { name: 'Updated' } };
      mockBudget.getCategory.mockResolvedValueOnce(null);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('DELETE /budgets/:budgetSyncId/categories/:categoryId', () => {
    it('should register the route', () => {

      expect(mockRouter.delete).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/categories/:categoryId',
        expect.any(Function)
      );
    });

    it('should delete a category', async () => {

      const handler = handlers['DELETE /budgets/:budgetSyncId/categories/:categoryId'];
      mockReq.params.categoryId = 'cat1';

      mockBudget.getCategory.mockResolvedValueOnce({
        id: 'cat1',
        name: 'Groceries',
      });

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getCategory).toHaveBeenCalledWith('cat1');
      expect(mockBudget.deleteCategory).toHaveBeenCalledWith('cat1', { transferCategoryId: undefined });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Category deleted',
      });
    });

    it('should reject for nonexistent category', async () => {

      const handler = handlers['DELETE /budgets/:budgetSyncId/categories/:categoryId'];
      mockReq.params.categoryId = 'nonexistent';
      mockBudget.getCategory.mockResolvedValueOnce(null);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('GET /budgets/:budgetSyncId/categorygroups', () => {
    it('should register the route', () => {

      expect(mockRouter.get).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/categorygroups',
        expect.any(Function)
      );
    });

    it('should return list of category groups', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/categorygroups'];
      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.getCategoryGroups).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'grp1' }),
        ]),
      });
    });

    it('should handle errors from getCategoryGroups', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/categorygroups'];
      const error = new Error('failed');
      mockBudget.getCategoryGroups.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should treat null getCategoryGroups response as empty list', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/categorygroups'];
      mockBudget.getCategoryGroups.mockResolvedValueOnce(null);

      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ data: [] });
    });

    it('should transform nested categories within each group', async () => {

      const handler = handlers['GET /budgets/:budgetSyncId/categorygroups'];
      mockBudget.getCategoryGroups.mockResolvedValueOnce([{
        id: 'grp1',
        name: 'Expenses',
        is_income: 0,
        tombstone: 0,
        hidden: 0,
        categories: [{
          id: 'cat1',
          name: 'Groceries',
          is_income: 0,
          tombstone: 0,
          hidden: 0,
        }],
      }]);

      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'grp1',
            categories: expect.arrayContaining([
              expect.objectContaining({ id: 'cat1' }),
            ]),
          }),
        ]),
      });
    });
  });

  describe('POST /budgets/:budgetSyncId/categorygroups', () => {
    it('should register the route', () => {

      expect(mockRouter.post).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/categorygroups',
        expect.any(Function)
      );
    });

    it('should create a category group', async () => {

      const handler = handlers['POST /budgets/:budgetSyncId/categorygroups'];
      mockReq.body = {
        category_group: {
          name: 'New Group',
          is_income: false,
        },
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.createCategoryGroup).toHaveBeenCalledWith(mockReq.body.category_group);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'new-grp' }),
      });
    });

    it('should reject without category_group property', async () => {

      const handler = handlers['POST /budgets/:budgetSyncId/categorygroups'];
      mockReq.body = {};

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.createCategoryGroup).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle errors from createCategoryGroup', async () => {

      const handler = handlers['POST /budgets/:budgetSyncId/categorygroups'];
      mockReq.body = { category_group: { name: 'New Group' } };
      const error = new Error('failed');
      mockBudget.createCategoryGroup.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('PATCH /budgets/:budgetSyncId/categorygroups/:categoryGroupId', () => {
    it('should register the route', () => {

      expect(mockRouter.patch).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/categorygroups/:categoryGroupId',
        expect.any(Function)
      );
    });

    it('should update a category group', async () => {

      const handler = handlers['PATCH /budgets/:budgetSyncId/categorygroups/:categoryGroupId'];
      mockReq.params.categoryGroupId = 'grp1';
      mockReq.body = {
        category_group: {
          name: 'Updated Group',
        },
      };

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.updateCategoryGroup).toHaveBeenCalledWith('grp1', mockReq.body.category_group);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Category group updated',
      });
    });

    it('should handle errors from updateCategoryGroup', async () => {

      const handler = handlers['PATCH /budgets/:budgetSyncId/categorygroups/:categoryGroupId'];
      mockReq.body = { category_group: { name: 'Updated Group' } };
      const error = new Error('failed');
      mockBudget.updateCategoryGroup.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('DELETE /budgets/:budgetSyncId/categorygroups/:categoryGroupId', () => {
    it('should register the route', () => {

      expect(mockRouter.delete).toHaveBeenCalledWith(
        '/budgets/:budgetSyncId/categorygroups/:categoryGroupId',
        expect.any(Function)
      );
    });

    it('should delete a category group', async () => {

      const handler = handlers['DELETE /budgets/:budgetSyncId/categorygroups/:categoryGroupId'];
      mockReq.params.categoryGroupId = 'grp1';
      mockReq.query.transfer_category_id = 'cat-transfer';

      await handler(mockReq, mockRes, mockNext);

      expect(mockBudget.deleteCategoryGroup).toHaveBeenCalledWith('grp1', {
        transferCategoryId: 'cat-transfer',
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Category group deleted',
      });
    });

    it('should handle errors from deleteCategoryGroup', async () => {

      const handler = handlers['DELETE /budgets/:budgetSyncId/categorygroups/:categoryGroupId'];
      const error = new Error('failed');
      mockBudget.deleteCategoryGroup.mockRejectedValueOnce(error);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

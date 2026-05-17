// Ensure required secrets exist before any module that loads config at init time is required.
process.env.API_KEY = process.env.API_KEY || 'test-api-key';
process.env.ACTUAL_SERVER_PASSWORD = process.env.ACTUAL_SERVER_PASSWORD || 'test-password';

let Budget;

describe('Budget Module', () => {
  let mockActualApi;

  beforeEach(() => {
    vi.resetModules();
    // vi.resetModules() clears ViteNode's cache but not Node's native require.cache.
    // Clear native cache for local modules so they re-execute on next require().
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/src/')) delete require.cache[key];
    });

    mockActualApi = {
      loadBudget: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn().mockResolvedValue(undefined),
      downloadBudget: vi.fn().mockResolvedValue(undefined),
      getBudgetMonths: vi.fn().mockResolvedValue([]),
      getBudgetMonth: vi.fn().mockResolvedValue({
        categoryGroups: [
          {
            id: 'cg1',
            categories: [
              { id: 'cat1', budgeted: 1000, carryover: 0 },
              { id: 'cat2', budgeted: 500, carryover: 0 }
            ]
          }
        ]
      }),
      setBudgetAmount: vi.fn().mockResolvedValue(undefined),
      setBudgetCarryover: vi.fn().mockResolvedValue(undefined),
      getAccounts: vi.fn().mockResolvedValue([
        { id: 'acc1', name: 'Checking', balance: 5000 }
      ]),
      getAccountBalance: vi.fn().mockResolvedValue(5000),
      createAccount: vi.fn().mockResolvedValue({ id: 'acc2' }),
      updateAccount: vi.fn().mockResolvedValue({ id: 'acc1', name: 'Updated' }),
      deleteAccount: vi.fn().mockResolvedValue(undefined),
      closeAccount: vi.fn().mockResolvedValue(undefined),
      reopenAccount: vi.fn().mockResolvedValue(undefined),
      getTransactions: vi.fn().mockResolvedValue([
        { id: 'txn1', amount: 100, payee: 'Store' }
      ]),
      addTransactions: vi.fn().mockResolvedValue(['txn2']),
      importTransactions: vi.fn().mockResolvedValue(['txn3']),
      updateTransaction: vi.fn().mockResolvedValue({ id: 'txn1', amount: 150 }),
      deleteTransaction: vi.fn().mockResolvedValue(undefined),
      batchBudgetUpdates: vi.fn().mockImplementation(callback => callback()),
      getCategories: vi.fn().mockResolvedValue([
        { id: 'cat1', name: 'Groceries' }
      ]),
      createCategory: vi.fn().mockResolvedValue({ id: 'cat2' }),
      updateCategory: vi.fn().mockResolvedValue({ id: 'cat1', name: 'Food' }),
      deleteCategory: vi.fn().mockResolvedValue(undefined),
      getCategoryGroups: vi.fn().mockResolvedValue([
        { id: 'cg1', name: 'Essential' }
      ]),
      createCategoryGroup: vi.fn().mockResolvedValue({ id: 'cg2' }),
      updateCategoryGroup: vi.fn().mockResolvedValue({ id: 'cg1', name: 'Essentials' }),
      deleteCategoryGroup: vi.fn().mockResolvedValue(undefined),
      getPayees: vi.fn().mockResolvedValue([
        { id: 'payee1', name: 'Amazon' }
      ]),
      createPayee: vi.fn().mockResolvedValue({ id: 'payee2' }),
      updatePayee: vi.fn().mockResolvedValue({ id: 'payee1', name: 'Amazon Prime' }),
      deletePayee: vi.fn().mockResolvedValue(undefined),
      holdBudgetForNextMonth: vi.fn().mockResolvedValue(undefined),
      resetBudgetHold: vi.fn().mockResolvedValue(undefined),
      runBankSync: vi.fn().mockResolvedValue(undefined),
      getRules: vi.fn().mockResolvedValue([
        { id: 'rule1', description: 'Auto-categorize' }
      ]),
      getPayeeRules: vi.fn().mockResolvedValue([
        { id: 'rule1', payeeId: 'payee1' }
      ]),
      createRule: vi.fn().mockResolvedValue({ id: 'rule2' }),
      updateRule: vi.fn().mockResolvedValue({ id: 'rule1', description: 'Updated' }),
      deleteRule: vi.fn().mockResolvedValue(undefined),
      getSchedules: vi.fn().mockResolvedValue([
        { id: 'schedule1', name: 'Monthly Rent', amount: -150000 }
      ]),
      createSchedule: vi.fn().mockResolvedValue('schedule2'),
      updateSchedule: vi.fn().mockResolvedValue({ id: 'schedule1', name: 'Updated Rent' }),
      deleteSchedule: vi.fn().mockResolvedValue(undefined),
      getBudgets: vi.fn().mockResolvedValue([
        { id: 'budget1', groupId: 'sync1', name: 'Personal Budget' }
      ]),
      getTags: vi.fn().mockResolvedValue([
        { id: 'tag1', tag: 'important', color: '#ff0000', description: 'Important tag' }
      ]),
      createTag: vi.fn().mockResolvedValue({ id: 'tag2', tag: 'newtag' }),
      updateTag: vi.fn().mockResolvedValue({ id: 'tag1', tag: 'updated' }),
      deleteTag: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn(),
      q: vi.fn(() => ({
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis()
      })),
      runQuery: vi.fn(),
    };

    // Load provider and spy on it BEFORE loading budget.js so that budget.js's
    // destructured imports point to the spies.
    const provider = require('../../src/v1/actual-client-provider');
    vi.spyOn(provider, 'getActualApiClient').mockResolvedValue(mockActualApi);
    vi.spyOn(provider, 'getActualDataDir').mockReturnValue('/data/actual');

    // Load utils and spy on it.
    const utils = require('../../src/utils/utils');
    vi.spyOn(utils, 'currentLocalDate').mockReturnValue(new Date('2024-01-15'));
    vi.spyOn(utils, 'formatDateToISOString').mockReturnValue('2024-01-15');
    vi.spyOn(utils, 'listSubDirectories').mockReturnValue(['budget1']);
    vi.spyOn(utils, 'getFileContent').mockReturnValue(JSON.stringify({
      id: 'budget1',
      groupId: 'sync1',
      name: 'Personal Budget'
    }));

    // Load budget last so it picks up all the spied dependencies from ViteNode's cache.
    ({ Budget } = require('../../src/v1/budget'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Budget Initialization', () => {
    it('should download budget when syncId is not cached', async () => {
      const budget = await Budget('sync-new', undefined);
      expect(mockActualApi.downloadBudget).toHaveBeenCalledWith('sync-new');
    });

    it('should download budget with password when provided', async () => {
      const budget = await Budget('sync-pwd', 'password123');
      expect(mockActualApi.downloadBudget).toHaveBeenCalledWith('sync-pwd', {
        password: 'password123'
      });
    });
  });

  describe('Months Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get all budget months', async () => {
      mockActualApi.getBudgetMonths.mockResolvedValue(['2024-01', '2024-02']);
      const months = await budget.getMonths();
      expect(months).toEqual(['2024-01', '2024-02']);
    });

    it('should get a specific month', async () => {
      const month = await budget.getMonth('2024-01');
      expect(mockActualApi.getBudgetMonth).toHaveBeenCalledWith('2024-01');
      expect(month.categoryGroups).toBeDefined();
    });

    it('should get categories for a specific month', async () => {
      const categories = await budget.getMonthCategories('2024-01');
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0].id).toBe('cat1');
    });

    it('should get a specific category for a month', async () => {
      const category = await budget.getMonthCategory('2024-01', 'cat1');
      expect(category.id).toBe('cat1');
    });

    it('should get category groups for a month', async () => {
      const groups = await budget.getMonthCategoryGroups('2024-01');
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('cg1');
    });

    it('should get a specific category group for a month', async () => {
      const group = await budget.getMonthCategoryGroup('2024-01', 'cg1');
      expect(group.id).toBe('cg1');
    });
  });

  describe('Month Category Updates', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should update month category budgeted amount', async () => {
      await budget.updateMonthCategory('2024-01', 'cat1', { budgeted: 1500 });
      expect(mockActualApi.setBudgetAmount).toHaveBeenCalledWith('2024-01', 'cat1', 1500);
    });

    it('should update month category carryover', async () => {
      await budget.updateMonthCategory('2024-01', 'cat1', { carryover: true });
      expect(mockActualApi.setBudgetCarryover).toHaveBeenCalledWith('2024-01', 'cat1', true);
    });

    it('should update both budgeted and carryover', async () => {
      await budget.updateMonthCategory('2024-01', 'cat1', { budgeted: 1500, carryover: true });
      expect(mockActualApi.setBudgetAmount).toHaveBeenCalledWith('2024-01', 'cat1', 1500);
      expect(mockActualApi.setBudgetCarryover).toHaveBeenCalledWith('2024-01', 'cat1', true);
    });

    it('should throw error when neither budgeted nor carryover is provided', async () => {
      await expect(budget.updateMonthCategory('2024-01', 'cat1', {}))
        .rejects
        .toThrow('At least one field is required: budgeted or carryover');
    });
  });

  describe('Accounts Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get all accounts', async () => {
      const accounts = await budget.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe('acc1');
    });

    it('should get a specific account', async () => {
      const account = await budget.getAccount('acc1');
      expect(account.id).toBe('acc1');
    });

    it('should get account balance', async () => {
      const balance = await budget.getAccountBalance('acc1', '2024-01-15');
      expect(mockActualApi.getAccountBalance).toHaveBeenCalledWith('acc1', '2024-01-15');
      expect(balance).toBe(5000);
    });

    it('should create a new account', async () => {
      const newAccount = { name: 'Savings', type: 'savings' };
      const result = await budget.createAccount(newAccount);
      expect(mockActualApi.createAccount).toHaveBeenCalledWith(newAccount);
      expect(result.id).toBe('acc2');
    });

    it('should update an account', async () => {
      const updates = { name: 'Updated Checking' };
      const result = await budget.updateAccount('acc1', updates);
      expect(mockActualApi.updateAccount).toHaveBeenCalledWith('acc1', updates);
      expect(result.id).toBe('acc1');
    });

    it('should delete an account', async () => {
      await budget.deleteAccount('acc1');
      expect(mockActualApi.deleteAccount).toHaveBeenCalledWith('acc1');
    });

    it('should close an account with transfer', async () => {
      const transferOptions = { transferAccountId: 'acc2', transferCategoryId: 'cat1' };
      await budget.closeAccount('acc1', transferOptions);
      expect(mockActualApi.closeAccount).toHaveBeenCalledWith('acc1', 'acc2', 'cat1');
    });

    it('should reopen an account', async () => {
      await budget.reopenAccount('acc1');
      expect(mockActualApi.reopenAccount).toHaveBeenCalledWith('acc1');
    });
  });

  describe('Transactions Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get transactions for an account', async () => {
      const txns = await budget.getTransactions('acc1', '2024-01-01');
      expect(mockActualApi.getTransactions).toHaveBeenCalledWith('acc1', '2024-01-01', '2024-01-15');
      expect(txns).toHaveLength(1);
    });

    it('should get transactions with custom until date', async () => {
      await budget.getTransactions('acc1', '2024-01-01', '2024-01-31');
      expect(mockActualApi.getTransactions).toHaveBeenCalledWith('acc1', '2024-01-01', '2024-01-31');
    });

    it('should add a single transaction', async () => {
      const transaction = { amount: 100, payee: 'Store' };
      const result = await budget.addTransaction('acc1', transaction);
      expect(mockActualApi.addTransactions).toHaveBeenCalledWith('acc1', [transaction], {
        learnCategories: false,
        runTransfers: false
      });
      expect(result).toBe('txn2');
    });

    it('should add transaction with options', async () => {
      const transaction = { amount: 100, payee: 'Store' };
      await budget.addTransaction('acc1', transaction, { learnCategories: true, runTransfers: true });
      expect(mockActualApi.addTransactions).toHaveBeenCalledWith('acc1', [transaction], {
        learnCategories: true,
        runTransfers: true
      });
    });

    it('should add multiple transactions', async () => {
      const transactions = [
        { amount: 100, payee: 'Store1' },
        { amount: 200, payee: 'Store2' }
      ];
      const result = await budget.addTransactions('acc1', transactions);
      expect(mockActualApi.addTransactions).toHaveBeenCalledWith('acc1', transactions, {
        learnCategories: false,
        runTransfers: false
      });
    });

    it('should import transactions with default options', async () => {
      const transactions = [{ amount: 100 }];
      await budget.importTransactions('acc1', transactions);
      expect(mockActualApi.importTransactions).toHaveBeenCalledWith('acc1', transactions, {
        defaultCleared: true,
        dryRun: false,
        reimportDeleted: false,
      });
    });

    it('should import transactions with explicit options', async () => {
      const transactions = [{ amount: 100 }];
      const options = {
        defaultCleared: false,
        dryRun: true,
        reimportDeleted: true,
      };

      await budget.importTransactions('acc1', transactions, options);

      expect(mockActualApi.importTransactions).toHaveBeenCalledWith('acc1', transactions, options);
    });

    it('should update a transaction', async () => {
      const updates = { amount: 150, payee: 'Updated Store' };
      const result = await budget.updateTransaction('txn1', updates);
      expect(mockActualApi.updateTransaction).toHaveBeenCalledWith('txn1', {
        ...updates,
        id: 'txn1'
      });
    });

    it('should delete a transaction', async () => {
      await budget.deleteTransaction('txn1');
      expect(mockActualApi.deleteTransaction).toHaveBeenCalledWith('txn1');
    });

    it('should delete multiple transactions', async () => {
      const transactionIds = ['txn1', 'txn2', 'txn3'];
      await budget.deleteTransactions(transactionIds);
      expect(mockActualApi.batchBudgetUpdates).toHaveBeenCalled();
      expect(mockActualApi.deleteTransaction).toHaveBeenCalledTimes(3);
      expect(mockActualApi.deleteTransaction).toHaveBeenCalledWith('txn1');
      expect(mockActualApi.deleteTransaction).toHaveBeenCalledWith('txn2');
      expect(mockActualApi.deleteTransaction).toHaveBeenCalledWith('txn3');
    });

    it('should handle empty transaction array for deletion', async () => {
      await budget.deleteTransactions([]);
      expect(mockActualApi.batchBudgetUpdates).toHaveBeenCalled();
      expect(mockActualApi.deleteTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Categories Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get all categories', async () => {
      const categories = await budget.getCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].id).toBe('cat1');
    });

    it('should get a specific category', async () => {
      const category = await budget.getCategory('cat1');
      expect(category.id).toBe('cat1');
    });

    it('should create a new category', async () => {
      const newCategory = { name: 'Entertainment' };
      const result = await budget.createCategory(newCategory);
      expect(mockActualApi.createCategory).toHaveBeenCalledWith(newCategory);
      expect(result.id).toBe('cat2');
    });

    it('should update a category', async () => {
      const updates = { name: 'Food & Groceries' };
      const result = await budget.updateCategory('cat1', updates);
      expect(mockActualApi.updateCategory).toHaveBeenCalledWith('cat1', updates);
    });

    it('should delete a category', async () => {
      const transferOptions = { transferCategoryId: 'cat2' };
      await budget.deleteCategory('cat1', transferOptions);
      expect(mockActualApi.deleteCategory).toHaveBeenCalledWith('cat1', 'cat2');
    });
  });

  describe('Category Groups Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get all category groups', async () => {
      const groups = await budget.getCategoryGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('cg1');
    });

    it('should create a new category group', async () => {
      const newGroup = { name: 'Bills' };
      const result = await budget.createCategoryGroup(newGroup);
      expect(mockActualApi.createCategoryGroup).toHaveBeenCalledWith(newGroup);
      expect(result.id).toBe('cg2');
    });

    it('should update a category group', async () => {
      const updates = { name: 'Essential Bills' };
      const result = await budget.updateCategoryGroup('cg1', updates);
      expect(mockActualApi.updateCategoryGroup).toHaveBeenCalledWith('cg1', updates);
    });

    it('should delete a category group', async () => {
      const transferOptions = { transferCategoryId: 'cat1' };
      await budget.deleteCategoryGroup('cg1', transferOptions);
      expect(mockActualApi.deleteCategoryGroup).toHaveBeenCalledWith('cg1', 'cat1');
    });
  });

  describe('Payees Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get all payees', async () => {
      const payees = await budget.getPayees();
      expect(payees).toHaveLength(1);
      expect(payees[0].id).toBe('payee1');
    });

    it('should create a new payee', async () => {
      const newPayee = { name: 'Walmart' };
      const result = await budget.createPayee(newPayee);
      expect(mockActualApi.createPayee).toHaveBeenCalledWith(newPayee);
      expect(result.id).toBe('payee2');
    });

    it('should update a payee', async () => {
      const updates = { name: 'Amazon Prime Video' };
      const result = await budget.updatePayee('payee1', updates);
      expect(mockActualApi.updatePayee).toHaveBeenCalledWith('payee1', updates);
    });

    it('should delete a payee', async () => {
      await budget.deletePayee('payee1');
      expect(mockActualApi.deletePayee).toHaveBeenCalledWith('payee1');
    });

    it('should merge payees', async () => {
      mockActualApi.mergePayees = vi.fn().mockResolvedValue(undefined);
      await budget.mergePayees('payee1', ['payee2']);
      expect(mockActualApi.mergePayees).toHaveBeenCalledWith('payee1', ['payee2']);
    });
  });

  describe('Category Transfers', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should add category transfer with from category', async () => {
      await budget.addCategoryTransfer('2024-01', {
        fromCategoryId: 'cat1',
        amount: 100
      });
      expect(mockActualApi.setBudgetAmount).toHaveBeenCalled();
    });

    it('should add category transfer with to category', async () => {
      await budget.addCategoryTransfer('2024-01', {
        toCategoryId: 'cat1',
        amount: 100
      });
      expect(mockActualApi.setBudgetAmount).toHaveBeenCalled();
    });

    it('should add category transfer with both categories', async () => {
      await budget.addCategoryTransfer('2024-01', {
        fromCategoryId: 'cat1',
        toCategoryId: 'cat2',
        amount: 100
      });
      expect(mockActualApi.setBudgetAmount).toHaveBeenCalledTimes(2);
    });

    it('should throw error when no category id is provided', async () => {
      await expect(budget.addCategoryTransfer('2024-01', { amount: 100 }))
        .rejects
        .toThrow('At least one category id is required, either fromCategoryId or toCategoryId');
    });

    it('should throw error when amount is not provided', async () => {
      await expect(budget.addCategoryTransfer('2024-01', { fromCategoryId: 'cat1' }))
        .rejects
        .toThrow('Amount is required');
    });

    it('should throw error when source category not found', async () => {
      mockActualApi.getBudgetMonth.mockResolvedValueOnce({
        categoryGroups: [{ id: 'cg1', categories: [] }]
      });
      await expect(budget.addCategoryTransfer('2024-01', {
        fromCategoryId: 'nonexistent',
        amount: 100
      }))
        .rejects
        .toThrow('Source category not found: nonexistent');
    });

    it('should throw error when destination category not found', async () => {
      mockActualApi.getBudgetMonth.mockResolvedValueOnce({
        categoryGroups: [{ id: 'cg1', categories: [] }]
      });
      await expect(budget.addCategoryTransfer('2024-01', {
        toCategoryId: 'nonexistent',
        amount: 100
      }))
        .rejects
        .toThrow('Destination category not found: nonexistent');
    });
  });

  describe('Budget Hold Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should hold budget for next month', async () => {
      await budget.holdBudgetForNextMonth('2024-01', 500);
      expect(mockActualApi.holdBudgetForNextMonth).toHaveBeenCalledWith('2024-01', 500);
    });

    it('should reset budget hold', async () => {
      await budget.resetBudgetHold('2024-01');
      expect(mockActualApi.resetBudgetHold).toHaveBeenCalledWith('2024-01');
    });
  });

  describe('Bank Sync', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should run bank sync without account id', async () => {
      await budget.runBankSync();
      expect(mockActualApi.runBankSync).toHaveBeenCalledWith(undefined);
    });

    it('should run bank sync with account id', async () => {
      await budget.runBankSync('acc1');
      expect(mockActualApi.runBankSync).toHaveBeenCalledWith({ accountId: 'acc1' });
    });
  });

  describe('Rules Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get all rules', async () => {
      const rules = await budget.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('rule1');
    });

    it('should get payee rules', async () => {
      const rules = await budget.getPayeeRules('payee1');
      expect(mockActualApi.getPayeeRules).toHaveBeenCalledWith('payee1');
      expect(rules).toHaveLength(1);
    });

    it('should create a new rule', async () => {
      const newRule = { description: 'New Rule' };
      const result = await budget.createRule(newRule);
      expect(mockActualApi.createRule).toHaveBeenCalledWith(newRule);
      expect(result.id).toBe('rule2');
    });

    it('should update a rule', async () => {
      const updates = { id: 'rule1', description: 'Updated Rule' };
      const result = await budget.updateRule(updates);
      expect(mockActualApi.updateRule).toHaveBeenCalledWith(updates);
    });

    it('should delete a rule', async () => {
      await budget.deleteRule('rule1');
      expect(mockActualApi.deleteRule).toHaveBeenCalledWith('rule1');
    });
  });

  describe('Schedules Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get all schedules', async () => {
      const schedules = await budget.getSchedules();
      expect(mockActualApi.getSchedules).toHaveBeenCalled();
      expect(schedules).toHaveLength(1);
      expect(schedules[0].id).toBe('schedule1');
    });

    it('should get a specific schedule', async () => {
      const schedule = await budget.getSchedule('schedule1');
      expect(schedule.id).toBe('schedule1');
      expect(schedule.name).toBe('Monthly Rent');
    });

    it('should return undefined for non-existent schedule', async () => {
      const schedule = await budget.getSchedule('nonexistent');
      expect(schedule).toBeUndefined();
    });

    it('should create a new schedule', async () => {
      const newSchedule = {
        name: 'Weekly Groceries',
        amount: -50000,
        date: { frequency: 'weekly', start: '2024-01-01', endMode: 'never' }
      };
      const result = await budget.createSchedule(newSchedule);
      expect(mockActualApi.createSchedule).toHaveBeenCalledWith(newSchedule);
      expect(result).toBe('schedule2');
    });

    it('should update a schedule', async () => {
      const updates = { name: 'Updated Monthly Rent', amount: -160000 };
      const result = await budget.updateSchedule('schedule1', updates);
      expect(mockActualApi.updateSchedule).toHaveBeenCalledWith('schedule1', updates);
      expect(result.id).toBe('schedule1');
      expect(result.name).toBe('Updated Rent');
    });

    it('should delete a schedule', async () => {
      await budget.deleteSchedule('schedule1');
      expect(mockActualApi.deleteSchedule).toHaveBeenCalledWith('schedule1');
    });
  });

  describe('Budgets Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get all budgets', async () => {
      const budgets = await budget.getBudgets();
      expect(budgets).toHaveLength(1);
      expect(budgets[0].id).toBe('budget1');
    });
  });

  describe('Data Export', () => {
    let budget;
    let fileSpy;

    beforeEach(async () => {
      // Spy on the inherited file() method at the prototype level so calls on
      // any ZipArchive instance created by exportData() are tracked without
      // triggering real filesystem stat operations.
      const { ZipArchive } = require('archiver');
      fileSpy = vi.spyOn(ZipArchive.prototype, 'file').mockReturnThis();
      budget = await Budget('sync1', undefined);
    });

    afterEach(() => {
      fileSpy?.mockRestore();
    });

    it('should export budget data as zip', async () => {
      const result = await budget.exportData('sync1');
      expect(result.fileName).toContain('.zip');
      expect(result.fileStream).toBeDefined();
      expect(fileSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw error when budget not found for sync id', async () => {
      mockActualApi.getBudgets.mockResolvedValueOnce([]);
      await expect(budget.exportData('nonexistent'))
        .rejects
        .toThrow('Budget not found for budget sync id nonexistent');
    });

    it('should include correct files in archive', async () => {
      await budget.exportData('sync1');
      const calls = fileSpy.mock.calls;
      expect(calls[0][0]).toContain('db.sqlite');
      expect(calls[1][0]).toContain('metadata.json');
    });

    it('should generate correct zip filename with date and budget name', async () => {
      const result = await budget.exportData('sync1');
      expect(result.fileName).toMatch(/\d{4}-\d{2}-\d{2}-Personal Budget\.zip/);
    });
  });

  describe('Tags Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get all tags', async () => {
      const tags = await budget.getTags();
      expect(tags).toHaveLength(1);
      expect(tags[0].id).toBe('tag1');
    });

    it('should create a new tag', async () => {
      const newTag = { tag: 'newtag' };
      const result = await budget.createTag(newTag);

      expect(mockActualApi.createTag).toHaveBeenCalledWith(newTag);
      expect(result.id).toBe('tag2');
    });

    it('should update a tag', async () => {
      const updates = { tag: 'updated' };
      const result = await budget.updateTag('tag1', updates);

      expect(mockActualApi.updateTag).toHaveBeenCalledWith('tag1', updates);
      expect(result.id).toBe('tag1');
    });

    it('should delete a tag', async () => {
      await budget.deleteTag('tag1');

      expect(mockActualApi.deleteTag).toHaveBeenCalledWith('tag1');
    });
  });

  describe('Notes Management', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should get category notes', async () => {
      mockActualApi.runQuery.mockResolvedValueOnce({
        data: [{ note: 'Category note' }]
      });

      const result = await budget.getCategoryNotes('cat1');

      expect(mockActualApi.runQuery).toHaveBeenCalled();
      expect(result).toBe('Category note');
    });

    it('should get account notes', async () => {
      mockActualApi.runQuery.mockResolvedValueOnce({
        data: [{ note: 'Account note' }]
      });

      const result = await budget.getAccountNotes('acc1');

      expect(mockActualApi.runQuery).toHaveBeenCalled();
      expect(result).toBe('Account note');
    });

    it('should get budget month notes', async () => {
      mockActualApi.runQuery.mockResolvedValueOnce({
        data: [{ note: 'Month note' }]
      });

      const result = await budget.getBudgetMonthNotes('2024-01');

      expect(mockActualApi.runQuery).toHaveBeenCalled();
      expect(result).toBe('Month note');
    });

    it('should return undefined when note not found', async () => {
      mockActualApi.runQuery.mockResolvedValueOnce({
        data: []
      });

      const result = await budget.getCategoryNotes('cat1');

      expect(result).toBeUndefined();
    });
  });

  describe('Shutdown', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should shutdown the budget', async () => {
      await budget.shutdown();
      expect(mockActualApi.shutdown).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    let budget;

    beforeEach(async () => {
      budget = await Budget('sync1', undefined);
    });

    it('should propagate API errors', async () => {
      const error = new Error('API Error');
      mockActualApi.getAccounts.mockRejectedValueOnce(error);
      await expect(budget.getAccounts()).rejects.toThrow('API Error');
    });

    it('should handle missing transaction responses', async () => {
      mockActualApi.addTransactions.mockResolvedValueOnce(null);
      const result = await budget.addTransaction('acc1', { amount: 100 });
      expect(result).toBeNull();
    });

    it('should handle empty transaction array responses', async () => {
      mockActualApi.addTransactions.mockResolvedValueOnce([]);
      const result = await budget.addTransaction('acc1', { amount: 100 });
      expect(result).toEqual([]);
    });
  });
});

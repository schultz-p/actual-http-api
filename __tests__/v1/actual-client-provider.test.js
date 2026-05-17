// Ensure required secrets exist before importing modules that load config at module initialization
process.env.API_KEY = process.env.API_KEY || 'test-api-key';
process.env.ACTUAL_SERVER_PASSWORD = process.env.ACTUAL_SERVER_PASSWORD || 'test-password';
jest.mock('fs');
// Register the mock factory once at the top level. jest.resetModules() clears the module cache
// but preserves this factory, so each re-require after resetModules gets a fresh mock instance.
jest.mock('@actual-app/api', () => ({
  init: jest.fn(),
  shutdown: jest.fn(),
}));

let provider;

describe('Actual Client Provider', () => {
  let mockActualApi;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();

    // Mock the config (mutate after module load)
    const cfg = require('../../src/config/config').config;
    cfg.actual = {
      dataDir: '/test/data',
      serverUrl: 'http://localhost:5006',
      serverPassword: 'password',
    };

    // Obtain a fresh reference to the mocked @actual-app/api after resetModules so that
    // the instance we configure here is the same one the provider will receive via its
    // lazy require('@actual-app/api') call.
    mockActualApi = require('@actual-app/api');
    mockActualApi.init.mockResolvedValue(undefined);
    mockActualApi.shutdown.mockResolvedValue(undefined);

    // Clean up the module cache to reset singleton state and require provider after config is set
    delete require.cache[require.resolve('../../src/v1/actual-client-provider')];
    provider = require('../../src/v1/actual-client-provider');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clear any pending timers (e.g., the 1-hour timeout set by initializeActualApiClient)
    jest.clearAllTimers();
  });

  describe('getActualDataDir', () => {
    it('should create directory if it does not exist', () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(false);
      fs.mkdirSync = jest.fn();

      provider.getActualDataDir();

      expect(fs.existsSync).toHaveBeenCalledWith('/test/data');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/data', { recursive: true });
    });

    it('should return the configured data directory', () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(true);

      const result = provider.getActualDataDir();

      expect(result).toBe('/test/data');
    });
  });

  describe('getActualApiClient', () => {
    beforeEach(() => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(true);
    });

    it('should initialize API client on first call', async () => {
      const client = await provider.getActualApiClient();

      expect(client).toBeDefined();
    });

    it('should reuse client on subsequent calls within timeout', async () => {
      const client1 = await provider.getActualApiClient();
      const client2 = await provider.getActualApiClient();

      // Both calls should return same instance, and init should only be called once
      expect(client1).toBe(client2);
      expect(mockActualApi.init).toHaveBeenCalledTimes(1);
    });

    it('should configure API client with correct options', async () => {
      await provider.getActualApiClient();

      expect(mockActualApi.init).toHaveBeenCalledWith({
        dataDir: '/test/data',
        serverURL: 'http://localhost:5006',
        password: 'password',
      });
    });

    it('should shut down and clear the client after the TTL expires', async () => {
      await provider.getActualApiClient();
      expect(mockActualApi.shutdown).not.toHaveBeenCalled();

      // Advance past the 1-hour TTL
      await jest.advanceTimersByTimeAsync(60 * 60 * 1000);

      expect(mockActualApi.shutdown).toHaveBeenCalledTimes(1);
    });

    it('should re-initialize the client after TTL invalidation', async () => {
      await provider.getActualApiClient();
      await jest.advanceTimersByTimeAsync(60 * 60 * 1000);

      // Client should re-initialize on next call after invalidation
      await provider.getActualApiClient();
      expect(mockActualApi.init).toHaveBeenCalledTimes(2);
    });
  });
});

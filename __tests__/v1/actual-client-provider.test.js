// Ensure required secrets exist before importing modules that load config at module initialization
process.env.API_KEY = process.env.API_KEY || 'test-api-key';
process.env.ACTUAL_SERVER_PASSWORD = process.env.ACTUAL_SERVER_PASSWORD || 'test-password';

// Load the real @actual-app/api module so we can spy on its exports.
// The provider does a lazy require('@actual-app/api') — because CJS require.cache is shared
// within the same VM context, the module object we spy on here is the same one the provider
// receives. We mock only the methods we need (init, shutdown) so no real network calls happen.
const actualApiModule = require('@actual-app/api');

let provider;

describe('Actual Client Provider', () => {
  let mockActualApi;

  beforeEach(() => {
    vi.useFakeTimers();

    vi.spyOn(actualApiModule, 'init').mockResolvedValue(undefined);
    vi.spyOn(actualApiModule, 'shutdown').mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation();

    mockActualApi = actualApiModule;

    // Mock the config (mutate after module load)
    const cfg = require('../../src/config/config').config;
    cfg.actual = {
      dataDir: '/test/data',
      serverUrl: 'http://localhost:5006',
      serverPassword: 'password',
    };

    // Clean up the module cache to reset singleton state and require provider after config is set
    delete require.cache[require.resolve('../../src/v1/actual-client-provider')];
    provider = require('../../src/v1/actual-client-provider');
  });

  afterEach(async () => {
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    vi.clearAllTimers();
  });

  describe('getActualDataDir', () => {
    it('should create directory if it does not exist', () => {
      const fs = require('fs');
      fs.existsSync = vi.fn().mockReturnValue(false);
      fs.mkdirSync = vi.fn();

      provider.getActualDataDir();

      expect(fs.existsSync).toHaveBeenCalledWith('/test/data');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/data', { recursive: true });
    });

    it('should return the configured data directory', () => {
      const fs = require('fs');
      fs.existsSync = vi.fn().mockReturnValue(true);

      const result = provider.getActualDataDir();

      expect(result).toBe('/test/data');
    });
  });

  describe('getActualApiClient', () => {
    beforeEach(() => {
      const fs = require('fs');
      fs.existsSync = vi.fn().mockReturnValue(true);
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
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

      expect(mockActualApi.shutdown).toHaveBeenCalledTimes(1);
    });

    it('should re-initialize the client after TTL invalidation', async () => {
      await provider.getActualApiClient();
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

      // Client should re-initialize on next call after invalidation
      await provider.getActualApiClient();
      expect(mockActualApi.init).toHaveBeenCalledTimes(2);
    });
  });
});

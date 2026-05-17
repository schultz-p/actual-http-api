const fs = require('fs');
const { createConfig } = require('../../src/config/config');

describe('Configuration', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore env vars modified by individual tests
    Object.keys(process.env).forEach(k => { if (!(k in originalEnv)) delete process.env[k]; });
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  describe('loadMandatorySecret', () => {
    it('should load secret from environment variable', () => {
      process.env.API_KEY = 'test-key';
      process.env.ACTUAL_SERVER_PASSWORD = 'test-password';

      const cfg = createConfig();

      expect(cfg.apiKey).toBe('test-key');
      expect(cfg.actual.serverPassword).toBe('test-password');
    });

    it('should load secret from file path', () => {
      delete process.env.API_KEY;
      process.env.API_KEY_PATH = '/path/to/secret';
      process.env.ACTUAL_SERVER_PASSWORD = 'test-password';
      vi.spyOn(fs, 'readFileSync').mockReturnValue('secret-from-file\n');

      const cfg = createConfig();

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/secret', 'utf8');
      expect(cfg.apiKey).toBe('secret-from-file');
    });

    it('should prioritize direct environment variable over file path', () => {
      process.env.API_KEY = 'direct-secret';
      process.env.API_KEY_PATH = '/path/to/secret';
      process.env.ACTUAL_SERVER_PASSWORD = 'test-password';

      const cfg = createConfig();

      expect(cfg.apiKey).toBe('direct-secret');
    });

    it('should throw error if secret is not found', () => {
      delete process.env.API_KEY;
      delete process.env.API_KEY_PATH;
      process.env.ACTUAL_SERVER_PASSWORD = 'test-password';

      expect(() => createConfig()).toThrow('Missing required secret: API_KEY or API_KEY_PATH');
    });

    it('should throw error if file read fails', () => {
      delete process.env.API_KEY;
      process.env.API_KEY_PATH = '/invalid/path';
      process.env.ACTUAL_SERVER_PASSWORD = 'test-password';
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('ENOENT: no such file');
      });

      expect(() => createConfig()).toThrow('Failed to read secret file');
    });
  });

  describe('config object', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '5007';
      process.env.API_KEY = 'test-api-key';
      process.env.ACTUAL_DATA_DIR = '/data';
      process.env.ACTUAL_SERVER_URL = 'http://localhost:5006';
      process.env.ACTUAL_SERVER_PASSWORD = 'password';
    });

    it('should have nodeEnv property', () => {
      const cfg = createConfig();
      expect(cfg.nodeEnv).toBe('test');
    });

    it('should use default port if not specified', () => {
      delete process.env.PORT;
      const cfg = createConfig();
      expect(cfg.port).toBe(5007);
    });

    it('should use custom port if specified', () => {
      process.env.PORT = '3000';
      const cfg = createConfig();
      expect(cfg.port).toBe('3000');
    });

    it('should have actual configuration', () => {
      const cfg = createConfig();
      expect(cfg.actual).toBeDefined();
      expect(cfg.actual.dataDir).toBe('/data');
      expect(cfg.actual.serverUrl).toBe('http://localhost:5006');
      expect(cfg.actual.serverPassword).toBe('password');
    });
  });

  describe('experimentalOperationsEnabled', () => {
    beforeEach(() => {
      process.env.API_KEY = 'test-api-key';
      process.env.ACTUAL_SERVER_PASSWORD = 'password';
    });

    it('is enabled by default', () => {
      delete process.env.EXPERIMENTAL_OPERATIONS_ENABLED;
      process.env.NODE_ENV = 'production';
      const cfg = createConfig();
      expect(cfg.experimentalOperationsEnabled).toBe(true);
    });

    it('is disabled when set to false in production', () => {
      process.env.EXPERIMENTAL_OPERATIONS_ENABLED = 'false';
      process.env.NODE_ENV = 'production';
      const cfg = createConfig();
      expect(cfg.experimentalOperationsEnabled).toBe(false);
    });

    it('is disabled in test when the flag is set to false', () => {
      process.env.EXPERIMENTAL_OPERATIONS_ENABLED = 'false';
      process.env.NODE_ENV = 'test';
      const cfg = createConfig();
      expect(cfg.experimentalOperationsEnabled).toBe(false);
    });
  });
});

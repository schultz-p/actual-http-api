const { config } = require('../config/config');
const { createDirIfDoesNotExist } = require('../utils/utils');

const CLIENT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let actualApi;
let invalidationTimer;

function getActualDataDir() {
  createDirIfDoesNotExist(config.actual.dataDir);
  return config.actual.dataDir;
}

async function initializeActualApiClient() {
  actualApi = require('@actual-app/api');
  await actualApi.init({
      dataDir: getActualDataDir(),
      serverURL: config.actual.serverUrl,
      password: config.actual.serverPassword,
  });
  console.log('Actual api client initialized successfully');
  clearTimeout(invalidationTimer);
  invalidationTimer = setTimeout(invalidateActualApiClient, CLIENT_CACHE_TTL_MS);
}

async function invalidateActualApiClient() {
  if (actualApi) {
    await actualApi.shutdown();
    actualApi = null;
  }
  console.log('Actual api client was shut down successfully');
}

exports.getActualDataDir = () => getActualDataDir();

exports.getActualApiClient = async () => {
  if (!actualApi) {
    await initializeActualApiClient();
  }
  return actualApi;
}

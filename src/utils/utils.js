var fs = require('fs');

exports.createDirIfDoesNotExist = (dir) => {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }
}

exports.currentLocalDate = () => {
  return new Date(new Date().toLocaleString( 'sv', { timeZoneName: 'short' } ).split(' ')[0]);
}

exports.formatDateToISOString = (date) => {
  return date.toISOString().split('T')[0];
}

exports.isEmpty = (obj) => {
  if (!obj) {
    return true;
  }
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

exports.listSubDirectories = (directory) => {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
}

exports.getFileContent = (filePath) => {
  return fs.readFileSync(filePath, 'utf8');
}

exports.parseNumericBoolean = (numericBoolean) => {
  return numericBoolean === 0 ? false : (numericBoolean === 1 ? true : numericBoolean);
}

exports.paginate = (array, page, limit) => {
  if (limit < 1) {
    throw new Error(`Limit query parameter must be greater than 0`);
  }
  if (array.length === 0) {
    return [];
  }
  const numOfPages = Math.ceil(array.length / limit);
  if (page < 1 || page > numOfPages) {
    throw new Error(`Page query parameter must be between 1 and ${numOfPages}. Changing limit parameter can also change the number of pages.`);
  }
  const startIndex = (page - 1) * limit;
  return array.slice(startIndex, startIndex + limit);
}

exports.validateAccountExists = async (budget, accountId) => {
  const account = await budget.getAccount(accountId);
  if (!account) {
    throw new Error('Account not found');
  }
}

exports.validatePaginationParameters = (req) => {
  if (!req.query.limit) {
    throw new Error('limit query parameter is required when using pagination');
  }
  else if (!req.query.page) {
    throw new Error('page query parameter is required when using pagination');
  }
}
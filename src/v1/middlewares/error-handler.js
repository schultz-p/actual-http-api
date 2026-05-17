
function clientError(res, status, error, message) {
  console.log(message, error.message);
  res.status(status).json({"error": message});
}

function serverError(res, error, message) {
  console.error(message, error.message);
  res.status(500).json({"error": message});
}

const errorHandler = (err, req, res, _next) => {
  if (err.type == 'PostError'
    && (err.message.includes('Not Allowed')
      || err.message.includes('network-failure'))) {
    serverError(res, err, 'Error accessing Actual Server, check Actual Server url');
  } else if (err.message.includes('Could not get remote files')) {
    serverError(res, err, 'Error accessing Actual Server, check Actual Server password');
  } else if (err.message.includes('not found')
    || err.message.includes('No budget')
    || err.message.includes('Cannot destructure property')) {
    clientError(res, 404, err, 'Resource not found');
  } else if (err.message.includes('Invalid month')
    || err.message.includes('required')
    || err.message.includes('Bad date format')
    || err.message.includes('does not exist on table')
    || err.message.includes('convert to integer')
    || err.message.includes('must be')
  ) {
    clientError(res, 400, err, 'Invalid request parameters');
  } else {
    serverError(res, err, 'Unknown error while interacting with Actual Api. See server logs for more information');
  }
}

exports.errorHandler = errorHandler;

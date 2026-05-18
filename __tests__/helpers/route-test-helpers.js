function createMockRouter() {
  const handlers = {};
  const router = {};
  for (const method of ['get', 'post', 'patch', 'delete', 'put']) {
    router[method] = vi.fn((path, handler) => {
      handlers[`${method.toUpperCase()} ${path}`] = handler;
    });
  }
  return { router, handlers };
}

function createMockReqRes(budget) {
  return {
    mockReq: { params: {}, query: {}, body: {} },
    mockRes: {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      locals: { budget },
    },
    mockNext: vi.fn(),
  };
}

module.exports = { createMockRouter, createMockReqRes };

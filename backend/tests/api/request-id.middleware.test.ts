/**
 * Request ID Middleware Unit Tests
 *
 * Tests for the request ID middleware that adds unique identifiers to requests.
 *
 * Story: STORY-021B (API Middleware & Error Handling)
 */

import { RequestIdMiddleware, REQUEST_ID_HEADER } from '../../src/common/middleware/request-id.middleware';
import { Request, Response } from 'express';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should generate a new request ID when none is provided', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBeDefined();
      expect(mockRequest.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        REQUEST_ID_HEADER,
        mockRequest.requestId,
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should use existing request ID from header', () => {
      const existingId = 'existing-request-id-123';
      mockRequest.headers = {
        [REQUEST_ID_HEADER.toLowerCase()]: existingId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBe(existingId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        REQUEST_ID_HEADER,
        existingId,
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should set response header with request ID', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        REQUEST_ID_HEADER,
        expect.any(String),
      );
    });

    it('should call next function', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should generate unique IDs for different requests', () => {
      const request1: Partial<Request> = { headers: {} };
      const request2: Partial<Request> = { headers: {} };
      const response1: Partial<Response> = { setHeader: jest.fn() };
      const response2: Partial<Response> = { setHeader: jest.fn() };

      middleware.use(request1 as Request, response1 as Response, nextFunction);
      middleware.use(request2 as Request, response2 as Response, nextFunction);

      expect(request1.requestId).not.toBe(request2.requestId);
    });
  });

  describe('REQUEST_ID_HEADER constant', () => {
    it('should be X-Request-ID', () => {
      expect(REQUEST_ID_HEADER).toBe('X-Request-ID');
    });
  });
});

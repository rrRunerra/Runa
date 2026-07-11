import {
  CallHandler,
  ExecutionContext,
  Logger,
  HttpException,
} from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();

    // Mock ExecutionContext
    const mockRequest = {
      method: 'GET',
      url: '/test-url',
    };
    const mockResponse = {
      statusCode: 200,
    };
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    // Mock CallHandler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('test-response')),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('when NODE_ENV is development', () => {
    const originalEnv: string | undefined = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should log execution time for successful requests', (done: jest.DoneCallback) => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation();

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(loggerSpy).toHaveBeenCalled();
          expect(loggerSpy.mock.calls[0][0]).toContain(
            '[Debug] GET /test-url 200',
          );
          loggerSpy.mockRestore();
          done();
        },
      });
    });

    it('should log execution time and error for failed requests', (done: jest.DoneCallback) => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const mockError: Error = new Error('Test error');
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => mockError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err: unknown) => {
          expect(err).toBe(mockError);
          expect(loggerErrorSpy).toHaveBeenCalled();
          expect(loggerErrorSpy.mock.calls[0][0]).toContain(
            '[Debug] GET /test-url 500',
          );
          expect(loggerErrorSpy.mock.calls[0][0]).toContain(
            'Error: Test error',
          );
          loggerErrorSpy.mockRestore();
          done();
        },
      });
    });

    it('should log status code from HttpException', (done: jest.DoneCallback) => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const mockHttpError: HttpException = new HttpException('Forbidden', 403);
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => mockHttpError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err: unknown) => {
          expect(err).toBe(mockHttpError);
          expect(loggerErrorSpy).toHaveBeenCalled();
          expect(loggerErrorSpy.mock.calls[0][0]).toContain(
            '[Debug] GET /test-url 403',
          );
          expect(loggerErrorSpy.mock.calls[0][0]).toContain('Error: Forbidden');
          loggerErrorSpy.mockRestore();
          done();
        },
      });
    });
  });

  describe('when NODE_ENV is production', () => {
    const originalEnv: string | undefined = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should pass through without logging', (done: jest.DoneCallback) => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation();

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (val: unknown) => {
          expect(val).toBe('test-response');
          expect(loggerSpy).not.toHaveBeenCalled();
          loggerSpy.mockRestore();
          done();
        },
      });
    });
  });
});

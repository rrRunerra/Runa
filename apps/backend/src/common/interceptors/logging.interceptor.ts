import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: Logger = new Logger('API');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isDev: boolean = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
    if (!isDev) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const method: string = request.method;
    const url: string = request.url;
    const startTime: number = Date.now();

    return next.handle().pipe(
      tap({
        next: (): void => {
          const duration: number = Date.now() - startTime;
          const statusCode: number = response.statusCode;
          this.logger.log(`[Debug] ${method} ${url} ${statusCode} - ${duration}ms`);
        },
        error: (err: unknown): void => {
          const duration: number = Date.now() - startTime;
          let statusCode = 500;
          
          if (err instanceof HttpException) {
            statusCode = err.getStatus();
          } else if (err && typeof err === 'object') {
            if ('status' in err && typeof (err as { status: unknown }).status === 'number') {
              statusCode = (err as { status: number }).status;
            } else if ('statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number') {
              statusCode = (err as { statusCode: number }).statusCode;
            }
          }
          
          const errorMessage: string = err instanceof Error ? err.message : String(err);
          const logMsg = `[Debug] ${method} ${url} ${statusCode} - ${duration}ms - Error: ${errorMessage}`;
          if (statusCode >= 500) {
            this.logger.error(logMsg);
          } else {
            this.logger.warn(logMsg);
          }
        },
      }),
    );
  }
}

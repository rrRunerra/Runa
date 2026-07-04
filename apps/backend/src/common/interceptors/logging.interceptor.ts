import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API');
  private readonly devMode =
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.devMode) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const { method, originalUrl } = req;
    const start = Date.now();

    this.logger.log(`[Start] ${method} ${originalUrl}`);

    return next.handle().pipe(
      catchError((err: unknown) => {
        const status =
          err instanceof HttpException
            ? err.getStatus()
            : typeof err === 'object' &&
                err !== null &&
                'statusCode' in err &&
                typeof (err as { statusCode?: unknown }).statusCode === 'number'
              ? (err as { statusCode: number }).statusCode
              : 500;

        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[Error] ${method} ${originalUrl} ${status} - ${message}`,
        );

        return throwError(() => err);
      }),
      finalize(() => {
        const duration = Date.now() - start;
        this.logger.log(
          `[End] ${method} ${originalUrl} ${res.statusCode} - ${duration}ms`,
        );
      }),
    );
  }
}

import { HttpException, HttpStatus } from '@nestjs/common';

export interface rrErrorOptions {
  /** Human-readable error message */
  message?: string;
  /** HTTP status code */
  status?: HttpStatus;
  /** Optional description for additional context */
  description?: string;
  /** Original error cause */
  cause?: unknown;
}

export class rrError extends HttpException {
  public readonly rrCode: string;

  /**
   * @param rrCode - A 10-character error code identifying the error type.
   * @param options - Standard error fields (message, status, description, cause).
   */
  constructor(rrCode: string, options: rrErrorOptions = {}) {
    const status = options.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const body: Record<string, unknown> = {
      message: options.message ?? 'Internal Server Error',
      statusCode: status,
      rrCode,
    };
    if (options.description) body.description = options.description;
    if (options.cause) body.cause = options.cause;

    super(body, status);
    this.rrCode = rrCode;
  }
}

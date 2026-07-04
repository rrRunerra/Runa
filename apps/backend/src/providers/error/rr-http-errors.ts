import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

export interface rrHttpErrorOptions {
  message?: string;
  description?: string;
  cause?: unknown;
}

function buildBody(
  rrCode: string,
  status: HttpStatus,
  options: rrHttpErrorOptions = {},
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    message: options.message ?? defaultMessage(status),
    statusCode: status,
    rrCode,
  };
  if (options.description) body.description = options.description;
  return body;
}

function defaultMessage(status: HttpStatus): string {
  const map: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'Bad Request',
    [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
    [HttpStatus.FORBIDDEN]: 'Forbidden',
    [HttpStatus.NOT_FOUND]: 'Not Found',
    [HttpStatus.CONFLICT]: 'Conflict',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
    [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
    [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  };
  return map[status] ?? 'Error';
}

// ── 400 ──────────────────────────────────────────────

export class rrBadRequestException extends BadRequestException {
  public readonly rrCode: string;
  constructor(rrCode: string, options?: rrHttpErrorOptions) {
    const body = buildBody(rrCode, HttpStatus.BAD_REQUEST, options);
    super(body);
    this.rrCode = rrCode;
  }
}

// ── 401 ──────────────────────────────────────────────

export class rrUnauthorizedException extends UnauthorizedException {
  public readonly rrCode: string;
  constructor(rrCode: string, options?: rrHttpErrorOptions) {
    const body = buildBody(rrCode, HttpStatus.UNAUTHORIZED, options);
    super(body);
    this.rrCode = rrCode;
  }
}

// ── 403 ──────────────────────────────────────────────

export class rrForbiddenException extends ForbiddenException {
  public readonly rrCode: string;
  constructor(rrCode: string, options?: rrHttpErrorOptions) {
    const body = buildBody(rrCode, HttpStatus.FORBIDDEN, options);
    super(body);
    this.rrCode = rrCode;
  }
}

// ── 404 ──────────────────────────────────────────────

export class rrNotFoundException extends NotFoundException {
  public readonly rrCode: string;
  constructor(rrCode: string, options?: rrHttpErrorOptions) {
    const body = buildBody(rrCode, HttpStatus.NOT_FOUND, options);
    super(body);
    this.rrCode = rrCode;
  }
}

// ── 409 ──────────────────────────────────────────────

export class rrConflictException extends ConflictException {
  public readonly rrCode: string;
  constructor(rrCode: string, options?: rrHttpErrorOptions) {
    const body = buildBody(rrCode, HttpStatus.CONFLICT, options);
    super(body);
    this.rrCode = rrCode;
  }
}

// ── 422 ──────────────────────────────────────────────

export class rrUnprocessableEntityException extends UnprocessableEntityException {
  public readonly rrCode: string;
  constructor(rrCode: string, options?: rrHttpErrorOptions) {
    const body = buildBody(rrCode, HttpStatus.UNPROCESSABLE_ENTITY, options);
    super(body);
    this.rrCode = rrCode;
  }
}

// ── 429 (no built-in, use HttpException directly) ────

export class rrTooManyRequestsException extends HttpException {
  public readonly rrCode: string;
  constructor(rrCode: string, options?: rrHttpErrorOptions) {
    const body = buildBody(rrCode, HttpStatus.TOO_MANY_REQUESTS, options);
    super(body, HttpStatus.TOO_MANY_REQUESTS);
    this.rrCode = rrCode;
    this.name = 'TooManyRequestsException';
  }
}

// ── 500 ──────────────────────────────────────────────

export class rrInternalServerErrorException extends InternalServerErrorException {
  public readonly rrCode: string;
  constructor(rrCode: string, options?: rrHttpErrorOptions) {
    const body = buildBody(rrCode, HttpStatus.INTERNAL_SERVER_ERROR, options);
    super(body);
    this.rrCode = rrCode;
  }
}

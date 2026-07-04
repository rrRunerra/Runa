import { Injectable } from '@nestjs/common';
import { rrError, rrErrorOptions } from './rr-error';

@Injectable()
export class rrErrorService {
  /** Create and return an RrError instance without throwing. */
  create(rrCode: string, options?: rrErrorOptions): rrError {
    return new rrError(rrCode, options);
  }

  /** Create and throw an RrError immediately. Returns `never`. */
  throw(rrCode: string, options?: rrErrorOptions): never {
    throw new rrError(rrCode, options);
  }
}

import { Global, Module } from '@nestjs/common';
import { rrErrorService } from './rr-error.service';

@Global()
@Module({
  providers: [rrErrorService],
  exports: [rrErrorService],
})
export class rrErrorModule {}

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          const status = context.switchToHttp().getResponse<{ statusCode: number }>().statusCode;
          this.logger.log(`${method} ${url} ${status} ${ms}ms`);
        },
        error: () => {
          const ms = Date.now() - start;
          this.logger.warn(`${method} ${url} ERR ${ms}ms`);
        },
      }),
    );
  }
}

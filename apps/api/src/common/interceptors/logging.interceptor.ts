import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    return next.handle().pipe(tap(() => console.log(`Request completed in ${Date.now() - now}ms`)));
  }
}

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('API');

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;

        // Simple color coding using ANSI escape codes
        const getStatusColor = (duration: number) => {
          if (duration < 200) return '\x1b[32m'; // Green
          if (duration < 500) return '\x1b[33m'; // Yellow
          return '\x1b[31m'; // Red
        };

        const resetColor = '\x1b[0m';
        const methodColor = '\x1b[36m'; // Cyan
        const urlColor = '\x1b[34m'; // Blue
        const statusColor = getStatusColor(duration);

        this.logger.log(
          `${methodColor}${method}${resetColor} ${urlColor}${url}${resetColor} - ${statusColor}${duration}ms${resetColor}`,
        );
      }),
    );
  }
}

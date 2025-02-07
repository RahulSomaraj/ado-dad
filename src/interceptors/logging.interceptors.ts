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

    // ✅ Dynamically import chalk (fixes ESM issue)
    const chalk = (await import('chalk')).default;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const statusColor =
          duration < 200
            ? chalk.green
            : duration < 500
              ? chalk.yellow
              : chalk.red;

        this.logger.log(
          `${chalk.cyan.bold(method)} ${chalk.blue(url)} - ${statusColor(`${duration}ms`)}`,
        );
      }),
    );
  }
}

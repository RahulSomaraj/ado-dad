import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { toAckError } from '../chat-errors';

/**
 * Turns anything thrown before/inside a gateway handler (validation pipe,
 * guard, service) into an ack `{ success:false, code, error }` so the client's
 * emitWithAck always resolves instead of timing out.
 */
@Catch()
export class ChatWsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger('ChatWsException');

  catch(exception: unknown, host: ArgumentsHost) {
    const payload = toAckError(exception);
    if (payload.code === 'INTERNAL') {
      this.logger.error((exception as Error)?.stack ?? String(exception));
    }
    const args = host.getArgs();
    const ack = args.find((a, i) => i > 0 && typeof a === 'function');
    if (ack) {
      ack(payload);
    } else {
      host.switchToWs().getClient()?.emit?.('exception', payload);
    }
  }
}

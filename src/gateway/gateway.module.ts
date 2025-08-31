import { Module } from '@nestjs/common';
import { MyGateway } from './websocket.gateway';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  providers: [MyGateway],
  exports: [MyGateway],
})
export class GatewayModule {}

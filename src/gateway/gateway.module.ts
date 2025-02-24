import { Module } from '@nestjs/common';
import { MyGateway } from './websocket.gateway';

@Module({
  providers: [MyGateway],
})
export class GatewayModule {}

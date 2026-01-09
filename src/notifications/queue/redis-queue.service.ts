import { Injectable } from '@nestjs/common';
import { RedisService } from '../../shared/redis.service';

const QUEUE_KEY = 'notification_queue';

@Injectable()
export class RedisQueueService {
    constructor(private readonly redis: RedisService) { }

    async push(payload: any) {
        await this.redis.lPush(QUEUE_KEY, JSON.stringify(payload));
    }

    async pop(): Promise<any | null> {
        //const result = await this.redis.brPop(QUEUE_KEY, 0);
        const result = await this.redis.rPop(QUEUE_KEY);
        return result ? JSON.parse(result) : null;
    }
}

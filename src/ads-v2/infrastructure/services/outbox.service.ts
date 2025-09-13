import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export interface OutboxEvent {
  event: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
  error?: string;
}

@Injectable()
export class OutboxService {
  constructor(
    @InjectModel('Outbox') private readonly outbox: Model<OutboxEvent>,
  ) {}

  async enqueue(event: string, payload: any): Promise<OutboxEvent> {
    const outboxEvent = new this.outbox({
      event,
      payload,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
    });

    return outboxEvent.save();
  }

  async getPendingEvents(limit: number = 100): Promise<OutboxEvent[]> {
    return this.outbox
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  async markAsProcessing(id: string): Promise<void> {
    await this.outbox.findByIdAndUpdate(id, {
      status: 'processing',
      processedAt: new Date(),
    });
  }

  async markAsCompleted(id: string): Promise<void> {
    await this.outbox.findByIdAndUpdate(id, {
      status: 'completed',
      processedAt: new Date(),
    });
  }

  async markAsFailed(id: string, error: string): Promise<void> {
    await this.outbox.findByIdAndUpdate(id, {
      status: 'failed',
      error,
      processedAt: new Date(),
      $inc: { retryCount: 1 },
    });
  }

  async cleanup(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.outbox.deleteMany({
      status: { $in: ['completed', 'failed'] },
      processedAt: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }
}

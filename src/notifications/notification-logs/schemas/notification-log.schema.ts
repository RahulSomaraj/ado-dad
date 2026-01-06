import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

@Schema({ timestamps: true })
export class NotificationLog extends Document {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    body: string;

    @Prop({ required: true, enum: ['USER', 'USERS', 'ALL'] })
    targetType: 'USER' | 'USERS' | 'ALL';

    @Prop({ type: [String] })
    userIds?: string[];

    @Prop({ type: Object })
    data?: Record<string, any>;

    @Prop({ default: 'PENDING', enum: ['PENDING', 'SENT', 'FAILED'] })
    status: NotificationStatus;

    @Prop()
    error?: string;

    @Prop({ default: 0 })
    retryCount: number;
}

export const NotificationLogSchema =
    SchemaFactory.createForClass(NotificationLog);

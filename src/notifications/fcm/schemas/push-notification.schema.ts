import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'push_notifications' })
export class PushNotification extends Document {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    body: string;

    @Prop({ type: Object })
    data?: any;

    @Prop({ type: Object })
    response?: any;
}

export const PushNotificationSchema = SchemaFactory.createForClass(PushNotification);

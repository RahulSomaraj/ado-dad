import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PushNotification } from '../schemas/push-notification.schema';

@Injectable()
export class PushNotificationRepository {
    constructor(
        @InjectModel(PushNotification.name)
        private readonly notificationModel: Model<PushNotification>,
    ) { }

    async createLog(title: string, body: string, data: any, response: any): Promise<PushNotification> {
        return this.notificationModel.create({
            title,
            body,
            data,
            response,
        });
    }

    async findAll(page: number, limit: number, filters?: { _id?: string }): Promise<[PushNotification[], number]> {
        const skip = (page - 1) * limit;
        const query: any = {};

        if (filters?._id) {
            query._id = filters._id;
        }

        return Promise.all([
            this.notificationModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.notificationModel.countDocuments(query),
        ]);
    }
}

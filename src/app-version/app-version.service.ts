import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppVersion } from './schemas/app-version.schema';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';

@Injectable()
export class AppVersionService {
    constructor(
        @InjectModel(AppVersion.name) private appVersionModel: Model<AppVersion>,
    ) { }

    async updateVersion(updateDto: UpdateAppVersionDto) {
        const config = await this.appVersionModel.findOneAndUpdate(
            { configId: 1 },
            { $set: updateDto },
            { new: true, upsert: true },
        );

        return {
            success: true,
            message: 'App version configuration updated',
            data: config,
        };
    }

    async getVersion() {
        const config = await this.appVersionModel.findOne({ configId: 1 });

        if (!config) {
            throw new NotFoundException('App version configuration not found');
        }

        return {
            success: true,
            statusCode: 200,
            message: 'App version info',
            data: {
                versions: {
                    ios: config.iosLatestVersion,
                    android: config.androidLatestVersion,
                },
                forceUpdate: config.forceUpdate,
                storeUrls: {
                    ios: config.iosStoreUrl,
                    android: config.androidStoreUrl,
                },
            },
        };
    }
}

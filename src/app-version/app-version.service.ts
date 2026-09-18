import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppVersion } from './schemas/app-version.schema';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';

type Platform = 'ios' | 'android';

@Injectable()
export class AppVersionService {
    constructor(
        @InjectModel(AppVersion.name) private appVersionModel: Model<AppVersion>,
    ) { }

    async updateVersion(updateDto: UpdateAppVersionDto) {
        const hasBuildChange = [
            'iosLatestBuild',
            'androidLatestBuild',
            'iosMinSupportedBuild',
            'androidMinSupportedBuild',
        ].some((k) => updateDto[k] !== undefined);

        if (hasBuildChange) {
            // Validate against the merged result so a partial PATCH can't leave
            // minSupported above latest (that would force-update to a build
            // that isn't in the store).
            const current = await this.appVersionModel.findOne({ configId: 1 });
            const merged = { ...(current?.toObject?.() ?? current ?? {}), ...updateDto };
            for (const p of ['ios', 'android'] as Platform[]) {
                const latest = merged[`${p}LatestBuild`];
                const min = merged[`${p}MinSupportedBuild`];
                if (latest != null && min != null && min > latest) {
                    throw new BadRequestException(
                        `${p}MinSupportedBuild (${min}) cannot be greater than ${p}LatestBuild (${latest})`,
                    );
                }
            }
        }

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
                // Legacy fields: read by builds that compare version names.
                versions: {
                    ios: config.iosLatestVersion,
                    android: config.androidLatestVersion,
                },
                forceUpdate: config.forceUpdate,
                storeUrls: {
                    ios: config.iosStoreUrl,
                    android: config.androidStoreUrl,
                },
                // Build-number based policy (null when not configured yet;
                // the app then falls back to the legacy fields).
                builds: {
                    ios: {
                        latest: config.iosLatestBuild ?? null,
                        minSupported: config.iosMinSupportedBuild ?? null,
                    },
                    android: {
                        latest: config.androidLatestBuild ?? null,
                        minSupported: config.androidMinSupportedBuild ?? null,
                    },
                },
                releaseNotes: config.releaseNotes ?? null,
            },
        };
    }
}

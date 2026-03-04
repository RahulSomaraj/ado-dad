import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { AppVersionService } from './app-version.service';
import { AppVersion } from './schemas/app-version.schema';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';

describe('AppVersionService', () => {
    let service: AppVersionService;
    let model: Model<AppVersion>;

    const mockAppVersion = {
        configId: 1,
        iosLatestVersion: '1.2.0',
        androidLatestVersion: '1.2.0',
        iosStoreUrl: 'https://apps.apple.com/app/id123456',
        androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.daycationpass.app',
        forceUpdate: false,
    };

    const mockAppVersionModel = {
        findOneAndUpdate: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppVersionService,
                {
                    provide: getModelToken(AppVersion.name),
                    useValue: mockAppVersionModel,
                },
            ],
        }).compile();

        service = module.get<AppVersionService>(AppVersionService);
        model = module.get<Model<AppVersion>>(getModelToken(AppVersion.name));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('updateVersion', () => {
        it('should update the app version configuration', async () => {
            const updateDto: UpdateAppVersionDto = {
                iosLatestVersion: '1.2.1',
            };

            mockAppVersionModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ ...mockAppVersion, ...updateDto }),
            });
            // AppVersionService uses findOneAndUpdate(...). By checking service code, it doesnt call .exec()
            mockAppVersionModel.findOneAndUpdate.mockResolvedValue({ ...mockAppVersion, ...updateDto });

            const result = await service.updateVersion(updateDto);

            expect(model.findOneAndUpdate).toHaveBeenCalledWith(
                { configId: 1 },
                { $set: updateDto },
                { new: true, upsert: true },
            );
            expect(result.success).toBe(true);
            expect(result.data.iosLatestVersion).toBe('1.2.1');
        });

        it('should handle empty update DTO', async () => {
            const updateDto: UpdateAppVersionDto = {};
            mockAppVersionModel.findOneAndUpdate.mockResolvedValue(mockAppVersion);

            const result = await service.updateVersion(updateDto);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });
    });

    describe('getVersion', () => {
        it('should return app version information', async () => {
            mockAppVersionModel.findOne.mockResolvedValue(mockAppVersion);

            const result = await service.getVersion();

            expect(model.findOne).toHaveBeenCalledWith({ configId: 1 });
            expect(result.success).toBe(true);
            expect(result.data.versions.ios).toBe(mockAppVersion.iosLatestVersion);
            expect(result.data.storeUrls.android).toBe(mockAppVersion.androidStoreUrl);
        });

        it('should throw NotFoundException if configuration is not found', async () => {
            mockAppVersionModel.findOne.mockResolvedValue(null);

            await expect(service.getVersion()).rejects.toThrow(NotFoundException);
        });
    });
});

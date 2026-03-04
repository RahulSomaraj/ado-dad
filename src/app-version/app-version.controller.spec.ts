import { Test, TestingModule } from '@nestjs/testing';
import { AppVersionController } from './app-version.controller';
import { AppVersionService } from './app-version.service';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';
import { AuthGuard } from '../roles/auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { JwtService } from '@nestjs/jwt';

describe('AppVersionController', () => {
    let controller: AppVersionController;
    let service: AppVersionService;

    const mockAppVersionService = {
        updateVersion: jest.fn(),
        getVersion: jest.fn(),
    };

    const mockJwtService = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppVersionController],
            providers: [
                {
                    provide: AppVersionService,
                    useValue: mockAppVersionService,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
            ],
        })
            .overrideGuard(AuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AppVersionController>(AppVersionController);
        service = module.get<AppVersionService>(AppVersionService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('updateVersion', () => {
        it('should call service.updateVersion and return the result', async () => {
            const updateDto: UpdateAppVersionDto = { iosLatestVersion: '1.2.0' };
            const expectedResult = { success: true, message: 'Updated', data: {} };
            mockAppVersionService.updateVersion.mockResolvedValue(expectedResult);

            const result = await controller.updateVersion(updateDto);

            expect(service.updateVersion).toHaveBeenCalledWith(updateDto);
            expect(result).toBe(expectedResult);
        });
    });

    describe('getVersion', () => {
        it('should call service.getVersion and return the result', async () => {
            const expectedResult = { success: true, data: {} };
            mockAppVersionService.getVersion.mockResolvedValue(expectedResult);

            const result = await controller.getVersion();

            expect(service.getVersion).toHaveBeenCalled();
            expect(result).toBe(expectedResult);
        });
    });
});

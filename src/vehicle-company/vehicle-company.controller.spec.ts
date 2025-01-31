import { Test, TestingModule } from '@nestjs/testing';
import { VehicleCompanyController } from './vehicle-company.controller';

describe('VehicleCompanyController', () => {
  let controller: VehicleCompanyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleCompanyController],
    }).compile();

    controller = module.get<VehicleCompanyController>(VehicleCompanyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

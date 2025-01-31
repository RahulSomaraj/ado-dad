import { Test, TestingModule } from '@nestjs/testing';
import { VehicleCompanyService } from './vehicle-company.service';

describe('VehicleCompanyService', () => {
  let service: VehicleCompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VehicleCompanyService],
    }).compile();

    service = module.get<VehicleCompanyService>(VehicleCompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

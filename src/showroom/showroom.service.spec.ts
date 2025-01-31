import { Test, TestingModule } from '@nestjs/testing';
import { ShowroomService } from './showroom.service';

describe('ShowroomService', () => {
  let service: ShowroomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShowroomService],
    }).compile();

    service = module.get<ShowroomService>(ShowroomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

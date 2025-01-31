import { Test, TestingModule } from '@nestjs/testing';
import { ShowroomController } from './showroom.controller';

describe('ShowroomController', () => {
  let controller: ShowroomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShowroomController],
    }).compile();

    controller = module.get<ShowroomController>(ShowroomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

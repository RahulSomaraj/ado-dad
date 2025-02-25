import { Test, TestingModule } from '@nestjs/testing';
import { AdvertisementsController } from './advertisement.controller';

describe('AdvertisementController', () => {
  let controller: AdvertisementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvertisementsController],
    }).compile();

    controller = module.get<AdvertisementsController>(AdvertisementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

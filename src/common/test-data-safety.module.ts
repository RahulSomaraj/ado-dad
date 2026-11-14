import { Module } from '@nestjs/common';
import { TestDataSafetyService } from './services/test-data-safety.service';
import { SafeTestDataManagerService } from './services/safe-test-data-manager.service';

@Module({
  providers: [TestDataSafetyService, SafeTestDataManagerService],
  exports: [TestDataSafetyService, SafeTestDataManagerService],
})
export class TestDataSafetyModule {}

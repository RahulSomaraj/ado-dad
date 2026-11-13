import { Module, Global } from '@nestjs/common';
import { CsvUploadService } from './services/csv-upload.service';

@Global()
@Module({
  providers: [CsvUploadService],
  exports: [CsvUploadService],
})
export class CommonModule {}


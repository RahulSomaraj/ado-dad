import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';

/**
 * Decorator for CSV upload endpoints
 */
export function CsvUploadDecorator(summary: string, entityName: string) {
  return applyDecorators(
    UseInterceptors(FileInterceptor('file')),
    ApiOperation({ summary }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: `CSV file with ${entityName} data`,
          },
        },
      },
    }),
    ApiQuery({
      name: 'skipDuplicates',
      required: false,
      type: Boolean,
      description: 'Skip duplicate entries (default: true)',
    }),
  );
}


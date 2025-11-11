import { BadRequestException } from '@nestjs/common';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

export async function parseFile(buffer:Buffer,fileType: 'csv' )
{
    if(fileType !== 'csv'){
        throw new BadRequestException('Only CSV files are supported');
    }
    return parseCSV(buffer);
}

export async function parseCSV(buffer:Buffer) {
    return new Promise((resolve, reject) => {
    const results:any[] = [];
    Readable.from(buffer)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}
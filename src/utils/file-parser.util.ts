import { BadRequestException } from '@nestjs/common';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

const UTF8_BOM = [0xef, 0xbb, 0xbf];

const normalizeCsvBuffer = (buffer: Buffer): Buffer => {
  if (buffer.length >= 3 && buffer[0] === UTF8_BOM[0] && buffer[1] === UTF8_BOM[1] && buffer[2] === UTF8_BOM[2]) {
    return buffer.slice(3);
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    const text = buffer.slice(2).toString('utf16le').replace(/^\uFEFF/, '');
    return Buffer.from(text, 'utf8');
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const length = buffer.length - 2;
    const evenLength = length - (length % 2);
    const swapped = Buffer.alloc(evenLength);
    for (let i = 0; i < evenLength; i += 2) {
      swapped[i] = buffer[i + 3];
      swapped[i + 1] = buffer[i + 2];
    }
    const text = swapped.toString('utf16le').replace(/^\uFEFF/, '');
    return Buffer.from(text, 'utf8');
  }

  return buffer;
};

const detectDelimiter = (buffer: Buffer): string => {
  const sample = buffer.toString('utf8', 0, Math.min(buffer.length, 8192));
  const firstLine = sample.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const candidates = [',', ';', '\t', '|'];

  let bestDelimiter = ',';
  let bestCount = 0;

  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      bestDelimiter = candidate;
      bestCount = count;
    }
  }

  return bestDelimiter;
};

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
    const normalizedBuffer = normalizeCsvBuffer(buffer);
    const separator = detectDelimiter(normalizedBuffer);
    Readable.from(normalizedBuffer)
      .pipe(csv({ separator }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

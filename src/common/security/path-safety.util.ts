import { BadRequestException } from '@nestjs/common';
import { basename, resolve, sep } from 'path';

/** Return a safe single-segment filename or throw. Blocks traversal, separators, null bytes. */
export function safeFilename(name: unknown): string {
  if (typeof name !== 'string' || name.length === 0) {
    throw new BadRequestException('Invalid filename');
  }
  if (name.includes('\0')) throw new BadRequestException('Invalid filename');
  const base = basename(name);
  if (
    !base ||
    base === '.' ||
    base === '..' ||
    base.includes('/') ||
    base.includes('\\') ||
    !/^[A-Za-z0-9._-]+$/.test(base)
  ) {
    throw new BadRequestException('Invalid filename');
  }
  return base;
}

/** Resolve candidate under root and assert it does not escape root. */
export function resolveInside(root: string, candidate: string): string {
  const r = resolve(root);
  const full = resolve(r, candidate);
  if (full !== r && !full.startsWith(r + sep)) {
    throw new BadRequestException('Invalid path');
  }
  return full;
}

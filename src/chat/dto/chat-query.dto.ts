import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export const ROOM_FILTERS = ['all', 'unread', 'buying', 'selling', 'archived'] as const;
export type RoomFilter = (typeof ROOM_FILTERS)[number];

export class ListRoomsQueryDto {
  /** When omitted the legacy unpaginated list (capped) is returned. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  /** Opaque cursor returned as `nextCursor`. */
  @IsOptional()
  @IsString()
  @Length(1, 200)
  cursor?: string;

  @IsOptional()
  @IsIn(ROOM_FILTERS as unknown as string[])
  filter?: RoomFilter;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  q?: string;
}

export class MessagesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Older than this message id (scrolling back). */
  @IsOptional()
  @IsMongoId()
  cursor?: string;

  /** Newer than this message id (catch-up after reconnect). */
  @IsOptional()
  @IsMongoId()
  after?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  includeTotal?: string;
}

export class MarkReadDto {
  @IsOptional()
  @IsMongoId()
  lastMessageId?: string;
}

export class MarkReadSocketDto extends MarkReadDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

export const CHAT_UPLOAD_KINDS = ['image', 'audio'] as const;

export class CreateChatUploadDto {
  @IsIn(CHAT_UPLOAD_KINDS as unknown as string[])
  kind: 'image' | 'audio';

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  size: number;
}

import { IsOptional, IsInt, IsString, IsBoolean, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Validated body for GET-my-ads. Prevents Mongo operator objects reaching the query builder. */
export class GetMyAdsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsIn(['ASC', 'DESC']) sortOrder?: 'ASC' | 'DESC';
  @IsOptional() @IsBoolean() soldOut?: boolean;
  @IsOptional() @IsBoolean() showUnapproved?: boolean;
}
